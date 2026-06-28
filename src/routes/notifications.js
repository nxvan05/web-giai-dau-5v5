const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

async function getWebhookURL() {
  const setting = await prisma.setting.findUnique({ where: { key: 'webhook_url' } });
  return setting?.value || null;
}

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

router.post('/send-notification', auth,
  body('message').trim().notEmpty().withMessage('Message is required'),
  validate,
  async (req, res) => {
  try {
    const { playerId, playerName, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const target = playerId || 'ALL_PLAYERS';
    const displayTarget = playerName || (playerId ? playerId : 'Tất cả người chơi');
    await prisma.auditLog.create({
      data: {
        action: `NOTIFY: ${displayTarget}`,
        detail: message
      }
    });
    const url = await getWebhookURL();
    if (url) {
      await sendEmbed(url, {
        title: '📢 Thông báo từ Admin',
        description: message,
        color: 0xFFA500,
        footer: { text: target === 'ALL_PLAYERS' ? 'Gửi đến tất cả' : `Gửi đến: ${displayTarget}` },
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', auth, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: { startsWith: 'NOTIFY:' } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
