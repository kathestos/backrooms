"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GAME_CONFIG, MAX_CHUNK_CACHE } from "@/lib/config/game-config";
import type {
  ChunkCoord,
  ChunkRuntime,
  ChunkStreamSnapshot,
  CollisionBox,
  GenerationRequest,
  GenerationResponse,
  GameConfig,
} from "@/lib/types/game";
import { chunkDistance, chunkKey } from "@/lib/world/chunk-key";

function coordsAround(center: ChunkCoord, radius: number): ChunkCoord[] {
  const coords: ChunkCoord[] = [];
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      coords.push({ x: center.x + dx, z: center.z + dz });
    }
  }
  return coords;
}

function parseColliders(data: Float32Array): CollisionBox[] {
  const colliders: CollisionBox[] = [];
  for (let i = 0; i < data.length; i += 4) {
    colliders.push({
      x: data[i],
      z: data[i + 1],
      halfX: data[i + 2],
      halfZ: data[i + 3],
    });
  }
  return colliders;
}

const EMPTY_SNAPSHOT: ChunkStreamSnapshot = {
  activeChunks: [],
  nearbyColliders: [],
  loadedChunkCount: 0,
  currentChunk: { x: 0, z: 0 },
};

export function useChunkStream(
  seed: string,
  currentChunk: ChunkCoord,
  config: GameConfig = GAME_CONFIG,
): ChunkStreamSnapshot {
  const currentChunkX = currentChunk.x;
  const currentChunkZ = currentChunk.z;
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());
  const cacheRef = useRef<Map<string, ChunkRuntime>>(new Map());
  const seedRef = useRef(seed);
  const currentChunkRef = useRef(currentChunk);
  const [snapshot, setSnapshot] = useState<ChunkStreamSnapshot>(EMPTY_SNAPSHOT);

  const requestChunk = useCallback(
    (coord: ChunkCoord) => {
      const worker = workerRef.current;
      if (!worker) {
        return;
      }

      const key = chunkKey(coord);
      if (pendingRef.current.has(key) || cacheRef.current.has(key)) {
        return;
      }

      const request: GenerationRequest = {
        seed: seedRef.current,
        coord,
        configVersion: config.configVersion,
        chunkSize: config.chunkSize,
        cellSize: config.cellSize,
        wallThickness: config.wallThickness,
        ceilingHeight: config.ceilingHeight,
      };
      pendingRef.current.add(key);
      worker.postMessage(request);
    },
    [
      config.cellSize,
      config.ceilingHeight,
      config.chunkSize,
      config.configVersion,
      config.wallThickness,
    ],
  );

  const rebuildSnapshot = useCallback(
    (center: ChunkCoord) => {
      const cache = cacheRef.current;
      const active: ChunkRuntime[] = [];
      const nearbyColliders: CollisionBox[] = [];

      for (const coord of coordsAround(center, config.activeRadius)) {
        const key = chunkKey(coord);
        const chunk = cache.get(key);
        if (chunk) {
          chunk.lastTouched = Date.now();
          active.push(chunk);
        }
      }

      for (const coord of coordsAround(center, 1)) {
        const key = chunkKey(coord);
        const chunk = cache.get(key);
        if (chunk) {
          nearbyColliders.push(...chunk.colliders);
        }
      }

      setSnapshot({
        activeChunks: active,
        nearbyColliders,
        loadedChunkCount: cache.size,
        currentChunk: center,
      });
    },
    [config.activeRadius],
  );

  const syncAroundChunk = useCallback(
    (center: ChunkCoord) => {
      const cache = cacheRef.current;
      const now = Date.now();
      const cacheCoords = coordsAround(center, config.cacheRadius);

      for (const coord of cacheCoords) {
        const key = chunkKey(coord);
        const chunk = cache.get(key);
        if (chunk) {
          chunk.lastTouched = now;
        } else {
          requestChunk(coord);
        }
      }

      for (const [key, value] of cache.entries()) {
        if (chunkDistance(center, value.coord) > config.cacheRadius + 1) {
          cache.delete(key);
        }
      }

      if (cache.size > MAX_CHUNK_CACHE) {
        const oldest = [...cache.values()]
          .sort((a, b) => a.lastTouched - b.lastTouched)
          .slice(0, cache.size - MAX_CHUNK_CACHE);
        for (const stale of oldest) {
          cache.delete(stale.key);
        }
      }

      rebuildSnapshot(center);
    },
    [config.cacheRadius, rebuildSnapshot, requestChunk],
  );

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/world.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      const response = event.data;
      const responseKey = chunkKey(response.coord);
      pendingRef.current.delete(responseKey);

      if (response.seed !== seedRef.current) {
        return;
      }

      const runtimeChunk: ChunkRuntime = {
        ...response.data,
        key: responseKey,
        checksum: response.checksum,
        generatedAt: response.generatedAt,
        lastTouched: Date.now(),
        colliders: parseColliders(response.data.colliderData),
      };
      cacheRef.current.set(responseKey, runtimeChunk);
      syncAroundChunk(currentChunkRef.current);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [syncAroundChunk]);

  useEffect(() => {
    seedRef.current = seed;
    pendingRef.current.clear();
    cacheRef.current.clear();
    syncAroundChunk(currentChunkRef.current);
  }, [seed, syncAroundChunk]);

  useEffect(() => {
    const nextChunk = { x: currentChunkX, z: currentChunkZ };
    currentChunkRef.current = nextChunk;
    syncAroundChunk(nextChunk);
  }, [currentChunkX, currentChunkZ, syncAroundChunk]);

  return useMemo(() => snapshot, [snapshot]);
}
