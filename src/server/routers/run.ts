import { z } from "zod";

import { publicProcedure, router } from "@/server/trpc";

const runStartInput = z.object({
  seed: z.string().min(6).max(128),
  userAgent: z.string().max(512).optional(),
});

const runPingInput = z.object({
  runId: z.string().min(1),
  distanceMeters: z.number().min(0),
  avgFps: z.number().min(0).max(1000),
  chunkCount: z.number().int().min(0),
});

const runFinishInput = z.object({
  runId: z.string().min(1),
  durationSeconds: z.number().min(0),
  distanceMeters: z.number().min(0),
  avgFps: z.number().min(0).max(1000),
  chunkCount: z.number().int().min(0),
});

export const runRouter = router({
  start: publicProcedure.input(runStartInput).mutation(async ({ ctx, input }) => {
    if (!ctx.telemetryEnabled || !ctx.prisma) {
      return { ok: false as const, disabled: true as const };
    }

    const session = await ctx.prisma.runSession.create({
      data: {
        seed: input.seed,
        userAgent: input.userAgent,
      },
    });

    return { ok: true as const, runId: session.id };
  }),

  ping: publicProcedure.input(runPingInput).mutation(async ({ ctx, input }) => {
    if (!ctx.telemetryEnabled || !ctx.prisma) {
      return { ok: false as const, disabled: true as const };
    }

    await ctx.prisma.runMetricEvent.create({
      data: {
        runSessionId: input.runId,
        type: "ping",
        fps: input.avgFps,
        distanceMeters: input.distanceMeters,
        chunkCount: input.chunkCount,
      },
    });

    return { ok: true as const };
  }),

  finish: publicProcedure.input(runFinishInput).mutation(async ({ ctx, input }) => {
    if (!ctx.telemetryEnabled || !ctx.prisma) {
      return { ok: false as const, disabled: true as const };
    }

    await ctx.prisma.runSession.update({
      where: { id: input.runId },
      data: {
        finishedAt: new Date(),
        durationSeconds: input.durationSeconds,
        distanceMeters: input.distanceMeters,
        avgFps: input.avgFps,
        chunkCount: input.chunkCount,
      },
    });

    await ctx.prisma.runMetricEvent.create({
      data: {
        runSessionId: input.runId,
        type: "finish",
        fps: input.avgFps,
        distanceMeters: input.distanceMeters,
        chunkCount: input.chunkCount,
      },
    });

    return { ok: true as const };
  }),
});
