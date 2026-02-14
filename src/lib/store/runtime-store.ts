import { create } from "zustand";

import type { ChunkCoord } from "@/lib/types/game";

interface RuntimeState {
  pointerLocked: boolean;
  position: [number, number];
  velocity: [number, number];
  yaw: number;
  pitch: number;
  distanceMeters: number;
  avgFps: number;
  fpsSamples: number;
  loadedChunkCount: number;
  currentChunk: ChunkCoord;
  setPointerLocked: (value: boolean) => void;
  setPosition: (position: [number, number]) => void;
  setVelocity: (velocity: [number, number]) => void;
  stepTo: (position: [number, number]) => void;
  setRotation: (yaw: number, pitch: number) => void;
  pushFps: (fps: number) => void;
  setChunkInfo: (currentChunk: ChunkCoord, loadedChunkCount: number) => void;
  resetRun: (spawn?: [number, number]) => void;
}

export const useRuntimeStore = create<RuntimeState>()((set, get) => ({
  pointerLocked: false,
  position: [1.25, 1.25],
  velocity: [0, 0],
  yaw: 0,
  pitch: 0,
  distanceMeters: 0,
  avgFps: 60,
  fpsSamples: 0,
  loadedChunkCount: 0,
  currentChunk: { x: 0, z: 0 },
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setPosition: (position) => set({ position }),
  setVelocity: (velocity) =>
    set((state) => {
      if (state.velocity[0] === velocity[0] && state.velocity[1] === velocity[1]) {
        return state;
      }
      return { velocity };
    }),
  stepTo: (position) =>
    set((state) => {
      const dx = position[0] - state.position[0];
      const dz = position[1] - state.position[1];
      if (dx * dx + dz * dz < 1e-12) {
        return state;
      }
      return {
        position,
        distanceMeters: state.distanceMeters + Math.sqrt(dx * dx + dz * dz),
      };
    }),
  setRotation: (yaw, pitch) => set({ yaw, pitch }),
  pushFps: (fps) => {
    const { avgFps, fpsSamples } = get();
    const nextSamples = Math.min(fpsSamples + 1, 4000);
    const nextAverage = (avgFps * fpsSamples + fps) / nextSamples;
    set({ avgFps: nextAverage, fpsSamples: nextSamples });
  },
  setChunkInfo: (currentChunk, loadedChunkCount) =>
    set((state) => {
      if (
        state.loadedChunkCount === loadedChunkCount &&
        state.currentChunk.x === currentChunk.x &&
        state.currentChunk.z === currentChunk.z
      ) {
        return state;
      }
      return { currentChunk, loadedChunkCount };
    }),
  resetRun: (spawn = [1.25, 1.25]) =>
    set({
      pointerLocked: false,
      position: spawn,
      velocity: [0, 0],
      yaw: 0,
      pitch: 0,
      distanceMeters: 0,
      avgFps: 60,
      fpsSamples: 0,
      loadedChunkCount: 0,
      currentChunk: { x: 0, z: 0 },
    }),
}));
