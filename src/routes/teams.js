const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const { getTeams, updateTeams, listAll, createTeam, approveTeam, rejectTeam, saveKDA, getKDA } = require('../controllers/teamController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const prisma = require('../utils/prisma');

// Old auto-draft routes (auth required)
router.get('/', auth, getTeams);
router.put('/', auth, updateTeams);

// New team registration (create is public, list/approve/reject need auth)
router.get('/all', listAll);
router.post('/', discordAuth,
  body('name').trim().notEmpty().withMessage('Team name required'),
  validate,
  createTeam
);
router.put('/:id/approve', auth, approveTeam);
router.put('/:id/reject', auth, rejectTeam);
router.delete('/:id', auth, async (req, res) => {
  try {
    const prisma = require('../utils/prisma');
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    await prisma.team.delete({ where: { id: req.params.id } });
    const { createAudit } = require('../utils/audit');
    await createAudit(`Giải tán đội: ${team.name}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Team detail with roster + matches
router.get('/detail/:name', async (req, res, next) => {
  try {
    const team = await prisma.team.findFirst({ where: { name: req.params.name } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const roster = await prisma.player.findMany({ where: { teamId: team.name }, orderBy: { elo: 'desc' } });
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: team.name }, { team2Name: team.name }] },
      orderBy: { scheduledAt: 'desc' }, take: 20
    });
    const matchHistory = matches.map(m => {
      const isTeam1 = m.team1Name === team.name;
      return { id: m.id, team1Name: m.team1Name, team2Name: m.team2Name, score1: m.score1, score2: m.score2, winner: m.winner, map: m.map, status: m.status, scheduledAt: m.scheduledAt, isTeam1, result: m.winner ? (m.winner === team.name ? 'win' : 'loss') : 'pending' };
    });
    const wins = matchHistory.filter(m => m.result === 'win').length;
    const losses = matchHistory.filter(m => m.result === 'loss').length;
    const captainPlayer = await prisma.player.findFirst({ where: { discordId: team.captainDiscordId } });
    res.json({ team, roster, matchHistory, wins, losses, captain: captainPlayer || null });
  } catch (e) { next(e); }
});

// === Captain Team Management (Discord auth required) ===
// Kick a player from team (captain only)
router.delete('/:name/players/:discordId', discordAuth, async (req, res, next) => {
  try {
    const { name, discordId } = req.params;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.captainDiscordId !== req.discordUser.discordId) return res.status(403).json({ error: 'Chỉ đội trưởng mới có quyền' });
    if (discordId === team.captainDiscordId) return res.status(400).json({ error: 'Không thể kick chính mình — hãy dùng "Rời đội"' });
    await prisma.player.update({ where: { discordId }, data: { teamId: null } }).catch(() => {});
    // update roster
    const roster = JSON.parse(team.rosterJson || '[]');
    const filtered = roster.filter(id => id !== discordId);
    await prisma.team.update({ where: { id: team.id }, data: { rosterJson: JSON.stringify(filtered) } });
    res.json({ ok: true, message: 'Đã xóa thành viên khỏi đội' });
  } catch (e) { next(e); }
});

// Leave team (any member)
router.post('/:name/leave', discordAuth, async (req, res, next) => {
  try {
    const { name } = req.params;
    const discordId = req.discordUser.discordId;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const player = await prisma.player.findFirst({ where: { discordId, teamId: name } });
    if (!player) return res.status(400).json({ error: 'Bạn không trong đội này' });
    if (discordId === team.captainDiscordId) return res.status(400).json({ error: 'Đội trưởng không thể rời — hãy giải tán đội trước' });
    await prisma.player.update({ where: { id: player.id }, data: { teamId: null } });
    const roster = JSON.parse(team.rosterJson || '[]');
    const filtered = roster.filter(id => id !== discordId);
    await prisma.team.update({ where: { id: team.id }, data: { rosterJson: JSON.stringify(filtered) } });
    res.json({ ok: true, message: 'Đã rời khỏi đội' });
  } catch (e) { next(e); }
});

// KDA routes
router.get('/kda/:matchId', getKDA);
router.put('/kda/:matchId', auth, saveKDA);

module.exports = router;
