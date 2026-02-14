import type { GameConfig, GraphicsConfig, GraphicsPreset } from "@/lib/types/game";

export const GAME_CONFIG: GameConfig = {
  cellSize: 2.5,
  chunkSize: 24,
  activeRadius: 2,
  cacheRadius: 3,
  wallThickness: 0.14,
  wallHeight: 2.9,
  ceilingHeight: 3.0,
  playerSpeed: 4.5,
  playerRadius: 0.35,
  eyeHeight: 1.62,
  mouseSensitivity: 0.0022,
  configVersion: 1,
};

export const MAX_CHUNK_CACHE = (GAME_CONFIG.cacheRadius * 2 + 1) ** 2 + 24;

export const GRAPHICS_BY_PRESET: Record<GraphicsPreset, GraphicsConfig> = {
  low: {
    dpr: [0.7, 1.0],
    maxPointLights: 32,
    vhsStrength: 0.2,
    scanlineDensity: 0.22,
    grain: 0.08,
    chromaticOffset: 0.0006,
    wobble: 0.15,
  },
  default: {
    dpr: [0.9, 1.4],
    maxPointLights: 56,
    vhsStrength: 0.42,
    scanlineDensity: 0.35,
    grain: 0.12,
    chromaticOffset: 0.001,
    wobble: 0.35,
  },
  heavy_vhs: {
    dpr: [0.9, 1.3],
    maxPointLights: 56,
    vhsStrength: 0.68,
    scanlineDensity: 0.5,
    grain: 0.2,
    chromaticOffset: 0.0017,
    wobble: 0.55,
  },
};

export function getGraphicsConfig(preset: GraphicsPreset): GraphicsConfig {
  return GRAPHICS_BY_PRESET[preset];
}
