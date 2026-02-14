"use client";

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@/server/routers/_app";

interface StartRunInput {
  seed: string;
  userAgent?: string;
}

interface MetricsInput {
  runId: string;
  durationSeconds: number;
  distanceMeters: number;
  avgFps: number;
  chunkCount: number;
}

function baseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function telemetryClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TELEMETRY === "true";
}

const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${baseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

export async function startTelemetryRun(input: StartRunInput): Promise<string | null> {
  if (!telemetryClientEnabled()) {
    return null;
  }

  try {
    const result = await trpcClient.run.start.mutate(input);
    return result.ok ? result.runId : null;
  } catch {
    return null;
  }
}

export async function pingTelemetry(input: Omit<MetricsInput, "durationSeconds">): Promise<void> {
  if (!telemetryClientEnabled()) {
    return;
  }

  try {
    await trpcClient.run.ping.mutate({
      runId: input.runId,
      distanceMeters: input.distanceMeters,
      avgFps: input.avgFps,
      chunkCount: input.chunkCount,
    });
  } catch {
    // Non-blocking by design.
  }
}

export async function finishTelemetry(input: MetricsInput): Promise<void> {
  if (!telemetryClientEnabled()) {
    return;
  }

  try {
    await trpcClient.run.finish.mutate(input);
  } catch {
    // Non-blocking by design.
  }
}
