"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  type InstancedMesh,
  type PointLight,
} from "three";

import type { ChunkRuntime } from "@/lib/types/game";

interface ChunkWorldProps {
  chunks: ChunkRuntime[];
  playerPosition: [number, number];
  cellSize: number;
  wallHeight: number;
  wallThickness: number;
  ceilingHeight: number;
  maxPointLights: number;
}

function pseudoNoise(x: number, y: number, channel: number): number {
  const raw = Math.sin(x * 0.0143 + y * 0.0271 + channel * 0.119) * 43758.5453123;
  return raw - Math.floor(raw);
}

function makeTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to allocate 2D context for texture generation.");
  }
  paint(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

function useMaterials() {
  const wallTexture = useMemo(
    () =>
      makeTexture(512, 512, (ctx, width, height) => {
        ctx.fillStyle = "#cabf74";
        ctx.fillRect(0, 0, width, height);

        for (let y = 0; y < height; y += 48) {
          ctx.fillStyle = y % 96 === 0 ? "rgba(129, 118, 70, 0.16)" : "rgba(152, 142, 86, 0.1)";
          ctx.fillRect(0, y, width, 24);
        }

        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            const noise = pseudoNoise(x, y, 1);
            if (noise > 0.8) {
              const alpha = (noise - 0.8) * 0.7;
              ctx.fillStyle = `rgba(96, 90, 56, ${alpha.toFixed(3)})`;
              ctx.fillRect(x, y, 2, 2);
            }
          }
        }
      }),
    [],
  );

  const floorTexture = useMemo(
    () =>
      makeTexture(512, 512, (ctx, width, height) => {
        ctx.fillStyle = "#5b4f35";
        ctx.fillRect(0, 0, width, height);

        for (let y = 0; y < height; y += 3) {
          for (let x = 0; x < width; x += 3) {
            const noise = pseudoNoise(x, y, 2);
            if (noise > 0.72) {
              const alpha = 0.08 + (noise - 0.72) * 0.5;
              ctx.fillStyle = `rgba(39, 35, 22, ${alpha.toFixed(3)})`;
              ctx.fillRect(x, y, 1.5, 1.5);
            }
          }
        }

        for (let y = 0; y < height; y += 32) {
          ctx.strokeStyle = "rgba(38, 31, 21, 0.05)";
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }),
    [],
  );

  const ceilingTexture = useMemo(
    () =>
      makeTexture(512, 512, (ctx, width, height) => {
        ctx.fillStyle = "#d7d2b5";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(138, 132, 104, 0.2)";
        for (let y = 0; y <= height; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        for (let x = 0; x <= width; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }),
    [],
  );

  wallTexture.repeat.set(2.8, 1.3);
  floorTexture.repeat.set(1.4, 1.4);
  ceilingTexture.repeat.set(1.1, 1.1);

  const wallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#cec47a"),
        map: wallTexture,
        roughness: 0.9,
        metalness: 0.02,
      }),
    [wallTexture],
  );

  const floorMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#5f5034"),
        map: floorTexture,
        roughness: 0.95,
        metalness: 0.01,
      }),
    [floorTexture],
  );

  const ceilingMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#dbd7be"),
        map: ceilingTexture,
        roughness: 0.82,
        metalness: 0.02,
      }),
    [ceilingTexture],
  );

  const tableMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#4d3720"),
        roughness: 0.78,
        metalness: 0.04,
      }),
    [],
  );

  const chairMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#57442d"),
        roughness: 0.82,
        metalness: 0.03,
      }),
    [],
  );

  useEffect(
    () => () => {
      wallTexture.dispose();
      floorTexture.dispose();
      ceilingTexture.dispose();
      wallMaterial.dispose();
      floorMaterial.dispose();
      ceilingMaterial.dispose();
      tableMaterial.dispose();
      chairMaterial.dispose();
    },
    [
      ceilingMaterial,
      ceilingTexture,
      chairMaterial,
      floorMaterial,
      floorTexture,
      tableMaterial,
      wallMaterial,
      wallTexture,
    ],
  );

  return { wallMaterial, floorMaterial, ceilingMaterial, tableMaterial, chairMaterial };
}

