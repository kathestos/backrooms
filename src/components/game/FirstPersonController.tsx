"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

import { resolveCollisions } from "@/lib/physics/collision";
import { useRuntimeStore } from "@/lib/store/runtime-store";
import type { CollisionBox } from "@/lib/types/game";

interface FirstPersonControllerProps {
  colliders: CollisionBox[];
  movementSpeed: number;
  mouseSensitivity: number;
  playerRadius: number;
  eyeHeight: number;
  disabled?: boolean;
}

const keyMap: Record<string, "w" | "a" | "s" | "d"> = {
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
};

export default function FirstPersonController({
  colliders,
  movementSpeed,
  mouseSensitivity,
  playerRadius,
  eyeHeight,
  disabled = false,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const cameraRef = useRef(camera);
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const move = useRef(new Vector3());

  const setPointerLocked = useRuntimeStore((state) => state.setPointerLocked);
  const setRotation = useRuntimeStore((state) => state.setRotation);
  const stepTo = useRuntimeStore((state) => state.stepTo);
  const setVelocity = useRuntimeStore((state) => state.setVelocity);
  const pushFps = useRuntimeStore((state) => state.pushFps);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const doc = canvas.ownerDocument;

    const onKey = (event: KeyboardEvent, value: boolean) => {
      const mapped = keyMap[event.code];
      if (mapped) {
        keysRef.current[mapped] = value;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => onKey(event, true);
    const onKeyUp = (event: KeyboardEvent) => onKey(event, false);

    const onMouseMove = (event: MouseEvent) => {
      if (disabled) {
        return;
      }
      if (doc.pointerLockElement !== canvas) {
        return;
      }
      const runtime = useRuntimeStore.getState();
      const yaw = runtime.yaw - event.movementX * mouseSensitivity;
      const pitch = Math.min(1.45, Math.max(-1.45, runtime.pitch - event.movementY * mouseSensitivity));
      setRotation(yaw, pitch);
    };

    const onPointerLockChange = () => {
      setPointerLocked(doc.pointerLockElement === canvas);
    };

    const onCanvasClick = () => {
      if (disabled) {
        return;
      }
      if (doc.pointerLockElement !== canvas) {
        void canvas.requestPointerLock();
      }
    };

    doc.addEventListener("keydown", onKeyDown);
    doc.addEventListener("keyup", onKeyUp);
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("click", onCanvasClick);

    return () => {
      doc.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("keyup", onKeyUp);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("click", onCanvasClick);
    };
  }, [disabled, gl.domElement, mouseSensitivity, setPointerLocked, setRotation]);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const runtime = useRuntimeStore.getState();
    const { position, yaw, pitch, pointerLocked } = runtime;
    const activeCamera = cameraRef.current;

    activeCamera.rotation.order = "YXZ";
    activeCamera.rotation.set(pitch, yaw, 0);
    activeCamera.position.set(position[0], eyeHeight, position[1]);

    if (disabled || !pointerLocked) {
      setVelocity([0, 0]);
      if (dt > 0) {
        pushFps(1 / dt);
      }
      return;
    }

    const vertical = (keysRef.current.w ? 1 : 0) - (keysRef.current.s ? 1 : 0);
    const horizontal = (keysRef.current.d ? 1 : 0) - (keysRef.current.a ? 1 : 0);

    activeCamera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() < 1e-6) {
      forward.current.set(0, 0, -1);
    } else {
      forward.current.normalize();
    }

    // Right vector in XZ plane so A/D stays strafe relative to current look direction.
    right.current.set(-forward.current.z, 0, forward.current.x).normalize();

    move.current.copy(forward.current).multiplyScalar(vertical);
    move.current.addScaledVector(right.current, horizontal);

    if (move.current.lengthSq() > 1) {
      move.current.normalize();
    }

    const velocityX = move.current.x * movementSpeed;
    const velocityZ = move.current.z * movementSpeed;
    const target: [number, number] = [position[0] + velocityX * dt, position[1] + velocityZ * dt];
    const resolved = resolveCollisions(target, playerRadius, colliders);

    setVelocity([velocityX, velocityZ]);
    stepTo(resolved);
    activeCamera.position.set(resolved[0], eyeHeight, resolved[1]);

    if (dt > 0) {
      pushFps(1 / dt);
    }
  });

  return null;
}
