import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import { getPrismaClient } from "@/server/db";
import { isTelemetryEnabledServer } from "@/server/env";

export interface TRPCContext {
  telemetryEnabled: boolean;
  prisma: ReturnType<typeof getPrismaClient> | null;
  request: Request;
}

export async function createTRPCContext(opts: { req: Request }): Promise<TRPCContext> {
  const telemetryEnabled = isTelemetryEnabledServer();
  return {
    telemetryEnabled,
    prisma: telemetryEnabled ? getPrismaClient() : null,
    request: opts.req,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
