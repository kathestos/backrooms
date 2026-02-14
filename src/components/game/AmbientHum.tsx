"use client";

import { useEffect, useRef } from "react";

import { useRuntimeStore } from "@/lib/store/runtime-store";
import { useSettingsStore } from "@/lib/store/settings-store";

export default function AmbientHum() {
  const pointerLocked = useRuntimeStore((state) => state.pointerLocked);
  const masterVolume = useSettingsStore((state) => state.masterVolume);

  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRefs = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    if (!pointerLocked) {
      for (const oscillator of oscRefs.current) {
        try {
          oscillator.stop();
        } catch {
          // Oscillator can already be stopped.
        }
      }
      oscRefs.current = [];
      if (contextRef.current) {
        void contextRef.current.close();
        contextRef.current = null;
      }
      gainRef.current = null;
      return;
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    const context = new AudioCtor();
    const gainNode = context.createGain();
    gainNode.gain.value = masterVolume * 0.065;

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 520;
    lowPass.Q.value = 0.8;

    const oscA = context.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = 58;

    const oscB = context.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 116;

    oscA.connect(lowPass);
    oscB.connect(lowPass);
    lowPass.connect(gainNode);
    gainNode.connect(context.destination);

    oscA.start();
    oscB.start();

    contextRef.current = context;
    gainRef.current = gainNode;
    oscRefs.current = [oscA, oscB];

    return () => {
      for (const oscillator of oscRefs.current) {
        try {
          oscillator.stop();
        } catch {
          // Oscillator can already be stopped.
        }
      }
      oscRefs.current = [];
      if (contextRef.current) {
        void contextRef.current.close();
      }
      contextRef.current = null;
      gainRef.current = null;
    };
  }, [masterVolume, pointerLocked]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = masterVolume * 0.065;
    }
  }, [masterVolume]);

  return null;
}
