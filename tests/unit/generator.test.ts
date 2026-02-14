import { describe, expect, test } from "vitest";

import { generateChunk, isWallX } from "@/lib/world/generator";
import type { GenerationRequest } from "@/lib/types/game";

const request: GenerationRequest = {
  seed: "deadbeef00face55",
  coord: { x: 0, z: 0 },
  configVersion: 1,
  chunkSize: 24,
  cellSize: 2.5,
  wallThickness: 0.14,
  ceilingHeight: 3,
};

function hasWallAtCenter(walls: Float32Array, x: number, z: number): boolean {
  for (let i = 0; i < walls.length; i += 2) {
    if (Math.abs(walls[i] - x) < 0.0001 && Math.abs(walls[i + 1] - z) < 0.0001) {
      return true;
    }
  }
  return false;
}

describe("chunk generator", () => {
  test("is deterministic for same seed and coord", () => {
    const first = generateChunk(request);
    const second = generateChunk(request);

    expect(first.checksum).toBe(second.checksum);
    expect(Array.from(first.data.wallXCenters)).toEqual(Array.from(second.data.wallXCenters));
    expect(Array.from(first.data.wallZCenters)).toEqual(Array.from(second.data.wallZCenters));
    expect(Array.from(first.data.lightData)).toEqual(Array.from(second.data.lightData));
  });

  test("shared chunk border is seam-safe", () => {
    const left = generateChunk({ ...request, coord: { x: 0, z: 0 } });
    const right = generateChunk({ ...request, coord: { x: 1, z: 0 } });
    const edgeWorldX = request.chunkSize - 1;
    const wallCenterX = request.chunkSize * request.cellSize;

    for (let localZ = 0; localZ < request.chunkSize; localZ += 1) {
      const worldZ = localZ;
      const centerZ = (worldZ + 0.5) * request.cellSize;
      const expectedWall = isWallX(request.seed, edgeWorldX, worldZ);
      const inLeftChunk = hasWallAtCenter(left.data.wallXCenters, wallCenterX, centerZ);
      const inRightChunk = hasWallAtCenter(right.data.wallXCenters, wallCenterX, centerZ);

      expect(inLeftChunk).toBe(expectedWall);
      expect(inRightChunk).toBe(false);
    }
  });
});
