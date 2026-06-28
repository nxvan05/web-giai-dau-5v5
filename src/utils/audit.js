const prisma = require('./prisma');

async function logAction(action, detail) {
  try {
    await prisma.auditLog.create({ data: { action, detail: String(detail).slice(0, 500) } });
  } catch (e) {}
}

module.exports = { logAction };
