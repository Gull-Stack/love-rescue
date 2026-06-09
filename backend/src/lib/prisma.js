/**
 * Single shared PrismaClient for the whole backend.
 *
 * Previously several modules each did `new PrismaClient()`, and every client
 * opens its own DB connection pool (Prisma default ≈ cpus*2+1). Under a traffic
 * spike that multiplies connections and exhausts Railway Postgres's limit,
 * taking the app down. One shared client = one pool = predictable connections.
 *
 * Also applies content encryption (no-op unless CONTENT_ENCRYPTION + key set).
 */
const { PrismaClient } = require('@prisma/client');
const { withContentEncryption } = require('./contentEncryption');

// Reuse across hot-reloads / repeated requires.
const globalForPrisma = global;

const prisma =
  globalForPrisma.__lovePrisma ||
  withContentEncryption(
    new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error'],
    })
  );

if (!globalForPrisma.__lovePrisma) {
  globalForPrisma.__lovePrisma = prisma;
}

module.exports = prisma;
