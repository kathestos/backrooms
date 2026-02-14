export interface VhsUniformSettings {
  strength: number;
  grain: number;
  scanlineDensity: number;
  chromaticOffset: number;
  wobble: number;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeVhsUniforms(input: VhsUniformSettings): VhsUniformSettings {
  return {
    strength: clamp01(input.strength),
    grain: clampRange(input.grain, 0, 0.5),
    scanlineDensity: clampRange(input.scanlineDensity, 0, 1),
    chromaticOffset: clampRange(input.chromaticOffset, 0, 0.004),
    wobble: clampRange(input.wobble, 0, 1),
  };
}
