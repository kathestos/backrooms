import type { CollisionBox } from "@/lib/types/game";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveCollisions(
  target: [number, number],
  playerRadius: number,
  colliders: CollisionBox[],
): [number, number] {
  let [x, z] = target;
  const radiusSq = playerRadius * playerRadius;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    for (const collider of colliders) {
      const minX = collider.x - collider.halfX;
      const maxX = collider.x + collider.halfX;
      const minZ = collider.z - collider.halfZ;
      const maxZ = collider.z + collider.halfZ;

      const closestX = clamp(x, minX, maxX);
      const closestZ = clamp(z, minZ, maxZ);
      const diffX = x - closestX;
      const diffZ = z - closestZ;
      const distSq = diffX * diffX + diffZ * diffZ;

      if (distSq >= radiusSq) {
        continue;
      }

      if (distSq === 0) {
        const overlapX = collider.halfX + playerRadius - Math.abs(x - collider.x);
        const overlapZ = collider.halfZ + playerRadius - Math.abs(z - collider.z);
        if (overlapX < overlapZ) {
          x += (x >= collider.x ? 1 : -1) * overlapX;
        } else {
          z += (z >= collider.z ? 1 : -1) * overlapZ;
        }
        continue;
      }

      const dist = Math.sqrt(distSq);
      const push = playerRadius - dist;
      x += (diffX / dist) * push;
      z += (diffZ / dist) * push;
    }
  }

  return [x, z];
}
