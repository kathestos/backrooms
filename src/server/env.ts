export function isTelemetryEnabledServer(): boolean {
  return process.env.ENABLE_TELEMETRY === "true";
}
