const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  if (duration > 5000) {
    console.warn(`[SLOW QUERY] ${params.model}.${params.action} took ${duration}ms`);
  }
  return result;
});

module.exports = prisma;
