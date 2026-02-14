import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/trpc";

function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError({ error, path }) {
      // Keep payload small while preserving debug value in server logs.
      console.error(`tRPC failed on ${path ?? "<unknown>"}:`, error);
    },
  });
}

export { handler as GET, handler as POST };
