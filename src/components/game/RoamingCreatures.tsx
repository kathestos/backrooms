"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
} from "three";

import { resolveCollisions } from "@/lib/physics/collision";
import type { ChunkRuntime, CollisionBox } from "@/lib/types/game";
import { hashUnit } from "@/lib/world/hash";

interface RoamingCreaturesProps {
  seed: string;
  chunks: ChunkRuntime[];
  colliders: CollisionBox[];
  playerPosition: [number, number];
  pointerLocked: boolean;
  chunkSize: number;
  cellSize: number;
  disabled?: boolean;
  onPlayerCaught?: () => void;
}

interface CreatureSpawn {
  id: string;
  x: number;
  z: number;
  baseYaw: number;
  scale: number;
  phase: number;
}

interface CreatureRuntime {
  id: string;
  x: number;
  z: number;
  yaw: number;
  baseYaw: number;
  scale: number;
  phase: number;
  homeX: number;
  homeZ: number;
  radius: number;
  state: "roam" | "stunned" | "aggressive";
  stateUntil: number;
}

interface KeyboardProjectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  spin: number;
  expiresAt: number;
}

const CHUNK_CREATURE_CHANCE = 0.78;
const CHUNK_EXTRA_CREATURE_CHANCE = 0.45;
const CREATURE_CHUNK_MARGIN = 2;
const CREATURE_LEASH_METERS = 10.5;
const CREATURE_BASE_SPEED = 0.75;
const CREATURE_CHASE_SPEED = 1.5;
const CREATURE_TRIGGER_DISTANCE = 4.9;
const CREATURE_STUN_SECONDS = 5;
const CREATURE_TOUCH_BUFFER = 0.4;
const KEYBOARD_THROW_SPEED = 14.2;
const KEYBOARD_THROW_COOLDOWN = 0.28;
const KEYBOARD_PROJECTILE_LIFETIME = 2.8;
const KEYBOARD_PROJECTILE_RADIUS = 0.14;
const KEYBOARD_PROJECTILE_GRAVITY = 13;

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) {
    value -= Math.PI * 2;
  }
  while (value < -Math.PI) {
    value += Math.PI * 2;
  }
  return value;
}

function yawForVector(dx: number, dz: number): number {
  return Math.atan2(dx, -dz);
}

function creatureCount(seed: string, chunkX: number, chunkZ: number): number {
  const roll = hashUnit(seed, chunkX, chunkZ, 400);
  if (roll > CHUNK_CREATURE_CHANCE) {
    return 0;
  }
  const secondRoll = hashUnit(seed, chunkX, chunkZ, 401);
  return secondRoll < CHUNK_EXTRA_CREATURE_CHANCE ? 2 : 1;
}

function buildSpawns(
  seed: string,
  chunks: ChunkRuntime[],
  chunkSize: number,
  cellSize: number,
): CreatureSpawn[] {
  const spawns: CreatureSpawn[] = [];

  for (const chunk of chunks) {
    const count = creatureCount(seed, chunk.coord.x, chunk.coord.z);
    for (let i = 0; i < count; i += 1) {
      const id = `${chunk.key}:creature:${i}`;
      const localX =
        CREATURE_CHUNK_MARGIN +
        Math.floor(
          hashUnit(seed, chunk.coord.x * 13 + i, chunk.coord.z * 7 + i, 402) *
            Math.max(1, chunkSize - CREATURE_CHUNK_MARGIN * 2),
        );
      const localZ =
        CREATURE_CHUNK_MARGIN +
        Math.floor(
          hashUnit(seed, chunk.coord.x * 5 + i, chunk.coord.z * 17 + i, 403) *
            Math.max(1, chunkSize - CREATURE_CHUNK_MARGIN * 2),
        );
      const worldCellX = chunk.coord.x * chunkSize + localX;
      const worldCellZ = chunk.coord.z * chunkSize + localZ;
      const jitterX = (hashUnit(seed, worldCellX, worldCellZ, 404) - 0.5) * cellSize * 0.45;
      const jitterZ = (hashUnit(seed, worldCellX, worldCellZ, 405) - 0.5) * cellSize * 0.45;

      spawns.push({
        id,
        x: (worldCellX + 0.5) * cellSize + jitterX,
        z: (worldCellZ + 0.5) * cellSize + jitterZ,
        baseYaw: hashUnit(seed, worldCellX, worldCellZ, 406) * Math.PI * 2,
        scale: 0.88 + hashUnit(seed, worldCellX, worldCellZ, 407) * 0.45,
        phase: hashUnit(seed, worldCellX, worldCellZ, 408) * Math.PI * 2,
      });
    }
  }

  return spawns;
}

