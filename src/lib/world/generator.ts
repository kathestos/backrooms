import type {
  ChunkCoord,
  GenerationRequest,
  GenerationResponse,
} from "@/lib/types/game";
import { hashUnit } from "@/lib/world/hash";

const ROOM_WIDTH = 8;
const ROOM_HEIGHT = 8;
const MAJOR_DOOR_WIDTH = 2;
const INTERIOR_DOOR_WIDTH = 2;
const INTERIOR_WALL_CHANCE = 0.74;
const LIGHT_PATCH_SIZE = 5;
const LIGHT_PATCH_CHANCE = 0.65;
const TABLE_CHANCE = 0.018;
const TABLE_JITTER = 0.32;
const OFFICE_LAMP_CHANCE = 0.007;
const OFFICE_LAMP_JITTER = 0.34;

const CHAIR_SIDES = [
  { x: 0, z: -0.78, yaw: Math.PI },
  { x: 0, z: 0.78, yaw: 0 },
  { x: -0.92, z: 0, yaw: Math.PI / 2 },
  { x: 0.92, z: 0, yaw: -Math.PI / 2 },
];

function positiveMod(value: number, mod: number): number {
  return ((value % mod) + mod) % mod;
}

function inRange(value: number, start: number, width: number): boolean {
  return value >= start && value < start + width;
}

function pickDoorStart(
  seed: string,
  a: number,
  b: number,
  channel: number,
  segmentSize: number,
  doorWidth: number,
  margin: number,
): number {
  const slots = Math.max(1, segmentSize - doorWidth - margin * 2 + 1);
  return margin + Math.floor(hashUnit(seed, a, b, channel) * slots);
}

function majorWallX(seed: string, worldX: number, worldZ: number): boolean | null {
  const boundaryX = worldX + 1;
  const localBoundaryX = positiveMod(boundaryX, ROOM_WIDTH);
  if (localBoundaryX !== 0) {
    return null;
  }

  const lineX = Math.floor(boundaryX / ROOM_WIDTH);
  const bandZ = Math.floor(worldZ / ROOM_HEIGHT);
  const localZ = positiveMod(worldZ, ROOM_HEIGHT);

  const doorA = pickDoorStart(
    seed,
    lineX,
    bandZ,
    101,
    ROOM_HEIGHT,
    MAJOR_DOOR_WIDTH,
    1,
  );
  const hasExtraDoor = hashUnit(seed, lineX, bandZ, 102) < 0.22;
  const doorB = pickDoorStart(
    seed,
    lineX,
    bandZ,
    103,
    ROOM_HEIGHT,
    MAJOR_DOOR_WIDTH,
    1,
  );

  const open = inRange(localZ, doorA, MAJOR_DOOR_WIDTH) ||
    (hasExtraDoor && inRange(localZ, doorB, MAJOR_DOOR_WIDTH));
  return !open;
}

function majorWallZ(seed: string, worldX: number, worldZ: number): boolean | null {
  const boundaryZ = worldZ + 1;
  const localBoundaryZ = positiveMod(boundaryZ, ROOM_HEIGHT);
  if (localBoundaryZ !== 0) {
    return null;
  }

  const lineZ = Math.floor(boundaryZ / ROOM_HEIGHT);
  const bandX = Math.floor(worldX / ROOM_WIDTH);
  const localX = positiveMod(worldX, ROOM_WIDTH);

  const doorA = pickDoorStart(
    seed,
    bandX,
    lineZ,
    111,
    ROOM_WIDTH,
    MAJOR_DOOR_WIDTH,
    1,
  );
  const hasExtraDoor = hashUnit(seed, bandX, lineZ, 112) < 0.22;
  const doorB = pickDoorStart(
    seed,
    bandX,
    lineZ,
    113,
    ROOM_WIDTH,
    MAJOR_DOOR_WIDTH,
    1,
  );

  const open = inRange(localX, doorA, MAJOR_DOOR_WIDTH) ||
    (hasExtraDoor && inRange(localX, doorB, MAJOR_DOOR_WIDTH));
  return !open;
}

