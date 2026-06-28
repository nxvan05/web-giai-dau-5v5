const prisma = require('../utils/prisma');

async function sendEmbed(webhookURL, embed) {
  try {
    await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (e) {
    console.error('Webhook error:', e.message);
  }
}

async function getWebhookURL() {
  const setting = await prisma.setting.findUnique({ where: { key: 'webhook_url' } });
  return setting?.value || null;
}

exports.notifyPlayerRegistered = async (player) => {
  const url = await getWebhookURL();
  if (!url) return;
  await sendEmbed(url, {
    title: '📥 Đăng ký mới',
    color: 0xff4655,
    fields: [
      { name: 'Tên', value: player.displayName || 'N/A', inline: true },
      { name: 'Discord', value: player.discordId || 'N/A', inline: true },
      { name: 'Riot ID', value: player.riotId || 'N/A', inline: true },
      { name: 'Rank', value: player.rank || 'N/A', inline: true },
      { name: 'Vai trò', value: player.role || 'N/A', inline: true },
      { name: 'Điểm', value: player.pts + 'đ', inline: true }
    ],
    footer: { text: 'Evan Cup • ' + new Date().toLocaleString('vi-VN') },
    timestamp: new Date().toISOString()
  });
};

exports.notifyMatchResult = async (match) => {
  const url = await getWebhookURL();
  if (!url) return;
  const winner = match.winner ? `**${match.winner}**` : 'Hòa';
  await sendEmbed(url, {
    title: '🏆 Kết quả trận đấu',
    color: 0x00f2fe,
    fields: [
      { name: 'Đội 1', value: match.team1Name, inline: true },
      { name: 'Đội 2', value: match.team2Name, inline: true },
      { name: 'Tỉ số', value: `${match.score1} - ${match.score2}`, inline: true },
      { name: 'Người thắng', value: winner, inline: false },
      { name: 'Map', value: match.map || 'N/A', inline: true }
    ],
    footer: { text: 'Evan Cup • ' + new Date().toLocaleString('vi-VN') },
    timestamp: new Date().toISOString()
  });
};

exports.notifyTeamDraft = async (team1, team2) => {
  const url = await getWebhookURL();
  if (!url) return;
  const t1 = team1.map(p => `${p.displayName || p.discord || '?'} (${p.pts}đ)`).join('\n');
  const t2 = team2.map(p => `${p.displayName || p.discord || '?'} (${p.pts}đ)`).join('\n');
  await sendEmbed(url, {
    title: '⚔️ Chia đội hoàn tất',
    color: 0xeab308,
    fields: [
      { name: '🔵 Team Cyan', value: t1 || 'Trống', inline: true },
      { name: '🔴 Team Red', value: t2 || 'Trống', inline: true }
    ],
    footer: { text: 'Evan Cup • ' + new Date().toLocaleString('vi-VN') },
    timestamp: new Date().toISOString()
  });
};

exports.sendWebhook = async (req, res) => {
  const { action, player } = req.body;
  const webhookURL = await getWebhookURL();
  if (!webhookURL) return res.status(400).json({ error: 'Webhook not configured' });
  try {
    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `📥 ${action}`,
          color: 0xff4655,
          fields: [
            { name: 'Tên hiển thị', value: player?.displayName || 'N/A', inline: true },
            { name: 'UID Discord', value: player?.discordId || 'N/A', inline: true },
            { name: 'Riot ID', value: player?.riotId || 'N/A', inline: true },
            { name: 'Rank', value: player?.rank || 'N/A', inline: true },
            { name: 'Vai trò', value: player?.role || 'N/A', inline: true },
            { name: 'Hình thức', value: player?.type || 'Solo', inline: true },
            { name: 'Điểm', value: (player?.pts || 0) + 'đ', inline: false }
          ],
          footer: { text: 'Evan Cup Admin • ' + new Date().toLocaleString('vi-VN') },
          timestamp: new Date().toISOString()
        }]
      })
    });
    if (response.ok) res.json({ message: 'Webhook sent' });
    else res.status(500).json({ error: 'Failed to send webhook' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};