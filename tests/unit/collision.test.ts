import { describe, expect, test } from "vitest";

import { resolveCollisions } from "@/lib/physics/collision";

describe("collision resolver", () => {
  test("pushes player out of wall volume", () => {
    const resolved = resolveCollisions(
      [0.2, 0],
      0.5,
      [{ x: 0, z: 0, halfX: 1, halfZ: 1 }],
    );

    expect(Math.max(Math.abs(resolved[0]), Math.abs(resolved[1]))).toBeGreaterThanOrEqual(1.49);
  });

  test("keeps position when not intersecting", () => {
    const resolved = resolveCollisions(
      [5, 5],
      0.5,
      [{ x: 0, z: 0, halfX: 1, halfZ: 1 }],
    );

    expect(resolved).toEqual([5, 5]);
  });
});
