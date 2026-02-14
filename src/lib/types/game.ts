export type GraphicsPreset = "low" | "default" | "heavy_vhs";

export interface GameConfig {
  cellSize: number;
  chunkSize: number;
  activeRadius: number;
  cacheRadius: number;
  wallThickness: number;
  wallHeight: number;
  ceilingHeight: number;
  playerSpeed: number;
  playerRadius: number;
  eyeHeight: number;
  mouseSensitivity: number;
  configVersion: number;
}

export interface GraphicsConfig {
  dpr: [number, number];
  maxPointLights: number;
  vhsStrength: number;
  scanlineDensity: number;
  grain: number;
  chromaticOffset: number;
  wobble: number;
}

export interface ChunkCoord {
  x: number;
  z: number;
}

export interface CollisionBox {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

export interface ChunkData {
  coord: ChunkCoord;
  floorCenters: Float32Array;
  ceilingCenters: Float32Array;
  wallXCenters: Float32Array;
  wallZCenters: Float32Array;
  tableData: Float32Array;
  chairData: Float32Array;
  lightData: Float32Array;
  officeLampData: Float32Array;
  colliderData: Float32Array;
}

export interface ChunkRuntime extends ChunkData {
  key: string;
  checksum: string;
  generatedAt: number;
  lastTouched: number;
  colliders: CollisionBox[];
}

export interface GenerationRequest {
  seed: string;
  coord: ChunkCoord;
  configVersion: number;
  chunkSize: number;
  cellSize: number;
  wallThickness: number;
  ceilingHeight: number;
}

export interface GenerationResponse {
  seed: string;
  coord: ChunkCoord;
  data: ChunkData;
  checksum: string;
  generatedAt: number;
}

export interface ChunkStreamSnapshot {
  activeChunks: ChunkRuntime[];
  nearbyColliders: CollisionBox[];
  loadedChunkCount: number;
  currentChunk: ChunkCoord;
}

export interface PlayerState {
  position: [number, number];
  velocity: [number, number];
  yaw: number;
  pitch: number;
  currentChunk: ChunkCoord;
  distanceMeters: number;
}

export interface RunMetrics {
  runId: string;
  seed: string;
  durationSeconds: number;
  distanceMeters: number;
  avgFps: number;
  chunkCount: number;
  userAgent?: string;
}
