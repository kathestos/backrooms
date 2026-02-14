"use client";

import { useMemo } from "react";
import { ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

import { sanitizeVhsUniforms } from "@/lib/config/vhs";

const shader = /* glsl */ `
uniform float time;
uniform float strength;
uniform float scanlineDensity;
uniform float wobble;

void mainUv(inout vec2 uv) {
  float ribbon = sin(uv.y * 120.0 + time * 5.7) * 0.0015 * wobble;
  float drift = sin(time * 1.5 + uv.y * 40.0) * 0.0008 * strength;
  uv.x += ribbon + drift;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float scan = sin((uv.y + time * 0.07) * 1600.0) * 0.5 + 0.5;
  float scanMask = mix(1.0, 0.84 + scan * 0.16, scanlineDensity);

  float tracking = step(0.985, fract(time * 0.16 + uv.y * 0.82));
  float dropout = mix(1.0, 0.76, tracking * strength * 0.55);
  float flicker = 0.98 + sin(time * 40.0) * 0.01;

  vec3 color = inputColor.rgb * scanMask * dropout * flicker;
  outputColor = vec4(color, inputColor.a);
}
`;

class VhsWarpEffect extends Effect {
  constructor(strength: number, scanlineDensity: number, wobble: number) {
    super("VhsWarpEffect", shader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["time", new Uniform(0)],
        ["strength", new Uniform(strength)],
        ["scanlineDensity", new Uniform(scanlineDensity)],
        ["wobble", new Uniform(wobble)],
      ]),
    });
  }

  update(_: unknown, __: unknown, deltaTime: number): void {
    const timeUniform = this.uniforms.get("time");
    if (timeUniform) {
      timeUniform.value += deltaTime;
    }
  }
}

interface VhsEffectsProps {
  strength: number;
  grain: number;
  scanlineDensity: number;
  chromaticOffset: number;
  wobble: number;
}

function WarpPass({ strength, scanlineDensity, wobble }: Pick<VhsEffectsProps, "strength" | "scanlineDensity" | "wobble">) {
  const effect = useMemo(
    () => new VhsWarpEffect(strength, scanlineDensity, wobble),
    [scanlineDensity, strength, wobble],
  );
  return <primitive dispose={null} object={effect} />;
}

export default function VhsEffects(props: VhsEffectsProps) {
  const uniforms = sanitizeVhsUniforms(props);
  const chromaticOffset = useMemo(
    () => new Vector2(uniforms.chromaticOffset, uniforms.chromaticOffset * 0.75),
    [uniforms.chromaticOffset],
  );

  return (
    <EffectComposer multisampling={0}>
      <Vignette darkness={0.7 + uniforms.strength * 0.2} eskil={false} offset={0.14} />
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={uniforms.grain} premultiply />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chromaticOffset}
        radialModulation={false}
      />
      <WarpPass
        scanlineDensity={uniforms.scanlineDensity}
        strength={uniforms.strength}
        wobble={uniforms.wobble}
      />
    </EffectComposer>
  );
}
