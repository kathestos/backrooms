"use client";

import type { ChunkCoord } from "@/lib/types/game";

interface HudProps {
  seed: string;
  position: [number, number];
  currentChunk: ChunkCoord;
  loadedChunkCount: number;
  avgFps: number;
  distanceMeters: number;
  pointerLocked: boolean;
}

export default function Hud({
  seed,
  position,
  currentChunk,
  loadedChunkCount,
  avgFps,
  distanceMeters,
  pointerLocked,
}: HudProps) {
  return (
    <div className="hud">
      <div className="hud-grid">
        <span>seed</span>
        <span>{seed.slice(0, 12)}</span>
        <span>player</span>
        <span>
          {position[0].toFixed(1)}, {position[1].toFixed(1)}
        </span>
        <span>chunk</span>
        <span>
          {currentChunk.x}, {currentChunk.z}
        </span>
        <span>loaded</span>
        <span>{loadedChunkCount}</span>
        <span>avg fps</span>
        <span>{avgFps.toFixed(1)}</span>
        <span>distance</span>
        <span>{distanceMeters.toFixed(1)}m</span>
        <span>lock</span>
        <span>{pointerLocked ? "active" : "idle"}</span>
      </div>
    </div>
  );
}
