import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { GraphicsPreset } from "@/lib/types/game";

interface SettingsState {
  graphicsPreset: GraphicsPreset;
  mouseSensitivity: number;
  masterVolume: number;
  telemetryEnabled: boolean;
  setGraphicsPreset: (preset: GraphicsPreset) => void;
  setMouseSensitivity: (value: number) => void;
  setMasterVolume: (value: number) => void;
  setTelemetryEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      graphicsPreset: "default",
      mouseSensitivity: 1,
      masterVolume: 0.45,
      telemetryEnabled: true,
      setGraphicsPreset: (graphicsPreset) => set({ graphicsPreset }),
      setMouseSensitivity: (mouseSensitivity) => set({ mouseSensitivity }),
      setMasterVolume: (masterVolume) => set({ masterVolume }),
      setTelemetryEnabled: (telemetryEnabled) => set({ telemetryEnabled }),
    }),
    {
      name: "backrooms-settings-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
