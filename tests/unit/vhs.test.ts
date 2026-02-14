import { describe, expect, test } from "vitest";

import { sanitizeVhsUniforms } from "@/lib/config/vhs";

describe("vhs uniform guardrails", () => {
  test("clamps uniforms to safe ranges", () => {
    const uniforms = sanitizeVhsUniforms({
      strength: 10,
      grain: 3,
      scanlineDensity: -2,
      chromaticOffset: 0.05,
      wobble: 2,
    });

    expect(uniforms).toEqual({
      strength: 1,
      grain: 0.5,
      scanlineDensity: 0,
      chromaticOffset: 0.004,
      wobble: 1,
    });
  });
});
