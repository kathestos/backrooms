"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";

import AmbientHum from "@/components/game/AmbientHum";
import ChunkWorld from "@/components/game/ChunkWorld";
import FirstPersonController from "@/components/game/FirstPersonController";
import Hud from "@/components/game/Hud";
import RoamingCreatures from "@/components/game/RoamingCreatures";
import VhsEffects from "@/components/game/VhsEffects";
import { GAME_CONFIG, getGraphicsConfig } from "@/lib/config/game-config";
import { finishTelemetry, pingTelemetry, startTelemetryRun } from "@/lib/telemetry/client";
import { useRuntimeStore } from "@/lib/store/runtime-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { GraphicsConfig } from "@/lib/types/game";
import { createSessionSeed } from "@/lib/world/seed";
import { useChunkStream } from "@/lib/world/useChunkStream";

interface SceneProps {
  seed: string;
  graphics: GraphicsConfig;
  mouseSensitivityScalar: number;
  mobileControlsEnabled: boolean;
  mobileForward: boolean;
  mobileBackward: boolean;
  mobileThrowSignal: number;
  disableGameplay: boolean;
  onPlayerCaught: () => void;
}

function Scene({
  seed,
  graphics,
  mouseSensitivityScalar,
  mobileControlsEnabled,
  mobileForward,
  mobileBackward,
  mobileThrowSignal,
  disableGameplay,
  onPlayerCaught,
}: SceneProps) {
  const position = useRuntimeStore((state) => state.position);
  const pointerLocked = useRuntimeStore((state) => state.pointerLocked);
  const setChunkInfo = useRuntimeStore((state) => state.setChunkInfo);
  const chunkSpan = GAME_CONFIG.chunkSize * GAME_CONFIG.cellSize;
  const chunkX = Math.floor(position[0] / chunkSpan);
  const chunkZ = Math.floor(position[1] / chunkSpan);

  const currentChunk = useMemo(() => ({ x: chunkX, z: chunkZ }), [chunkX, chunkZ]);

  const stream = useChunkStream(seed, currentChunk, GAME_CONFIG);
  const creatureColliders = useMemo(
    () => stream.activeChunks.flatMap((chunk) => chunk.colliders),
    [stream.activeChunks],
  );
  const streamChunkX = stream.currentChunk.x;
  const streamChunkZ = stream.currentChunk.z;
  const streamLoadedChunkCount = stream.loadedChunkCount;

  useEffect(() => {
    setChunkInfo({ x: streamChunkX, z: streamChunkZ }, streamLoadedChunkCount);
  }, [setChunkInfo, streamChunkX, streamChunkZ, streamLoadedChunkCount]);

  return (
    <>
      <color args={["#a59c67"]} attach="background" />
      <fog args={["#857c54", 12, 96]} attach="fog" />

      <ambientLight color="#f4eec9" intensity={0.32} />
      <hemisphereLight color="#ebe4c0" groundColor="#25210f" intensity={0.35} />

      <ChunkWorld
        ceilingHeight={GAME_CONFIG.ceilingHeight}
        cellSize={GAME_CONFIG.cellSize}
        chunks={stream.activeChunks}
        maxPointLights={graphics.maxPointLights}
        playerPosition={position}
        wallHeight={GAME_CONFIG.wallHeight}
        wallThickness={GAME_CONFIG.wallThickness}
      />

      <FirstPersonController
        colliders={stream.nearbyColliders}
        disabled={disableGameplay}
        eyeHeight={GAME_CONFIG.eyeHeight}
        mobileBackward={mobileBackward}
        mobileControlsEnabled={mobileControlsEnabled}
        mobileForward={mobileForward}
        mouseSensitivity={GAME_CONFIG.mouseSensitivity * mouseSensitivityScalar}
        movementSpeed={GAME_CONFIG.playerSpeed}
        playerRadius={GAME_CONFIG.playerRadius}
      />

      <RoamingCreatures
        cellSize={GAME_CONFIG.cellSize}
        chunkSize={GAME_CONFIG.chunkSize}
        chunks={stream.activeChunks}
        colliders={creatureColliders}
        disabled={disableGameplay}
        mobileControlsEnabled={mobileControlsEnabled}
        mobileThrowSignal={mobileThrowSignal}
        onPlayerCaught={onPlayerCaught}
        playerPosition={position}
        pointerLocked={pointerLocked}
        seed={seed}
      />

      <AmbientHum />
      <VhsEffects
        chromaticOffset={graphics.chromaticOffset}
        grain={graphics.grain}
        scanlineDensity={graphics.scanlineDensity}
        strength={graphics.vhsStrength}
        wobble={graphics.wobble}
      />
    </>
  );
}

