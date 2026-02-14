import type { ChunkCoord } from "@/lib/types/game";

export function chunkKey(coord: ChunkCoord): string {
  return `${coord.x},${coord.z}`;
}

export function parseChunkKey(key: string): ChunkCoord {
  const [x, z] = key.split(",").map(Number);
  return { x, z };
}

export function worldToChunkCoord(
  x: number,
  z: number,
  chunkSize: number,
  cellSize: number,
): ChunkCoord {
  const chunkSpan = chunkSize * cellSize;
  return {
    x: Math.floor(x / chunkSpan),
    z: Math.floor(z / chunkSpan),
  };
}

export function chunkDistance(a: ChunkCoord, b: ChunkCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
}