interface ChunkInstancesProps {
  chunk: ChunkRuntime;
  cellSize: number;
  wallHeight: number;
  wallThickness: number;
  ceilingHeight: number;
  floorGeometry: BoxGeometry;
  ceilingGeometry: BoxGeometry;
  wallXGeometry: BoxGeometry;
  wallZGeometry: BoxGeometry;
  tableTopGeometry: BoxGeometry;
  tableLegGeometry: BoxGeometry;
  chairSeatGeometry: BoxGeometry;
  chairBackGeometry: BoxGeometry;
  chairLegGeometry: BoxGeometry;
  wallMaterial: MeshStandardMaterial;
  floorMaterial: MeshStandardMaterial;
  ceilingMaterial: MeshStandardMaterial;
  tableMaterial: MeshStandardMaterial;
  chairMaterial: MeshStandardMaterial;
}

function ChunkInstances({
  chunk,
  cellSize,
  wallHeight,
  wallThickness,
  ceilingHeight,
  floorGeometry,
  ceilingGeometry,
  wallXGeometry,
  wallZGeometry,
  tableTopGeometry,
  tableLegGeometry,
  chairSeatGeometry,
  chairBackGeometry,
  chairLegGeometry,
  wallMaterial,
  floorMaterial,
  ceilingMaterial,
  tableMaterial,
  chairMaterial,
}: ChunkInstancesProps) {
  const floorRef = useRef<InstancedMesh>(null);
  const ceilingRef = useRef<InstancedMesh>(null);
  const wallXRef = useRef<InstancedMesh>(null);
  const wallZRef = useRef<InstancedMesh>(null);
  const tableTopRef = useRef<InstancedMesh>(null);
  const tableLegRef = useRef<InstancedMesh>(null);
  const chairSeatRef = useRef<InstancedMesh>(null);
  const chairBackRef = useRef<InstancedMesh>(null);
  const chairLegRef = useRef<InstancedMesh>(null);
  const temp = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const floorMesh = floorRef.current;
    if (!floorMesh) {
      return;
    }
    const count = chunk.floorCenters.length / 2;
    floorMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const x = chunk.floorCenters[i * 2];
      const z = chunk.floorCenters[i * 2 + 1];
      temp.position.set(x, -0.03, z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      floorMesh.setMatrixAt(i, temp.matrix);
    }
    floorMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.floorCenters, temp]);

  useEffect(() => {
    const ceilingMesh = ceilingRef.current;
    if (!ceilingMesh) {
      return;
    }
    const count = chunk.ceilingCenters.length / 2;
    ceilingMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const x = chunk.ceilingCenters[i * 2];
      const z = chunk.ceilingCenters[i * 2 + 1];
      temp.position.set(x, ceilingHeight, z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      ceilingMesh.setMatrixAt(i, temp.matrix);
    }
    ceilingMesh.instanceMatrix.needsUpdate = true;
  }, [ceilingHeight, chunk.ceilingCenters, temp]);

  useEffect(() => {
    const wallMesh = wallXRef.current;
    if (!wallMesh) {
      return;
    }
    const count = chunk.wallXCenters.length / 2;
    wallMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const x = chunk.wallXCenters[i * 2];
      const z = chunk.wallXCenters[i * 2 + 1];
      temp.position.set(x, wallHeight * 0.5, z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      wallMesh.setMatrixAt(i, temp.matrix);
    }
    wallMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.wallXCenters, temp, wallHeight]);

  useEffect(() => {
    const wallMesh = wallZRef.current;
    if (!wallMesh) {
      return;
    }
    const count = chunk.wallZCenters.length / 2;
    wallMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const x = chunk.wallZCenters[i * 2];
      const z = chunk.wallZCenters[i * 2 + 1];
      temp.position.set(x, wallHeight * 0.5, z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      wallMesh.setMatrixAt(i, temp.matrix);
    }
    wallMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.wallZCenters, temp, wallHeight]);

  useEffect(() => {
    const tableTopMesh = tableTopRef.current;
    if (!tableTopMesh) {
      return;
    }

    const count = chunk.tableData.length / 4;
    tableTopMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const index = i * 4;
      const x = chunk.tableData[index];
      const z = chunk.tableData[index + 1];
      const yaw = chunk.tableData[index + 2];
      const scale = chunk.tableData[index + 3];
      temp.position.set(x, 0.74, z);
      temp.rotation.set(0, yaw, 0);
      temp.scale.set(scale, 1, scale);
      temp.updateMatrix();
      tableTopMesh.setMatrixAt(i, temp.matrix);
    }
    tableTopMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.tableData, temp]);

  useEffect(() => {
    const tableLegMesh = tableLegRef.current;
    if (!tableLegMesh) {
      return;
    }

    const legOffsets = [
      { x: -0.46, z: -0.28 },
      { x: 0.46, z: -0.28 },
      { x: -0.46, z: 0.28 },
      { x: 0.46, z: 0.28 },
    ];
    const count = chunk.tableData.length / 4;
    tableLegMesh.count = count * 4;
    for (let i = 0; i < count; i += 1) {
      const index = i * 4;
      const x = chunk.tableData[index];
      const z = chunk.tableData[index + 1];
      const yaw = chunk.tableData[index + 2];
      const scale = chunk.tableData[index + 3];

      for (let leg = 0; leg < legOffsets.length; leg += 1) {
        const offset = legOffsets[leg];
        const localX = offset.x * scale;
        const localZ = offset.z * scale;
        const legX = x + localX * Math.cos(yaw) - localZ * Math.sin(yaw);
        const legZ = z + localX * Math.sin(yaw) + localZ * Math.cos(yaw);

        temp.position.set(legX, 0.34, legZ);
        temp.rotation.set(0, yaw, 0);
        temp.scale.set(scale, 1, scale);
        temp.updateMatrix();
        tableLegMesh.setMatrixAt(i * 4 + leg, temp.matrix);
      }
    }
    tableLegMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.tableData, temp]);

  useEffect(() => {
    const chairSeatMesh = chairSeatRef.current;
    if (!chairSeatMesh) {
      return;
    }

    const count = chunk.chairData.length / 4;
    chairSeatMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const index = i * 4;
      const x = chunk.chairData[index];
      const z = chunk.chairData[index + 1];
      const yaw = chunk.chairData[index + 2];
      const scale = chunk.chairData[index + 3];
      temp.position.set(x, 0.45, z);
      temp.rotation.set(0, yaw, 0);
      temp.scale.set(scale, 1, scale);
      temp.updateMatrix();
      chairSeatMesh.setMatrixAt(i, temp.matrix);
    }
    chairSeatMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.chairData, temp]);

  useEffect(() => {
    const chairBackMesh = chairBackRef.current;
    if (!chairBackMesh) {
      return;
    }

    const count = chunk.chairData.length / 4;
    chairBackMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const index = i * 4;
      const x = chunk.chairData[index];
      const z = chunk.chairData[index + 1];
      const yaw = chunk.chairData[index + 2];
      const scale = chunk.chairData[index + 3];
      const backX = x - Math.sin(yaw) * 0.2 * scale;
      const backZ = z + Math.cos(yaw) * 0.2 * scale;
      temp.position.set(backX, 0.72, backZ);
      temp.rotation.set(0, yaw, 0);
      temp.scale.set(scale, 1, scale);
      temp.updateMatrix();
      chairBackMesh.setMatrixAt(i, temp.matrix);
    }
    chairBackMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.chairData, temp]);

  useEffect(() => {
    const chairLegMesh = chairLegRef.current;
    if (!chairLegMesh) {
      return;
    }

    const count = chunk.chairData.length / 4;
    chairLegMesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const index = i * 4;
      const x = chunk.chairData[index];
      const z = chunk.chairData[index + 1];
      const yaw = chunk.chairData[index + 2];
      const scale = chunk.chairData[index + 3];
      temp.position.set(x, 0.215, z);
      temp.rotation.set(0, yaw, 0);
      temp.scale.set(scale, 1, scale);
      temp.updateMatrix();
      chairLegMesh.setMatrixAt(i, temp.matrix);
    }
    chairLegMesh.instanceMatrix.needsUpdate = true;
  }, [chunk.chairData, temp]);

  return (
    <group>
      <instancedMesh
        args={[floorGeometry, floorMaterial, Math.max(1, chunk.floorCenters.length / 2)]}
        frustumCulled={false}
        ref={floorRef}
      />
      <instancedMesh
        args={[ceilingGeometry, ceilingMaterial, Math.max(1, chunk.ceilingCenters.length / 2)]}
        frustumCulled={false}
        ref={ceilingRef}
      />
      <instancedMesh
        args={[wallXGeometry, wallMaterial, Math.max(1, chunk.wallXCenters.length / 2)]}
        frustumCulled={false}
        ref={wallXRef}
      />
      <instancedMesh
        args={[wallZGeometry, wallMaterial, Math.max(1, chunk.wallZCenters.length / 2)]}
        frustumCulled={false}
        ref={wallZRef}
      />
      <instancedMesh
        args={[tableTopGeometry, tableMaterial, Math.max(1, chunk.tableData.length / 4)]}
        frustumCulled={false}
        ref={tableTopRef}
      />
      <instancedMesh
        args={[tableLegGeometry, tableMaterial, Math.max(1, (chunk.tableData.length / 4) * 4)]}
        frustumCulled={false}
        ref={tableLegRef}
      />
      <instancedMesh
        args={[chairSeatGeometry, chairMaterial, Math.max(1, chunk.chairData.length / 4)]}
        frustumCulled={false}
        ref={chairSeatRef}
      />
      <instancedMesh
        args={[chairBackGeometry, chairMaterial, Math.max(1, chunk.chairData.length / 4)]}
        frustumCulled={false}
        ref={chairBackRef}
      />
      <instancedMesh
        args={[chairLegGeometry, chairMaterial, Math.max(1, chunk.chairData.length / 4)]}
        frustumCulled={false}
        ref={chairLegRef}
      />

      {/* Prevent walls from visually clipping at chunk boundaries due floating point jitter. */}
      <mesh position={[0, -100, 0]} visible={false}>
        <boxGeometry args={[cellSize, wallHeight, wallThickness]} />
      </mesh>
    </group>
  );
}

