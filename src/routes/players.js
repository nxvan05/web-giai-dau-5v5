const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const pc = require('../controllers/playerController');

router.get('/', auth, pc.getAll);
router.get('/profile/:discordId', pc.getProfile);

// Get own profile (Discord JWT required)
router.get('/me', discordAuth, async (req, res, next) => {
  try {
    const discordId = req.discordUser.discordId;
    const player = await prisma.player.findFirst({ where: { discordId } });
    if (!player) return res.status(404).json({ error: 'Bạn chưa đăng ký tham gia giải' });
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }] },
      orderBy: { scheduledAt: 'desc' }, take: 20
    });
    const matchHistory = matches.map(m => ({
      id: m.id, team1Name: m.team1Name, team2Name: m.team2Name,
      score1: m.score1, score2: m.score2, winner: m.winner,
      map: m.map, status: m.status, scheduledAt: m.scheduledAt,
      isTeam1: m.team1Name === player.teamId,
      result: m.winner ? (m.winner === player.teamId ? 'win' : 'loss') : 'pending'
    }));
    const stats = await prisma.matchPlayerStat.aggregate({
      where: { playerDiscordId: discordId },
      _sum: { kills: true, deaths: true, assists: true }
    });
    const eloHistory = await prisma.eloHistory.findMany({
      where: { playerDiscordId: discordId },
      orderBy: { createdAt: 'asc' }, take: 30
    });
    const team = player.teamId ? await prisma.team.findUnique({ where: { name: player.teamId } }) : null;
    res.json({
      player, team,
      matchHistory, eloHistory,
      kda: { kills: stats._sum.kills || 0, deaths: stats._sum.deaths || 0, assists: stats._sum.assists || 0 }
    });
  } catch (e) { next(e); }
});

// Update own profile (Discord JWT required) — rank locked once set
router.put('/me', discordAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','riotId','rank','role'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('Ít nhất 1 trường: displayName, riotId, rank, role');
    return true;
  }),
  validate,
  async (req, res, next) => {
    try {
      const discordId = req.discordUser.discordId;
      const player = await prisma.player.findFirst({ where: { discordId } });
      if (!player) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
      const { displayName, riotId, rank, role } = req.body;
      const data = {};
      if (displayName !== undefined) data.displayName = displayName;
      if (riotId !== undefined) data.riotId = riotId;
      // Rank locked: if player already has a rank, ignore rank changes
      if (rank !== undefined && (!player.rank || player.rank === 'Unranked')) data.rank = rank;
      if (role !== undefined) data.role = role;
      const updated = await prisma.player.update({ where: { id: player.id }, data });
      res.json(updated);
    } catch (e) { next(e); }
  }
);

function orAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  const discord = req.cookies?.discord_token;
  const jwt = require('jsonwebtoken');
  try { if (token) { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); } } catch(_) {}
  try { if (discord) { const d = jwt.verify(discord, process.env.JWT_SECRET); if (d.type === 'discord') { req.discordUser = d; return next(); } } } catch(_) {}
  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
}

router.post('/', orAuth,
  body('displayName').trim().notEmpty().withMessage('Display name required'),
  body('riotId').trim().notEmpty().withMessage('Riot ID required'),
  validate,
  pc.create
);

router.put('/:id', orAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.patch('/:id', orAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.delete('/:id', auth, pc.delete);

router.get('/lookup/:discordId', async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.params.discordId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (e) { next(e); }
});

router.post('/batch-lookup', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const players = await prisma.player.findMany({ where: { discordId: { in: ids } } });
    const map = {};
    for (const p of players) map[p.discordId] = p;
    res.json(map);
  } catch (e) { next(e); }
});

router.get('/free-agents', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: null },
      orderBy: { elo: 'desc' }
    });
    res.json(players);
  } catch (e) { next(e); }
});

router.get('/by-team/:teamName', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: req.params.teamName }
    });
    res.json(players);
  } catch (e) { next(e); }
});

// Refresh rank from HenrikDev API
router.post('/refresh-rank', discordAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.discordUser.discordId } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    if (!player.riotId || player.riotId === 'Unknown#000') return res.status(400).json({ error: 'Chưa có Riot ID' });
    const parts = player.riotId.split('#');
    const name = encodeURIComponent(parts[0]);
    const tag = encodeURIComponent(parts.slice(1).join('#'));
    const https = require('https');
    const mmrData = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.henrikdev.xyz', path: `/valorant/v2/mmr/ap/${name}/${tag}`,
        headers: { 'Authorization': process.env.HENRIKDEV_KEY || '' }
      };
      https.get(opts, resp => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => { try { const j = JSON.parse(d); if (j.status === 200) resolve(j.data); else reject(new Error(j.errors?.[0]?.message || 'Lỗi API')); } catch(e) { reject(new Error('Không parse được dữ liệu')); } }); }).on('error', reject);
    });
    const currentRank = mmrData.current_data?.currenttierpatched || null;
    const peakRank = mmrData.highest_rank?.patched_tier || null;
    const newRank = currentRank || peakRank || 'Unknown';
    await prisma.player.update({ where: { id: player.id }, data: { rank: newRank, peakRank: peakRank || player.peakRank } });
    res.json({ rank: newRank, peakRank, currentRank });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/import', auth, async (req, res, next) => {
  try {
    const { players } = req.body;
    if (!Array.isArray(players)) return res.status(400).json({ error: 'players array required' });
    let imported = 0;
    const errors = [];
    for (const p of players) {
      if (!p.discordId || !p.displayName) { errors.push({ discordId: p.discordId, error: 'Missing required fields' }); continue; }
      const existing = await prisma.player.findFirst({ where: { discordId: p.discordId } });
      if (existing) { errors.push({ discordId: p.discordId, error: 'Duplicate' }); continue; }
      await prisma.player.create({
        data: {
          displayName: p.displayName,
          discordId: p.discordId,
          riotId: p.riotId || 'Unknown#000',
          rank: p.rank || 'Silver (Bạc)',
          role: p.role || 'Flex',
          type: p.type || 'Solo',
          pts: parseInt(p.pts) || 3
        }
      });
      imported++;
    }
    res.json({ imported, errors });
  } catch (e) { next(e); }
});

module.exports = router;