function interiorVerticalWall(seed: string, worldX: number, worldZ: number): boolean {
  const boundaryX = worldX + 1;
  const localBoundaryX = positiveMod(boundaryX, ROOM_WIDTH);
  if (localBoundaryX === 0 || localBoundaryX === 1 || localBoundaryX === ROOM_WIDTH - 1) {
    return false;
  }

  const roomX = Math.floor(worldX / ROOM_WIDTH);
  const roomZ = Math.floor(worldZ / ROOM_HEIGHT);
  const localZ = positiveMod(worldZ, ROOM_HEIGHT);

  if (hashUnit(seed, roomX, roomZ, 200) > INTERIOR_WALL_CHANCE) {
    return false;
  }

  const style = hashUnit(seed, roomX, roomZ, 201);
  const verticalEnabled = style < 0.46 || style >= 0.86;
  if (!verticalEnabled) {
    return false;
  }

  const wallOffset = 2 + Math.floor(hashUnit(seed, roomX, roomZ, 202) * (ROOM_WIDTH - 3));
  if (localBoundaryX !== wallOffset) {
    return false;
  }

  const doorA = pickDoorStart(
    seed,
    roomX,
    roomZ,
    203,
    ROOM_HEIGHT,
    INTERIOR_DOOR_WIDTH,
    1,
  );
  const hasExtraDoor = style >= 0.86;
  const doorB = pickDoorStart(
    seed,
    roomX,
    roomZ,
    204,
    ROOM_HEIGHT,
    INTERIOR_DOOR_WIDTH,
    1,
  );

  const open = inRange(localZ, doorA, INTERIOR_DOOR_WIDTH) ||
    (hasExtraDoor && inRange(localZ, doorB, INTERIOR_DOOR_WIDTH));
  return !open;
}

function interiorHorizontalWall(seed: string, worldX: number, worldZ: number): boolean {
  const boundaryZ = worldZ + 1;
  const localBoundaryZ = positiveMod(boundaryZ, ROOM_HEIGHT);
  if (localBoundaryZ === 0 || localBoundaryZ === 1 || localBoundaryZ === ROOM_HEIGHT - 1) {
    return false;
  }

  const roomX = Math.floor(worldX / ROOM_WIDTH);
  const roomZ = Math.floor(worldZ / ROOM_HEIGHT);
  const localX = positiveMod(worldX, ROOM_WIDTH);

  if (hashUnit(seed, roomX, roomZ, 210) > INTERIOR_WALL_CHANCE) {
    return false;
  }

  const style = hashUnit(seed, roomX, roomZ, 211);
  const horizontalEnabled = style >= 0.42;
  if (!horizontalEnabled) {
    return false;
  }

  const wallOffset = 2 + Math.floor(hashUnit(seed, roomX, roomZ, 212) * (ROOM_HEIGHT - 3));
  if (localBoundaryZ !== wallOffset) {
    return false;
  }

  const doorA = pickDoorStart(
    seed,
    roomX,
    roomZ,
    213,
    ROOM_WIDTH,
    INTERIOR_DOOR_WIDTH,
    1,
  );
  const hasExtraDoor = style >= 0.86;
  const doorB = pickDoorStart(
    seed,
    roomX,
    roomZ,
    214,
    ROOM_WIDTH,
    INTERIOR_DOOR_WIDTH,
    1,
  );

  const open = inRange(localX, doorA, INTERIOR_DOOR_WIDTH) ||
    (hasExtraDoor && inRange(localX, doorB, INTERIOR_DOOR_WIDTH));
  return !open;
}

export function isWallX(seed: string, worldX: number, worldZ: number): boolean {
  const major = majorWallX(seed, worldX, worldZ);
  if (major !== null) {
    return major;
  }
  return interiorVerticalWall(seed, worldX, worldZ);
}

export function isWallZ(seed: string, worldX: number, worldZ: number): boolean {
  const major = majorWallZ(seed, worldX, worldZ);
  if (major !== null) {
    return major;
  }
  return interiorHorizontalWall(seed, worldX, worldZ);
}

export function shouldPlaceLight(seed: string, worldX: number, worldZ: number): boolean {
  const isGridCell =
    positiveMod(worldX, LIGHT_PATCH_SIZE) === 0 &&
    positiveMod(worldZ, LIGHT_PATCH_SIZE) === 0;
  if (isGridCell) {
    return hashUnit(seed, worldX, worldZ, 31) < LIGHT_PATCH_CHANCE;
  }
  return hashUnit(seed, worldX, worldZ, 37) < 0.015;
}