interface BackroomsGameProps {
  initialSeed: string;
}

export default function BackroomsGame({ initialSeed }: BackroomsGameProps) {
  const [seed, setSeed] = useState(initialSeed);
  const [deathStartedAt, setDeathStartedAt] = useState<number | null>(null);
  const [deathProgress, setDeathProgress] = useState(0);
  const [mobileControlsEnabled, setMobileControlsEnabled] = useState(false);
  const [mobileForward, setMobileForward] = useState(false);
  const [mobileBackward, setMobileBackward] = useState(false);
  const [mobileThrowSignal, setMobileThrowSignal] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const runRef = useRef<{ runId: string | null; startMs: number }>({
    runId: null,
    startMs: 0,
  });

  const pointerLocked = useRuntimeStore((state) => state.pointerLocked);
  const position = useRuntimeStore((state) => state.position);
  const currentChunk = useRuntimeStore((state) => state.currentChunk);
  const loadedChunkCount = useRuntimeStore((state) => state.loadedChunkCount);
  const avgFps = useRuntimeStore((state) => state.avgFps);
  const distanceMeters = useRuntimeStore((state) => state.distanceMeters);
  const resetRun = useRuntimeStore((state) => state.resetRun);
  const setPointerLocked = useRuntimeStore((state) => state.setPointerLocked);

  const graphicsPreset = useSettingsStore((state) => state.graphicsPreset);
  const mouseSensitivity = useSettingsStore((state) => state.mouseSensitivity);
  const telemetryEnabled = useSettingsStore((state) => state.telemetryEnabled);
  const graphics = getGraphicsConfig(graphicsPreset);
  const isDead = deathStartedAt !== null;
  const showDesktopOverlay = !mobileControlsEnabled && !pointerLocked && !isDead;
  const effectiveMobileForward = mobileControlsEnabled && !isDead && mobileForward;
  const effectiveMobileBackward = mobileControlsEnabled && !isDead && mobileBackward;

  useEffect(() => {
    resetRun([GAME_CONFIG.cellSize * 0.5, GAME_CONFIG.cellSize * 0.5]);
  }, [resetRun, seed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(pointer: coarse)");
    const updateMobileControls = () => {
      setMobileControlsEnabled(media.matches && window.innerWidth <= 1024);
    };
    updateMobileControls();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMobileControls);
    } else {
      media.addListener(updateMobileControls);
    }
    window.addEventListener("resize", updateMobileControls);
    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", updateMobileControls);
      } else {
        media.removeListener(updateMobileControls);
      }
      window.removeEventListener("resize", updateMobileControls);
    };
  }, []);

  const onPlayerCaught = useCallback(() => {
    setDeathStartedAt((current) => {
      if (current !== null) {
        return current;
      }
      return performance.now();
    });
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setPointerLocked(false);
  }, [setPointerLocked]);

  useEffect(() => {
    if (deathStartedAt === null) {
      return;
    }

    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - deathStartedAt;
      const progress = Math.min(1, elapsed / 5000);
      setDeathProgress(progress);
      if (progress >= 1) {
        router.push("/");
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [deathStartedAt, router]);

  useEffect(() => {
    runRef.current = { runId: null, startMs: performance.now() };

    if (!telemetryEnabled) {
      return;
    }

    let alive = true;
    void startTelemetryRun({
      seed,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }).then((runId) => {
      if (alive) {
        runRef.current.runId = runId;
      }
    });

    return () => {
      alive = false;
    };
  }, [seed, telemetryEnabled]);

  useEffect(() => {
    if (!telemetryEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      const runId = runRef.current.runId;
      if (!runId) {
        return;
      }
      const state = useRuntimeStore.getState();
      void pingTelemetry({
        runId,
        distanceMeters: state.distanceMeters,
        avgFps: state.avgFps,
        chunkCount: state.loadedChunkCount,
      });
    }, 12000);

    return () => {
      window.clearInterval(interval);
    };
  }, [telemetryEnabled]);

  useEffect(() => {
    if (!telemetryEnabled) {
      return;
    }

    const flushFinish = () => {
      const runId = runRef.current.runId;
      if (!runId) {
        return;
      }
      const state = useRuntimeStore.getState();
      const durationSeconds = (performance.now() - runRef.current.startMs) / 1000;
      runRef.current.runId = null;
      void finishTelemetry({
        runId,
        durationSeconds,
        distanceMeters: state.distanceMeters,
        avgFps: state.avgFps,
        chunkCount: state.loadedChunkCount,
      });
    };

    window.addEventListener("pagehide", flushFinish);
    return () => {
      window.removeEventListener("pagehide", flushFinish);
      flushFinish();
    };
  }, [telemetryEnabled]);

  const requestPointerLock = () => {
    if (isDead) {
      return;
    }
    const canvas = rootRef.current?.querySelector("canvas");
    if (!canvas) {
      return;
    }
    void canvas.requestPointerLock();
  };

  const restartRun = () => {
    if (isDead) {
      return;
    }
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setDeathStartedAt(null);
    setDeathProgress(0);
    setMobileForward(false);
    setMobileBackward(false);
    setSeed(createSessionSeed());
  };

  return (
    <main className="play-root" ref={rootRef}>
      <Canvas
        camera={{ far: 220, fov: 74, near: 0.1, position: [0, GAME_CONFIG.eyeHeight, 0] }}
        dpr={graphics.dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Scene
          disableGameplay={isDead}
          graphics={graphics}
          mobileBackward={effectiveMobileBackward}
          mobileControlsEnabled={mobileControlsEnabled}
          mobileForward={effectiveMobileForward}
          mobileThrowSignal={mobileThrowSignal}
          mouseSensitivityScalar={mouseSensitivity}
          onPlayerCaught={onPlayerCaught}
          seed={seed}
        />
      </Canvas>

      <Hud
        avgFps={avgFps}
        currentChunk={currentChunk}
        distanceMeters={distanceMeters}
        loadedChunkCount={loadedChunkCount}
        pointerLocked={pointerLocked}
        position={position}
        seed={seed}
      />

      {showDesktopOverlay && (
        <div className="overlay-center">
          <div className="overlay-card">
            <h2>Backrooms Session</h2>
            <p>Move with W/A/S/D, left-click to throw keyboards, ESC to unlock.</p>
            <div className="button-row" style={{ justifyContent: "center" }}>
              <button className="button" onClick={requestPointerLock} type="button">
                Enter
              </button>
              <button className="button secondary" onClick={restartRun} type="button">
                New Seed
              </button>
              <Link className="button secondary" href="/settings">
                Settings
              </Link>
              <Link className="button secondary" href="/">
                Menu
              </Link>
            </div>
          </div>
        </div>
      )}

      {mobileControlsEnabled && !isDead && (
        <div className="mobile-controls">
          <button
            className={`mobile-control-button${effectiveMobileForward ? " active" : ""}`}
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={() => setMobileForward(false)}
            onPointerDown={(event) => {
              event.preventDefault();
              setMobileForward(true);
            }}
            onPointerLeave={() => setMobileForward(false)}
            onPointerUp={() => setMobileForward(false)}
            type="button"
          >
            Walk
          </button>
          <button
            className={`mobile-control-button${effectiveMobileBackward ? " active" : ""}`}
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={() => setMobileBackward(false)}
            onPointerDown={(event) => {
              event.preventDefault();
              setMobileBackward(true);
            }}
            onPointerLeave={() => setMobileBackward(false)}
            onPointerUp={() => setMobileBackward(false)}
            type="button"
          >
            Back
          </button>
          <button
            className="mobile-control-button throw"
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              event.preventDefault();
              setMobileThrowSignal((signal) => signal + 1);
            }}
            type="button"
          >
            Throw
          </button>
        </div>
      )}

      {isDead && (
        <div
          className="overlay-center"
          style={{
            background: `rgba(120, 0, 0, ${0.08 + deathProgress * 0.62})`,
            transition: "background 120ms linear",
          }}
        >
          <div
            className="overlay-card"
            style={{
              background: "rgba(32, 0, 0, 0.66)",
              borderColor: "rgba(225, 90, 90, 0.9)",
            }}
          >
            <h2 style={{ color: "#ffb9b9" }}>You died</h2>
            <p style={{ color: "#ffd1d1" }}>Returning to main menu...</p>
          </div>
        </div>
      )}
    </main>
  );
}
