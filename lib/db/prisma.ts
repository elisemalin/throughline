// Prisma client singleton.
//
// WHY: Next.js dev mode hot-reloads route handlers, which would otherwise
// instantiate a fresh PrismaClient on every change and exhaust the database
// connection pool. Pinning the client to globalThis keeps a single instance
// across HMR reloads in development while production gets a fresh module
// instance per server boot.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