function hasPerimeterWall(seed: string, worldX: number, worldZ: number): boolean {
  const north = isWallZ(seed, worldX, worldZ - 1);
  const south = isWallZ(seed, worldX, worldZ);
  const west = isWallX(seed, worldX - 1, worldZ);
  const east = isWallX(seed, worldX, worldZ);
  return north || south || west || east;
}

function isFurnitureCellOpen(seed: string, worldX: number, worldZ: number): boolean {
  if (hasPerimeterWall(seed, worldX, worldZ)) {
    return false;
  }

  const xBlocked = hasPerimeterWall(seed, worldX - 1, worldZ) && hasPerimeterWall(seed, worldX + 1, worldZ);
  const zBlocked = hasPerimeterWall(seed, worldX, worldZ - 1) && hasPerimeterWall(seed, worldX, worldZ + 1);
  return !xBlocked && !zBlocked;
}

function shouldPlaceTable(seed: string, worldX: number, worldZ: number): boolean {
  return hashUnit(seed, worldX, worldZ, 300) < TABLE_CHANCE;
}

function shouldPlaceOfficeLamp(seed: string, worldX: number, worldZ: number): boolean {
  return hashUnit(seed, worldX, worldZ, 340) < OFFICE_LAMP_CHANCE;
}

function toChecksum(seed: string, coord: ChunkCoord, parts: Float32Array[]): string {
  let rolling = 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += Math.max(1, Math.floor(part.length / 32))) {
      rolling = (rolling * 131 + Math.floor(part[i] * 1000)) >>> 0;
    }
    rolling = (rolling * 257 + part.length) >>> 0;
  }
  return `${seed.slice(0, 6)}:${coord.x}:${coord.z}:${rolling.toString(16)}`;
}

