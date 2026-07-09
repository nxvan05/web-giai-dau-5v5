const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const all = await prisma.player.findMany({ select: { id: true, displayName: true, rankIconUrl: true, riotId: true } });
  console.log('Total players:', all.length);
  const withoutIcon = all.filter(p => !p.rankIconUrl);
  console.log('Without rankIconUrl:', withoutIcon.length);
  console.log('With icon:', all.filter(p => p.rankIconUrl).length);
  withoutIcon.slice(0, 5).forEach(p => console.log('  ', p.displayName, p.riotId, JSON.stringify(p.rankIconUrl)));
  await prisma.$disconnect();
})();
