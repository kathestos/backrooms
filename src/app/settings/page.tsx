"use client";

import Link from "next/link";

import type { GraphicsPreset } from "@/lib/types/game";
import { useSettingsStore } from "@/lib/store/settings-store";

const PRESETS: GraphicsPreset[] = ["low", "default", "heavy_vhs"];

export default function SettingsPage() {
  const {
    graphicsPreset,
    mouseSensitivity,
    masterVolume,
    telemetryEnabled,
    setGraphicsPreset,
    setMouseSensitivity,
    setMasterVolume,
    setTelemetryEnabled,
  } = useSettingsStore();

  return (
    <main className="page-shell">
      <section className="panel">
        <h1 className="title">Settings</h1>
        <p className="subtitle">
          Tune visual intensity and controls. Gameplay stays fully client-side even if telemetry is off.
        </p>

        <div className="settings-grid">
          <article className="setting-card">
            <span className="setting-label">Graphics Preset</span>
            <div className="setting-row">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`button ${graphicsPreset === preset ? "" : "secondary"}`}
                  onClick={() => setGraphicsPreset(preset)}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>
          </article>

          <article className="setting-card">
            <span className="setting-label">Mouse Sensitivity ({mouseSensitivity.toFixed(2)}x)</span>
            <input
              max={2}
              min={0.35}
              onChange={(event) => setMouseSensitivity(Number(event.target.value))}
              step={0.05}
              type="range"
              value={mouseSensitivity}
            />
          </article>

          <article className="setting-card">
            <span className="setting-label">Ambient Hum Volume ({Math.round(masterVolume * 100)}%)</span>
            <input
              max={1}
              min={0}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
              step={0.01}
              type="range"
              value={masterVolume}
            />
          </article>

          <article className="setting-card">
            <span className="setting-label">Telemetry</span>
            <div className="setting-row">
              <button
                className={`button ${telemetryEnabled ? "" : "secondary"}`}
                onClick={() => setTelemetryEnabled(!telemetryEnabled)}
                type="button"
              >
                {telemetryEnabled ? "Enabled" : "Disabled"}
              </button>
              <span className="subtitle">
                Backend writes only run stats (seed, duration, distance, fps, chunks).
              </span>
            </div>
          </article>
        </div>

        <div className="button-row">
          <Link className="button" href="/play">
            Return To Game
          </Link>
          <Link className="button secondary" href="/">
            Main Menu
          </Link>
        </div>
      </section>
    </main>
  );
}