export function generateChunk(request: GenerationRequest): GenerationResponse {
  const {
    seed,
    coord,
    chunkSize,
    cellSize,
    wallThickness,
    ceilingHeight,
  } = request;

  const floors = new Float32Array(chunkSize * chunkSize * 2);
  const ceilings = new Float32Array(chunkSize * chunkSize * 2);
  const wallX: number[] = [];
  const wallZ: number[] = [];
  const tableData: number[] = [];
  const chairData: number[] = [];
  const lightData: number[] = [];
  const officeLampData: number[] = [];
  const colliders: number[] = [];

  const chunkWorldX = coord.x * chunkSize;
  const chunkWorldZ = coord.z * chunkSize;

  let cursor = 0;
  for (let localZ = 0; localZ < chunkSize; localZ += 1) {
    for (let localX = 0; localX < chunkSize; localX += 1) {
      const worldX = chunkWorldX + localX;
      const worldZ = chunkWorldZ + localZ;
      const centerX = (worldX + 0.5) * cellSize;
      const centerZ = (worldZ + 0.5) * cellSize;

      floors[cursor] = centerX;
      floors[cursor + 1] = centerZ;
      ceilings[cursor] = centerX;
      ceilings[cursor + 1] = centerZ;
      cursor += 2;

      if (isWallX(seed, worldX, worldZ)) {
        const wallCenterX = (worldX + 1) * cellSize;
        const wallCenterZ = centerZ;
        wallX.push(wallCenterX, wallCenterZ);
        colliders.push(wallCenterX, wallCenterZ, wallThickness * 0.5, cellSize * 0.5);
      }

      if (isWallZ(seed, worldX, worldZ)) {
        const wallCenterX = centerX;
        const wallCenterZ = (worldZ + 1) * cellSize;
        wallZ.push(wallCenterX, wallCenterZ);
        colliders.push(wallCenterX, wallCenterZ, cellSize * 0.5, wallThickness * 0.5);
      }

      if (shouldPlaceLight(seed, worldX, worldZ)) {
        const intensity = 1.5 + hashUnit(seed, worldX, worldZ, 43) * 1.3;
        const phase = hashUnit(seed, worldX, worldZ, 47) * Math.PI * 2;
        lightData.push(centerX, ceilingHeight - 0.08, centerZ, intensity, phase);
      }

      let placedTable = false;
      if (shouldPlaceTable(seed, worldX, worldZ) && isFurnitureCellOpen(seed, worldX, worldZ)) {
        const jitterX = (hashUnit(seed, worldX, worldZ, 301) - 0.5) * cellSize * TABLE_JITTER;
        const jitterZ = (hashUnit(seed, worldX, worldZ, 302) - 0.5) * cellSize * TABLE_JITTER;
        const tableYaw = hashUnit(seed, worldX, worldZ, 303) * Math.PI * 2;
        const tableScale = 0.9 + hashUnit(seed, worldX, worldZ, 304) * 0.24;
        const tableX = centerX + jitterX;
        const tableZ = centerZ + jitterZ;

        placedTable = true;
        tableData.push(tableX, tableZ, tableYaw, tableScale);
        colliders.push(tableX, tableZ, 0.58 * tableScale, 0.4 * tableScale);

        for (let side = 0; side < CHAIR_SIDES.length; side += 1) {
          if (hashUnit(seed, worldX, worldZ, 310 + side) > 0.62) {
            continue;
          }

          const sideConfig = CHAIR_SIDES[side];
          const offsetX = sideConfig.x * Math.cos(tableYaw) - sideConfig.z * Math.sin(tableYaw);
          const offsetZ = sideConfig.x * Math.sin(tableYaw) + sideConfig.z * Math.cos(tableYaw);
          const chairX = tableX + offsetX;
          const chairZ = tableZ + offsetZ;
          const chairCellX = Math.floor(chairX / cellSize);
          const chairCellZ = Math.floor(chairZ / cellSize);

          if (!isFurnitureCellOpen(seed, chairCellX, chairCellZ)) {
            continue;
          }

          const chairYaw = tableYaw + sideConfig.yaw + (hashUnit(seed, worldX, worldZ, 320 + side) - 0.5) * 0.22;
          const chairScale = 0.9 + hashUnit(seed, worldX, worldZ, 330 + side) * 0.18;
          chairData.push(chairX, chairZ, chairYaw, chairScale);
          colliders.push(chairX, chairZ, 0.24 * chairScale, 0.24 * chairScale);
        }
      }

      if (!placedTable && shouldPlaceOfficeLamp(seed, worldX, worldZ) && isFurnitureCellOpen(seed, worldX, worldZ)) {
        const jitterX = (hashUnit(seed, worldX, worldZ, 341) - 0.5) * cellSize * OFFICE_LAMP_JITTER;
        const jitterZ = (hashUnit(seed, worldX, worldZ, 342) - 0.5) * cellSize * OFFICE_LAMP_JITTER;
        const lampX = centerX + jitterX;
        const lampZ = centerZ + jitterZ;
        const lampScale = 0.92 + hashUnit(seed, worldX, worldZ, 343) * 0.26;
        const lampIntensity = 0.9 + hashUnit(seed, worldX, worldZ, 344) * 0.8;
        const lampPhase = hashUnit(seed, worldX, worldZ, 345) * Math.PI * 2;
        const periodicFlicker = hashUnit(seed, worldX, worldZ, 346) < 0.38 ? 1 : 0;

        officeLampData.push(lampX, lampZ, lampScale, lampIntensity, lampPhase, periodicFlicker);
        colliders.push(lampX, lampZ, 0.17 * lampScale, 0.17 * lampScale);
      }
    }
  }

  const wallXCenters = new Float32Array(wallX);
  const wallZCenters = new Float32Array(wallZ);
  const tableArray = new Float32Array(tableData);
  const chairArray = new Float32Array(chairData);
  const lightArray = new Float32Array(lightData);
  const officeLampArray = new Float32Array(officeLampData);
  const colliderArray = new Float32Array(colliders);

  const checksum = toChecksum(seed, coord, [
    floors,
    wallXCenters,
    wallZCenters,
    tableArray,
    chairArray,
    lightArray,
    officeLampArray,
    colliderArray,
  ]);

  return {
    seed,
    coord,
    checksum,
    generatedAt: Date.now(),
    data: {
      coord,
      floorCenters: floors,
      ceilingCenters: ceilings,
      wallXCenters,
      wallZCenters,
      tableData: tableArray,
      chairData: chairArray,
      lightData: lightArray,
      officeLampData: officeLampArray,
      colliderData: colliderArray,
    },
  };
}
