const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');

const orAuth = require('../middleware/orAuth');

const MAP_LIST = ['summit','breeze','ascent','haven','split','sunset','icebox','lotus'];
const VETO_PHASES = [
  { team: 1, action: 'ban', label: 'Cấm map' },
  { team: 2, action: 'ban', label: 'Cấm map' },
  { team: 1, action: 'pick', label: 'Chọn map (Ván 1)' },
  { team: 2, action: 'pick', label: 'Chọn map (Ván 2)' },
  { team: 1, action: 'ban', label: 'Cấm map' },
  { team: 2, action: 'ban', label: 'Cấm map' },
  { team: 0, action: 'decider', label: 'Ván 3 (Decider) — map còn lại' }
];

async function getVeto(matchId) {
  const entry = await prisma.setting.findUnique({ where: { key: 'veto_' + matchId } });
  if (!entry) return null;
  return JSON.parse(entry.value);
}

async function saveVeto(matchId, data) {
  await prisma.setting.upsert({
    where: { key: 'veto_' + matchId },
    update: { value: JSON.stringify(data) },
    create: { key: 'veto_' + matchId, value: JSON.stringify(data) }
  });
}

function getCurrentPhase(veto) {
  if (veto.phase >= VETO_PHASES.length) return null;
  return VETO_PHASES[veto.phase];
}

async function checkCaptain(matchId, discordId, teamNum) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return false;
  const teamName = teamNum === 1 ? match.team1Name : match.team2Name;
  if (!teamName) return false;
  const team = await prisma.team.findFirst({ where: { name: teamName } });
  if (!team) return false;
  return team.captainDiscordId === discordId;
}

// GET /api/veto/:matchId — get veto state (no auth needed)
router.get('/:matchId', async (req, res, next) => {
  try {
    const veto = await getVeto(req.params.matchId);
    res.json(veto || { phase: 0, maps: {}, matchId: req.params.matchId, log: [], active: false });
  } catch (e) { next(e); }
});

// POST /api/veto/:matchId/init — start a veto session (captain or admin)
router.post('/:matchId/init', orAuth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const existing = await getVeto(matchId);
    if (existing && existing.active) return res.status(400).json({ error: 'VETO đã bắt đầu' });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match không tồn tại' });

    const veto = {
      matchId,
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      phase: 0,
      maps: Object.fromEntries(MAP_LIST.map(m => [m, 'active'])),
      log: [],
      active: true
    };
    await saveVeto(matchId, veto);
    const io = getIO();
    if (io) io.to('veto-' + matchId).emit('veto:update', veto);
    res.json(veto);
  } catch (e) { next(e); }
});

// POST /api/veto/:matchId/action — perform ban/pick/decider
router.post('/:matchId/action', orAuth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { mapName } = req.body;
    if (!mapName || !MAP_LIST.includes(mapName)) return res.status(400).json({ error: 'Map không hợp lệ' });

    const veto = await getVeto(matchId);
    if (!veto || !veto.active) return res.status(400).json({ error: 'VETO chưa bắt đầu' });
    if (veto.phase >= VETO_PHASES.length) return res.status(400).json({ error: 'VETO đã kết thúc' });
    if ((veto.maps[mapName] || 'active') !== 'active') return res.status(400).json({ error: 'Map này đã được chọn/cấm' });

    const phase = getCurrentPhase(veto);
    if (!phase) return res.status(400).json({ error: 'Không có phase hiện tại' });

    // Verify permission: admin or captain of the correct team
    const isAdmin = !!req.user;
    if (!isAdmin) {
      const discordId = req.discordUser?.discordId;
      const allowedAsTeam1 = (phase.team === 1 || phase.team === 0) && await checkCaptain(matchId, discordId, 1);
      const allowedAsTeam2 = (phase.team === 2 || phase.team === 0) && await checkCaptain(matchId, discordId, 2);
      if (!discordId || (!allowedAsTeam1 && !allowedAsTeam2)) {
        return res.status(403).json({ error: 'Bạn không phải đội trưởng của đội được phép hành động lúc này' });
      }
    }

    const newState = phase.action === 'ban' ? 'ban' : phase.action === 'pick' ? (phase.team === 1 ? 'pick1' : 'pick2') : 'decider';
    veto.maps[mapName] = newState;
    veto.log.push({ phase: veto.phase, map: mapName, action: phase.action, team: phase.team, at: new Date().toISOString() });
    veto.phase++;

    // Check if veto is complete
    if (veto.phase >= VETO_PHASES.length) {
      veto.active = false;
      const pickedMaps = MAP_LIST.filter(m => veto.maps[m] === 'pick1' || veto.maps[m] === 'pick2');
      const decider = MAP_LIST.find(m => veto.maps[m] === 'decider');
      // Save map to match record
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (match) {
        const mapStr = pickedMaps.join(', ') + (decider ? ', ' + decider : '');
        await prisma.match.update({ where: { id: matchId }, data: { map: mapStr } });
      }
    }

    await saveVeto(matchId, veto);
    const io = getIO();
    if (io) io.to('veto-' + matchId).emit('veto:update', veto);
    res.json(veto);
  } catch (e) { next(e); }
});

// POST /api/veto/:matchId/reset — reset veto (admin only)
router.post('/:matchId/reset', auth, async (req, res, next) => {
  try {
    await prisma.setting.deleteMany({ where: { key: 'veto_' + req.params.matchId } });
    const io = getIO();
    if (io) io.to('veto-' + req.params.matchId).emit('veto:reset', { matchId: req.params.matchId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
