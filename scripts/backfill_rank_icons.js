const { PrismaClient } = require('@prisma/client');
const { fetchRankWithIcon } = require('../src/utils/henrik');
const prisma = new PrismaClient();

const REGIONS = ['ap', 'na', 'eu', 'kr'];

async function backfill() {
  const players = await prisma.player.findMany({
    where: { riotId: { not: 'Unknown#000' } }
  });
  const needUpdate = players.filter(p => !p.rankIconUrl);
  console.log(`Found ${players.length} total, ${needUpdate.length} need rank icons`);
  let done = 0, failed = 0;
  for (const p of needUpdate) {
    try {
      const parts = p.riotId.split('#');
      const name = parts[0];
      const tag = parts.slice(1).join('#');
      let data = null;
      // Thử từng region
      for (const region of REGIONS) {
        data = await fetchRankWithIcon(name, tag, region);
        if (data && data.iconUrl) break;
      }
      if (data && data.iconUrl) {
        await prisma.player.update({
          where: { id: p.id },
          data: {
            rankIconUrl: data.iconUrl,
            rankIconLarge: data.iconLarge || '',
            peakIconUrl: data.peakIconUrl || '',
            peakIconLarge: data.peakIconLarge || ''
          }
        });
        done++;
        console.log('  OK:', p.displayName, p.riotId, '->', data.rank);
      } else {
        failed++;
        console.log('  FAIL:', p.displayName, p.riotId);
      }
    } catch (e) {
      failed++;
      console.log('  ERROR:', p.displayName, p.riotId, e.message);
    }
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`Backfill complete: ${done} updated, ${failed} failed`);
  await prisma.$disconnect();
}
backfill();
