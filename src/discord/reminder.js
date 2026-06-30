const prisma = require('../utils/prisma');
const log = require('../utils/logger');

const remindedMatches = new Set();

async function checkAndRemind(discordBot) {
  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  const upcoming = await prisma.match.findMany({
    where: {
      scheduledAt: { not: null, lte: in30min, gte: now },
      status: 'pending',
    },
  });

  for (const match of upcoming) {
    if (remindedMatches.has(match.id)) continue;

    const scheduled = new Date(match.scheduledAt);
    const diff = Math.round((scheduled - now) / 60000);
    if (diff <= 0 || diff > 30) continue;

    remindedMatches.add(match.id);

    const players = await prisma.player.findMany({
      where: {
        OR: [{ teamId: match.team1Name }, { teamId: match.team2Name }],
      },
    });

    const msg = `⏰ **Nhắc nhở trận đấu!**\n\n⚔️ ${match.team1Name} vs ${match.team2Name}\n🕐 Còn ${diff} phút nữa (${scheduled.toLocaleString('vi-VN')})\n📌 Hãy check-in trên website để xác nhận tham gia!`;

    for (const player of players) {
      if (discordBot && discordBot.sendDM) {
        await discordBot.sendDM(player.discordId, msg);
      }
    }
  }
}

function startReminderLoop(discordBot) {
  checkAndRemind(discordBot);
  setInterval(() => checkAndRemind(discordBot), 5 * 60 * 1000);
  log.info('Discord reminder loop started');
}

module.exports = { startReminderLoop };