export default function RoamingCreatures({
  seed,
  chunks,
  colliders,
  playerPosition,
  pointerLocked,
  chunkSize,
  cellSize,
  disabled = false,
  onPlayerCaught,
}: RoamingCreaturesProps) {
  const { camera } = useThree();
  const spawns = useMemo(() => buildSpawns(seed, chunks, chunkSize, cellSize), [seed, chunks, chunkSize, cellSize]);
  const runtimesRef = useRef<Map<string, CreatureRuntime>>(new Map());
  const idsRef = useRef<string[]>([]);
  const caughtRef = useRef(false);
  const deadIdsRef = useRef<Set<string>>(new Set());
  const projectilesRef = useRef<Map<string, KeyboardProjectile>>(new Map());
  const projectileIdsRef = useRef<string[]>([]);
  const projectileSeqRef = useRef(0);
  const lastThrowAtRef = useRef(-999);
  const throwDirectionRef = useRef(new Vector3());
  const temp = useMemo(() => new Object3D(), []);

  const bodyGeometry = useMemo(() => new BoxGeometry(0.4, 1.55, 0.3), []);
  const headGeometry = useMemo(() => new SphereGeometry(0.23, 10, 10), []);
  const armGeometry = useMemo(() => new BoxGeometry(0.1, 0.95, 0.11), []);
  const eyeGeometry = useMemo(() => new SphereGeometry(0.045, 8, 8), []);
  const keyboardGeometry = useMemo(() => new BoxGeometry(0.42, 0.055, 0.18), []);

  const bodyMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#1b1a1a"),
        roughness: 0.95,
        metalness: 0.03,
      }),
    [],
  );
  const calmEyeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#cab2a0"),
        emissive: new Color("#7b7147"),
        emissiveIntensity: 0.55,
        roughness: 0.3,
      }),
    [],
  );
  const enragedEyeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#ff7265"),
        emissive: new Color("#ff2b1a"),
        emissiveIntensity: 1.7,
        roughness: 0.3,
      }),
    [],
  );
  const keyboardMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#c7bfb1"),
        roughness: 0.78,
        metalness: 0.05,
      }),
    [],
  );

  const bodyRef = useRef<InstancedMesh>(null);
  const headRef = useRef<InstancedMesh>(null);
  const armRef = useRef<InstancedMesh>(null);
  const calmEyeRef = useRef<InstancedMesh>(null);
  const enragedEyeRef = useRef<InstancedMesh>(null);
  const keyboardRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    return () => {
      bodyGeometry.dispose();
      headGeometry.dispose();
      armGeometry.dispose();
      eyeGeometry.dispose();
      keyboardGeometry.dispose();
      bodyMaterial.dispose();
      calmEyeMaterial.dispose();
      enragedEyeMaterial.dispose();
      keyboardMaterial.dispose();
    };
  }, [
    armGeometry,
    bodyGeometry,
    bodyMaterial,
    calmEyeMaterial,
    enragedEyeMaterial,
    eyeGeometry,
    headGeometry,
    keyboardGeometry,
    keyboardMaterial,
  ]);

  useEffect(() => {
    caughtRef.current = false;
    deadIdsRef.current.clear();
    projectilesRef.current.clear();
    projectileIdsRef.current = [];
    projectileSeqRef.current = 0;
    lastThrowAtRef.current = -999;
  }, [seed]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      if (disabled || !pointerLocked) {
        return;
      }

      const now = performance.now() * 0.001;
      if (now - lastThrowAtRef.current < KEYBOARD_THROW_COOLDOWN) {
        return;
      }
      lastThrowAtRef.current = now;

      const direction = throwDirectionRef.current;
      camera.getWorldDirection(direction);
      direction.normalize();

      const id = `kbd:${projectileSeqRef.current}`;
      projectileSeqRef.current += 1;
      const spawnOffset = 0.6;
      const spawnX = camera.position.x + direction.x * spawnOffset;
      const spawnY = camera.position.y + direction.y * spawnOffset;
      const spawnZ = camera.position.z + direction.z * spawnOffset;
      const throwYaw = Math.atan2(direction.x, -direction.z);
      projectilesRef.current.set(id, {
        id,
        x: spawnX,
        y: spawnY,
        z: spawnZ,
        vx: direction.x * KEYBOARD_THROW_SPEED,
        vy: direction.y * KEYBOARD_THROW_SPEED,
        vz: direction.z * KEYBOARD_THROW_SPEED,
        yaw: throwYaw,
        spin: (Math.sin(throwYaw + now * 1.7) > 0 ? 1 : -1) * (6 + (projectileSeqRef.current % 5)),
        expiresAt: now + KEYBOARD_PROJECTILE_LIFETIME,
      });
      projectileIdsRef.current = [...projectileIdsRef.current, id];
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [camera, disabled, pointerLocked]);

  useEffect(() => {
    const runtimes = runtimesRef.current;
    const desired = new Set<string>();
    const orderedIds: string[] = [];
    const deadIds = deadIdsRef.current;

    for (const spawn of spawns) {
      if (deadIds.has(spawn.id)) {
        continue;
      }
      desired.add(spawn.id);
      orderedIds.push(spawn.id);
      const existing = runtimes.get(spawn.id);
      if (existing) {
        existing.homeX = spawn.x;
        existing.homeZ = spawn.z;
        existing.scale = spawn.scale;
        existing.baseYaw = spawn.baseYaw;
        existing.phase = spawn.phase;
        continue;
      }

      runtimes.set(spawn.id, {
        id: spawn.id,
        x: spawn.x,
        z: spawn.z,
        yaw: spawn.baseYaw,
        baseYaw: spawn.baseYaw,
        scale: spawn.scale,
        phase: spawn.phase,
        homeX: spawn.x,
        homeZ: spawn.z,
        radius: 0.28 * spawn.scale,
        state: "roam",
        stateUntil: 0,
      });
    }

    for (const id of [...runtimes.keys()]) {
      if (!desired.has(id)) {
        runtimes.delete(id);
      }
    }

    idsRef.current = orderedIds.filter((id) => runtimes.has(id));
  }, [spawns]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(0.05, delta);
    const time = clock.elapsedTime;
    const nowSeconds = performance.now() * 0.001;
    const runtimes = runtimesRef.current;
    const ids = idsRef.current;
    const deadIds = deadIdsRef.current;
    const projectiles = projectilesRef.current;
    const projectileIds = projectileIdsRef.current;

    const bodies = bodyRef.current;
    const heads = headRef.current;
    const arms = armRef.current;
    const calmEyes = calmEyeRef.current;
    const enragedEyes = enragedEyeRef.current;
    const keyboards = keyboardRef.current;
    if (!bodies || !heads || !arms || !calmEyes || !enragedEyes || !keyboards) {
      return;
    }

    const nextProjectileIds: string[] = [];
    for (const projectileId of projectileIds) {
      const projectile = projectiles.get(projectileId);
      if (!projectile) {
        continue;
      }

      projectile.vy -= KEYBOARD_PROJECTILE_GRAVITY * dt;
      const desiredX = projectile.x + projectile.vx * dt;
      const desiredZ = projectile.z + projectile.vz * dt;
      const [resolvedX, resolvedZ] = resolveCollisions(
        [desiredX, desiredZ],
        KEYBOARD_PROJECTILE_RADIUS,
        colliders,
      );
      const blocked = Math.abs(resolvedX - desiredX) + Math.abs(resolvedZ - desiredZ) > 0.02;

      projectile.x = resolvedX;
      projectile.z = resolvedZ;
      projectile.y += projectile.vy * dt;
      projectile.yaw += projectile.spin * dt;

      if (blocked || projectile.y < 0.05 || nowSeconds >= projectile.expiresAt) {
        projectiles.delete(projectileId);
        continue;
      }

      nextProjectileIds.push(projectileId);
    }
    projectileIdsRef.current = nextProjectileIds;

    const survivingCreatureIds: string[] = [];
    let creatureRenderCount = 0;
    let calmEyePairs = 0;
    let enragedEyePairs = 0;

    for (const creatureId of ids) {
      const creature = runtimes.get(creatureId);
      if (!creature) {
        continue;
      }

      let wasKilled = false;
      for (const projectileId of projectileIdsRef.current) {
        const projectile = projectiles.get(projectileId);
        if (!projectile) {
          continue;
        }
        const dx = projectile.x - creature.x;
        const dz = projectile.z - creature.z;
        const dy = projectile.y - 1.18 * creature.scale;
        const hitRadius = creature.radius + 0.2;
        if (dx * dx + dz * dz <= hitRadius * hitRadius && Math.abs(dy) <= 1.05 * creature.scale) {
          wasKilled = true;
          deadIds.add(creature.id);
          runtimes.delete(creature.id);
          projectiles.delete(projectileId);
          break;
        }
      }
      if (wasKilled) {
        continue;
      }

      const toPlayerX = playerPosition[0] - creature.x;
      const toPlayerZ = playerPosition[1] - creature.z;
      const playerDistance = Math.hypot(toPlayerX, toPlayerZ);

      if (!disabled && !caughtRef.current && playerDistance <= creature.radius + CREATURE_TOUCH_BUFFER) {
        caughtRef.current = true;
        onPlayerCaught?.();
      }

      const toHomeX = creature.homeX - creature.x;
      const toHomeZ = creature.homeZ - creature.z;
      const homeDistance = Math.hypot(toHomeX, toHomeZ);

      if (!disabled && creature.state === "roam" && playerDistance < CREATURE_TRIGGER_DISTANCE) {
        creature.state = "stunned";
        creature.stateUntil = time + CREATURE_STUN_SECONDS;
      }

      if (!disabled && creature.state === "stunned" && time >= creature.stateUntil) {
        creature.state = "aggressive";
      }

      let targetYaw = creature.baseYaw + Math.sin(time * 0.22 + creature.phase) * 0.95;
      let speed = CREATURE_BASE_SPEED + Math.sin(time * 0.35 + creature.phase * 0.73) * 0.12;
      let turnGain = 2.05;

      if (creature.state === "stunned") {
        targetYaw = yawForVector(toPlayerX, toPlayerZ);
        speed = 0;
        turnGain = 2.6;
      } else if (creature.state === "aggressive") {
        targetYaw = yawForVector(toPlayerX, toPlayerZ);
        speed = CREATURE_CHASE_SPEED + (playerDistance > 8 ? 0.2 : 0);
        turnGain = 4.2;
      } else if (homeDistance > CREATURE_LEASH_METERS) {
        targetYaw = yawForVector(toHomeX, toHomeZ);
        speed = CREATURE_CHASE_SPEED * 0.95;
      }

      if (disabled) {
        speed = 0;
      }

      creature.yaw += normalizeAngle(targetYaw - creature.yaw) * Math.min(1, dt * turnGain);

      const desiredX = creature.x + Math.sin(creature.yaw) * speed * dt;
      const desiredZ = creature.z - Math.cos(creature.yaw) * speed * dt;
      const [resolvedX, resolvedZ] =
        speed > 0
          ? resolveCollisions([desiredX, desiredZ], creature.radius, colliders)
          : [creature.x, creature.z];

      const blocked = speed > 0 && Math.abs(resolvedX - desiredX) + Math.abs(resolvedZ - desiredZ) > 0.015;
      if (blocked) {
        creature.yaw += Math.sin(time * 3.6 + creature.phase) > 0 ? 0.9 : -0.9;
      }

      creature.x = resolvedX;
      creature.z = resolvedZ;

      const bob = Math.sin(time * 3.8 + creature.phase * 1.3) * 0.055;
      const cosYaw = Math.cos(creature.yaw);
      const sinYaw = Math.sin(creature.yaw);

      temp.position.set(creature.x, 0.86 * creature.scale + bob, creature.z);
      temp.rotation.set(0, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      bodies.setMatrixAt(creatureRenderCount, temp.matrix);

      temp.position.set(creature.x, 1.67 * creature.scale + bob * 0.6, creature.z);
      temp.rotation.set(0, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      heads.setMatrixAt(creatureRenderCount, temp.matrix);

      const leftSwing = Math.sin(time * 4.9 + creature.phase) * 0.52;
      const rightSwing = Math.sin(time * 4.9 + creature.phase + Math.PI) * 0.52;
      const armY = 0.9 * creature.scale + bob * 0.7;
      const armDepth = 0.03 * creature.scale;

      const leftArmLocalX = -0.29 * creature.scale;
      const rightArmLocalX = 0.29 * creature.scale;

      const leftArmX = creature.x + leftArmLocalX * cosYaw - armDepth * sinYaw;
      const leftArmZ = creature.z + leftArmLocalX * sinYaw + armDepth * cosYaw;
      temp.position.set(leftArmX, armY, leftArmZ);
      temp.rotation.set(leftSwing, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      arms.setMatrixAt(creatureRenderCount * 2, temp.matrix);

      const rightArmX = creature.x + rightArmLocalX * cosYaw - armDepth * sinYaw;
      const rightArmZ = creature.z + rightArmLocalX * sinYaw + armDepth * cosYaw;
      temp.position.set(rightArmX, armY, rightArmZ);
      temp.rotation.set(rightSwing, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      arms.setMatrixAt(creatureRenderCount * 2 + 1, temp.matrix);

      const eyeY = 1.71 * creature.scale + bob * 0.5;
      const eyeForward = -0.18 * creature.scale;
      const eyeSide = 0.07 * creature.scale;

      const leftEyeX = creature.x + eyeSide * cosYaw - eyeForward * sinYaw;
      const leftEyeZ = creature.z + eyeSide * sinYaw + eyeForward * cosYaw;
      temp.position.set(leftEyeX, eyeY, leftEyeZ);
      temp.rotation.set(0, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      const enraged = creature.state !== "roam";
      const eyeBase = enraged ? enragedEyePairs * 2 : calmEyePairs * 2;
      if (enraged) {
        enragedEyes.setMatrixAt(eyeBase, temp.matrix);
      } else {
        calmEyes.setMatrixAt(eyeBase, temp.matrix);
      }

      const rightEyeX = creature.x - eyeSide * cosYaw - eyeForward * sinYaw;
      const rightEyeZ = creature.z - eyeSide * sinYaw + eyeForward * cosYaw;
      temp.position.set(rightEyeX, eyeY, rightEyeZ);
      temp.rotation.set(0, creature.yaw, 0);
      temp.scale.set(creature.scale, creature.scale, creature.scale);
      temp.updateMatrix();
      if (enraged) {
        enragedEyes.setMatrixAt(eyeBase + 1, temp.matrix);
        enragedEyePairs += 1;
      } else {
        calmEyes.setMatrixAt(eyeBase + 1, temp.matrix);
        calmEyePairs += 1;
      }

      survivingCreatureIds.push(creatureId);
      creatureRenderCount += 1;
    }

    idsRef.current = survivingCreatureIds;
    bodies.count = creatureRenderCount;
    heads.count = creatureRenderCount;
    arms.count = creatureRenderCount * 2;
    calmEyes.count = calmEyePairs * 2;
    enragedEyes.count = enragedEyePairs * 2;

    const liveProjectileIds = projectileIdsRef.current.filter((projectileId) => projectiles.has(projectileId));
    projectileIdsRef.current = liveProjectileIds;

    let projectileRenderCount = 0;
    for (const projectileId of liveProjectileIds) {
      const projectile = projectiles.get(projectileId);
      if (!projectile) {
        continue;
      }

      temp.position.set(projectile.x, projectile.y, projectile.z);
      temp.rotation.set(0, projectile.yaw, Math.sin(time * 7.1 + projectile.spin) * 0.18);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      keyboards.setMatrixAt(projectileRenderCount, temp.matrix);
      projectileRenderCount += 1;
    }
    keyboards.count = projectileRenderCount;

    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    calmEyes.instanceMatrix.needsUpdate = true;
    enragedEyes.instanceMatrix.needsUpdate = true;
    keyboards.instanceMatrix.needsUpdate = true;
  });

  const creatureCapacity = Math.max(1, spawns.length);
  const projectileCapacity = Math.max(24, creatureCapacity * 6);

  return (
    <group>
      <instancedMesh
        args={[bodyGeometry, bodyMaterial, creatureCapacity]}
        frustumCulled={false}
        ref={bodyRef}
      />
      <instancedMesh
        args={[headGeometry, bodyMaterial, creatureCapacity]}
        frustumCulled={false}
        ref={headRef}
      />
      <instancedMesh
        args={[armGeometry, bodyMaterial, creatureCapacity * 2]}
        frustumCulled={false}
        ref={armRef}
      />
      <instancedMesh
        args={[eyeGeometry, calmEyeMaterial, creatureCapacity * 2]}
        frustumCulled={false}
        ref={calmEyeRef}
      />
      <instancedMesh
        args={[eyeGeometry, enragedEyeMaterial, creatureCapacity * 2]}
        frustumCulled={false}
        ref={enragedEyeRef}
      />
      <instancedMesh
        args={[keyboardGeometry, keyboardMaterial, projectileCapacity]}
        frustumCulled={false}
        ref={keyboardRef}
      />
    </group>
  );
}
