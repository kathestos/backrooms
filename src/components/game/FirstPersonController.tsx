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
  mobileControlsEnabled?: boolean;
  mobileForward?: boolean;
  mobileBackward?: boolean;
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
  mobileControlsEnabled = false,
  mobileForward = false,
  mobileBackward = false,
  disabled = false,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const cameraRef = useRef(camera);
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const lookTouchIdRef = useRef<number | null>(null);
  const lookTouchPointRef = useRef<{ x: number; y: number } | null>(null);
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
      if (mobileControlsEnabled) {
        return;
      }
      if (doc.pointerLockElement !== canvas) {
        void canvas.requestPointerLock();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (disabled || !mobileControlsEnabled || lookTouchIdRef.current !== null) {
        return;
      }
      const touch = event.changedTouches.item(0);
      if (!touch) {
        return;
      }
      lookTouchIdRef.current = touch.identifier;
      lookTouchPointRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (disabled || !mobileControlsEnabled) {
        return;
      }
      const activeTouchId = lookTouchIdRef.current;
      const previousPoint = lookTouchPointRef.current;
      if (activeTouchId === null || !previousPoint) {
        return;
      }

      let activeTouch: Touch | null = null;
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        const candidate = event.changedTouches.item(i);
        if (candidate && candidate.identifier === activeTouchId) {
          activeTouch = candidate;
          break;
        }
      }

      if (!activeTouch) {
        return;
      }

      const deltaX = activeTouch.clientX - previousPoint.x;
      const deltaY = activeTouch.clientY - previousPoint.y;
      lookTouchPointRef.current = { x: activeTouch.clientX, y: activeTouch.clientY };

      const runtime = useRuntimeStore.getState();
      const yaw = runtime.yaw + deltaX * mouseSensitivity;
      const pitch = Math.min(1.45, Math.max(-1.45, runtime.pitch + deltaY * mouseSensitivity));
      setRotation(yaw, pitch);
      event.preventDefault();
    };

    const releaseTouchLook = (event: TouchEvent) => {
      const activeTouchId = lookTouchIdRef.current;
      if (activeTouchId === null) {
        return;
      }
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        const candidate = event.changedTouches.item(i);
        if (candidate && candidate.identifier === activeTouchId) {
          lookTouchIdRef.current = null;
          lookTouchPointRef.current = null;
          return;
        }
      }
    };

    doc.addEventListener("keydown", onKeyDown);
    doc.addEventListener("keyup", onKeyUp);
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", releaseTouchLook);
    canvas.addEventListener("touchcancel", releaseTouchLook);

    return () => {
      doc.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("keyup", onKeyUp);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", releaseTouchLook);
      canvas.removeEventListener("touchcancel", releaseTouchLook);
    };
  }, [disabled, gl.domElement, mobileControlsEnabled, mouseSensitivity, setPointerLocked, setRotation]);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const runtime = useRuntimeStore.getState();
    const { position, yaw, pitch, pointerLocked } = runtime;
    const movementEnabled = pointerLocked || mobileControlsEnabled;
    const activeCamera = cameraRef.current;

    activeCamera.rotation.order = "YXZ";
    activeCamera.rotation.set(pitch, yaw, 0);
    activeCamera.position.set(position[0], eyeHeight, position[1]);

    if (disabled || !movementEnabled) {
      setVelocity([0, 0]);
      if (dt > 0) {
        pushFps(1 / dt);
      }
      return;
    }

    const keyboardVertical = (keysRef.current.w ? 1 : 0) - (keysRef.current.s ? 1 : 0);
    const mobileVertical = (mobileForward ? 1 : 0) - (mobileBackward ? 1 : 0);
    const vertical = Math.max(-1, Math.min(1, keyboardVertical + mobileVertical));
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