interface LightSample {
  id: string;
  x: number;
  y: number;
  z: number;
  baseIntensity: number;
  phase: number;
}

interface OfficeLampSample {
  id: string;
  x: number;
  z: number;
  scale: number;
  baseIntensity: number;
  phase: number;
  periodicFlicker: boolean;
}

function FlickerLight({ sample }: { sample: LightSample }) {
  const lightRef = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) {
      return;
    }
    const time = clock.elapsedTime;
    const carrier = 0.9 + Math.sin(time * 4.8 + sample.phase) * 0.08;
    const jitter = 0.95 + Math.sin(time * 17.0 + sample.phase * 1.7) * 0.04;
    const dropoutGate = Math.sin(time * 0.65 + sample.phase * 0.35);
    const dropout = dropoutGate > 0.92 ? 0.66 : 1;
    lightRef.current.intensity = sample.baseIntensity * carrier * jitter * dropout;
  });

  return (
    <group position={[sample.x, sample.y, sample.z]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.06, 0.32]} />
        <meshStandardMaterial color="#fff8d4" emissive="#fff6bf" emissiveIntensity={1.2} />
      </mesh>
      <pointLight
        color="#fff8de"
        decay={2}
        distance={8}
        intensity={sample.baseIntensity}
        position={[0, -0.1, 0]}
        ref={lightRef}
      />
    </group>
  );
}

