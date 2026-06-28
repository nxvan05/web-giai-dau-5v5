const prisma = require('./prisma');

async function getWebhookURL() {
  const setting = await prisma.setting.findUnique({ where: { key: 'webhook_url' } });
  return setting?.value || null;
}

async function sendEmbed(webhookURL, embed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('Webhook error:', e.message);
    }
  }
}

async function checkAndRemind() {
  const url = await getWebhookURL();
  if (!url) return;

  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  const upcoming = await prisma.match.findMany({
    where: {
      scheduledAt: { not: null, lte: in30min, gte: now },
      status: 'pending'
    }
  });

  for (const match of upcoming) {
    const scheduled = new Date(match.scheduledAt);
    const diff = Math.round((scheduled - now) / 60000);
    if (diff > 0 && diff <= 30) {
      await sendEmbed(url, {
        title: '⏰ Trận đấu sắp diễn ra!',
        color: 0x00f2fe,
        fields: [
          { name: 'Trận đấu', value: `${match.team1Name} vs ${match.team2Name}`, inline: false },
          { name: 'Thời gian', value: scheduled.toLocaleString('vi-VN'), inline: true },
          { name: 'Còn', value: `${diff} phút`, inline: true }
        ],
        footer: { text: 'Evan Cup • Nhắc nhở tự động' },
        timestamp: new Date().toISOString()
      });
    }
  }
}

function startReminderLoop() {
  checkAndRemind();
  setInterval(checkAndRemind, 5 * 60 * 1000);
}

module.exports = { startReminderLoop };
