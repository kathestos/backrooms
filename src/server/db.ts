import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.prismaClient) {
    globalThis.prismaClient = new PrismaClient();
  }
  return globalThis.prismaClient;
}