function OfficeLamp({ sample }: { sample: OfficeLampSample }) {
  const lightRef = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) {
      return;
    }

    const time = clock.elapsedTime;
    let intensity = sample.baseIntensity * (0.94 + Math.sin(time * 3.2 + sample.phase) * 0.06);

    if (sample.periodicFlicker) {
      const cycle = (time + sample.phase * 1.5915494309189535) % 10;
      if (cycle < 0.28) {
        const microPulse = 0.35 + (Math.sin(cycle * 80 + sample.phase * 3.1) * 0.5 + 0.5) * 0.65;
        const dropout = Math.sin(cycle * 170 + sample.phase * 9.3) > -0.12 ? 1 : 0.15;
        intensity *= microPulse * dropout;
      }
    }

    lightRef.current.intensity = intensity;
  });

  return (
    <group position={[sample.x, 0, sample.z]} scale={[sample.scale, sample.scale, sample.scale]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.06, 10]} />
        <meshStandardMaterial color="#4f4530" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.3, 8]} />
        <meshStandardMaterial color="#3e3625" metalness={0.1} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.26, 0.2, 0.32, 12, 1, true]} />
        <meshStandardMaterial color="#d8c790" emissive="#7b6734" emissiveIntensity={0.15} />
      </mesh>
      <pointLight
        color="#ffe9b0"
        decay={2}
        distance={6.8}
        intensity={sample.baseIntensity}
        position={[0, 1.18, 0]}
        ref={lightRef}
      />
    </group>
  );
}

