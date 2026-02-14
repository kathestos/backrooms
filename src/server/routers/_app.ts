import { runRouter } from "@/server/routers/run";
import { router } from "@/server/trpc";

export const appRouter = router({
  run: runRouter,
});

export type AppRouter = typeof appRouter;