export default function ChunkWorld({
  chunks,
  playerPosition,
  cellSize,
  wallHeight,
  wallThickness,
  ceilingHeight,
  maxPointLights,
}: ChunkWorldProps) {
  const {
    wallMaterial,
    floorMaterial,
    ceilingMaterial,
    tableMaterial,
    chairMaterial,
  } = useMaterials();

  const floorGeometry = useMemo(() => new BoxGeometry(cellSize, 0.06, cellSize), [cellSize]);
  const ceilingGeometry = useMemo(() => new BoxGeometry(cellSize, 0.05, cellSize), [cellSize]);
  const wallXGeometry = useMemo(
    () => new BoxGeometry(wallThickness, wallHeight, cellSize),
    [cellSize, wallHeight, wallThickness],
  );
  const wallZGeometry = useMemo(
    () => new BoxGeometry(cellSize, wallHeight, wallThickness),
    [cellSize, wallHeight, wallThickness],
  );
  const tableTopGeometry = useMemo(() => new BoxGeometry(1.22, 0.08, 0.82), []);
  const tableLegGeometry = useMemo(() => new BoxGeometry(0.08, 0.64, 0.08), []);
  const chairSeatGeometry = useMemo(() => new BoxGeometry(0.5, 0.08, 0.5), []);
  const chairBackGeometry = useMemo(() => new BoxGeometry(0.5, 0.52, 0.08), []);
  const chairLegGeometry = useMemo(() => new BoxGeometry(0.11, 0.41, 0.11), []);

  useEffect(
    () => () => {
      floorGeometry.dispose();
      ceilingGeometry.dispose();
      wallXGeometry.dispose();
      wallZGeometry.dispose();
      tableTopGeometry.dispose();
      tableLegGeometry.dispose();
      chairSeatGeometry.dispose();
      chairBackGeometry.dispose();
      chairLegGeometry.dispose();
    },
    [
      ceilingGeometry,
      chairBackGeometry,
      chairLegGeometry,
      chairSeatGeometry,
      floorGeometry,
      tableLegGeometry,
      tableTopGeometry,
      wallXGeometry,
      wallZGeometry,
    ],
  );

  const { ceilingLights, officeLamps } = useMemo(() => {
    const ceiling: LightSample[] = [];
    const lamps: OfficeLampSample[] = [];

    for (const chunk of chunks) {
      for (let i = 0; i < chunk.lightData.length; i += 5) {
        ceiling.push({
          id: `${chunk.key}:light:${i}`,
          x: chunk.lightData[i],
          y: chunk.lightData[i + 1],
          z: chunk.lightData[i + 2],
          baseIntensity: chunk.lightData[i + 3],
          phase: chunk.lightData[i + 4],
        });
      }

      for (let i = 0; i < chunk.officeLampData.length; i += 6) {
        lamps.push({
          id: `${chunk.key}:office-lamp:${i}`,
          x: chunk.officeLampData[i],
          z: chunk.officeLampData[i + 1],
          scale: chunk.officeLampData[i + 2],
          baseIntensity: chunk.officeLampData[i + 3],
          phase: chunk.officeLampData[i + 4],
          periodicFlicker: chunk.officeLampData[i + 5] > 0.5,
        });
      }
    }

    ceiling.sort((a, b) => {
      const da = (a.x - playerPosition[0]) ** 2 + (a.z - playerPosition[1]) ** 2;
      const db = (b.x - playerPosition[0]) ** 2 + (b.z - playerPosition[1]) ** 2;
      return da - db;
    });

    lamps.sort((a, b) => {
      const da = (a.x - playerPosition[0]) ** 2 + (a.z - playerPosition[1]) ** 2;
      const db = (b.x - playerPosition[0]) ** 2 + (b.z - playerPosition[1]) ** 2;
      return da - db;
    });

    const lampBudget = Math.min(
      maxPointLights,
      Math.min(18, Math.max(4, Math.floor(maxPointLights * 0.35))),
    );
    const selectedLamps = lamps.slice(0, lampBudget);
    const ceilingBudget = Math.max(0, maxPointLights - selectedLamps.length);

    return {
      ceilingLights: ceiling.slice(0, ceilingBudget),
      officeLamps: selectedLamps,
    };
  }, [chunks, maxPointLights, playerPosition]);

  return (
    <group>
      {chunks.map((chunk) => (
        <ChunkInstances
          ceilingGeometry={ceilingGeometry}
          ceilingHeight={ceilingHeight}
          ceilingMaterial={ceilingMaterial}
          chairBackGeometry={chairBackGeometry}
          chairLegGeometry={chairLegGeometry}
          chairMaterial={chairMaterial}
          chairSeatGeometry={chairSeatGeometry}
          cellSize={cellSize}
          chunk={chunk}
          floorGeometry={floorGeometry}
          floorMaterial={floorMaterial}
          key={chunk.key}
          tableLegGeometry={tableLegGeometry}
          tableMaterial={tableMaterial}
          tableTopGeometry={tableTopGeometry}
          wallHeight={wallHeight}
          wallMaterial={wallMaterial}
          wallThickness={wallThickness}
          wallXGeometry={wallXGeometry}
          wallZGeometry={wallZGeometry}
        />
      ))}

      {ceilingLights.map((sample) => (
        <FlickerLight key={sample.id} sample={sample} />
      ))}

      {officeLamps.map((sample) => (
        <OfficeLamp key={sample.id} sample={sample} />
      ))}
    </group>
  );
}
