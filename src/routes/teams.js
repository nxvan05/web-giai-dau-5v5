const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const { getTeams, updateTeams, listAll, createTeam, approveTeam, rejectTeam, saveKDA, getKDA } = require('../controllers/teamController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const prisma = require('../utils/prisma');
const containsProfanity = require('../utils/profanity');

// Combined auth: admin token OR Discord JWT
function orAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  const discord = req.cookies?.discord_token;
  const jwt = require('jsonwebtoken');
  try { if (token) { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); } } catch(_) {}
  try { if (discord) { const d = jwt.verify(discord, process.env.JWT_SECRET); if (d.type === 'discord') { req.discordUser = d; return next(); } } } catch(_) {}
  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
}

// Old auto-draft routes (auth required)
router.get('/', auth, getTeams);
router.put('/', auth, updateTeams);

// New team registration (create is public, list/approve/reject need auth)
router.get('/all', listAll);

// Create team from registration (Duo/Trio) — requires Discord or admin auth
router.post('/create-from-registration', orAuth, async (req, res, next) => {
  try {
    const { name, discordId: bodyDiscordId, displayName, pts, type } = req.body;
    // Use discord ID from auth token (trusted), fallback to body for admin
    const discordId = req.discordUser ? req.discordUser.discordId : (req.user ? bodyDiscordId : null);
    if (!discordId) return res.status(400).json({ error: 'Thiếu Discord ID' });
    if (containsProfanity(name)) return res.status(400).json({ error: 'Tên đội chứa từ ngữ không phù hợp' });
    const existing = await prisma.team.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Tên đội đã tồn tại' });
    const teamPts = pts || 0;
    const team = await prisma.team.create({
      data: {
        name,
        captainDiscordId: discordId,
        rosterJson: JSON.stringify([discordId]),
        status: 'approved',
        teamType: type || 'duo',
        color: type === 'trio' ? '#F97316' : '#EAB308',
        pts: teamPts
      }
    });
    await prisma.player.updateMany({ where: { discordId }, data: { teamId: name } });
    const io = require('../utils/socket').getIO();
    if (io) io.emit('team:created', team);
    res.status(201).json(team);
  } catch (e) { next(e); }
});

// Admin: auto-draft teams into 5-player teams
router.post('/admin/draft', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ where: { status: 'recruiting' } });
    const allPlayers = [];
    for (const team of teams) {
      const roster = JSON.parse(team.rosterJson || '[]');
      for (const discordId of roster) {
        const player = await prisma.player.findFirst({ where: { discordId } });
        if (player) allPlayers.push(player);
      }
    }
    // Shuffle and group into 5-player teams
    const shuffled = allPlayers.sort(() => Math.random() - 0.5);
    const newTeams = [];
    for (let i = 0; i < shuffled.length; i += 5) {
      const group = shuffled.slice(i, i + 5);
      if (group.length < 5) continue;
      const teamName = `Đội ${String.fromCharCode(65 + newTeams.length)} (Auto)`;
      const rosterIds = group.map(p => p.discordId);
      const totalPts = group.reduce((s, p) => s + (p.pts || 0), 0);
      const team = await prisma.team.create({
        data: {
          name: teamName,
          captainDiscordId: group[0].discordId,
          rosterJson: JSON.stringify(rosterIds),
          status: 'complete',
          teamType: 'complete',
          color: '#3B82F6',
          pts: totalPts
        }
      });
      for (const p of group) {
        await prisma.player.update({ where: { id: p.id }, data: { teamId: teamName } });
      }
      newTeams.push(team);
    }
    // Delete old recruiting teams
    for (const team of teams) {
      await prisma.joinRequest.deleteMany({ where: { teamId: team.id } });
      await prisma.team.delete({ where: { id: team.id } });
    }
    const io = require('../utils/socket').getIO();
    if (io) io.emit('teams:reload');
    res.json({ drafted: newTeams.length, teams: newTeams.map(t => t.name) });
  } catch (e) { next(e); }
});

// Rename team (captain only) — requires Discord auth
router.put('/:name/rename', discordAuth, async (req, res, next) => {
  try {
    const { name } = req.params;
    const { newName } = req.body;
    const discordId = req.discordUser.discordId;
    if (!newName) return res.status(400).json({ error: 'Thiếu tên mới' });
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    if (team.captainDiscordId !== discordId) return res.status(403).json({ error: 'Chỉ đội trưởng mới đổi tên được' });
    if (containsProfanity(newName)) return res.status(400).json({ error: 'Tên đội chứa từ ngữ không phù hợp' });
    const nameExists = await prisma.team.findUnique({ where: { name: newName } });
    if (nameExists && nameExists.id !== team.id) return res.status(400).json({ error: 'Tên đội đã tồn tại' });
    await prisma.team.update({ where: { id: team.id }, data: { name: newName } });
    await prisma.player.updateMany({ where: { teamId: team.name }, data: { teamId: newName } });
    await prisma.match.updateMany({ where: { team1Name: team.name }, data: { team1Name: newName } });
    await prisma.match.updateMany({ where: { team2Name: team.name }, data: { team2Name: newName } });
    res.json({ ok: true, name: newName });
  } catch (e) { next(e); }
});

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

// Cancel join request
router.post('/:name/requests/cancel', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { discordId } = req.body;
    if (!discordId) return res.status(400).json({ error: 'Thiếu Discord ID' });
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    const joinReq = await prisma.joinRequest.findFirst({
      where: { teamId: team.id, playerDiscordId: discordId, status: 'pending' }
    });
    if (!joinReq) return res.status(404).json({ error: 'Không tìm thấy đơn' });
    await prisma.joinRequest.update({ where: { id: joinReq.id }, data: { status: 'cancelled' } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Disband team (captain only)
router.delete('/:name/disband', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { discordId } = req.body;
    if (!discordId) return res.status(400).json({ error: 'Thiếu Discord ID' });
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    if (team.captainDiscordId !== discordId) return res.status(403).json({ error: 'Chỉ đội trưởng mới giải tán được' });
    await prisma.player.updateMany({ where: { teamId: name }, data: { teamId: null } });
    await prisma.joinRequest.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    const io = require('../utils/socket').getIO();
    if (io) io.emit('team:deleted', { id: team.id, name });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Join requests
router.post('/:name/join', discordAuth, async (req, res, next) => {
  try {
    const { name } = req.params;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    const player = await prisma.player.findFirst({ where: { discordId: req.discordUser.discordId } });
    if (!player) return res.status(400).json({ error: 'Bạn chưa đăng ký thi đấu' });
    if (player.teamId) return res.status(400).json({ error: 'Bạn đã trong đội ' + player.teamId });
    const existing = await prisma.joinRequest.findFirst({ where: { teamId: team.id, playerDiscordId: req.discordUser.discordId, status: 'pending' } });
    if (existing) return res.status(400).json({ error: 'Bạn đã gửi đơn rồi, chờ đội trưởng duyệt' });
    const joinReq = await prisma.joinRequest.create({
      data: { teamId: team.id, teamName: team.name, playerDiscordId: req.discordUser.discordId, playerName: req.discordUser.discordUsername }
    });
    const io = require('../utils/socket').getIO();
    if (io) io.emit('joinRequest:created', joinReq);
    res.status(201).json(joinReq);
  } catch (e) { next(e); }
});
router.get('/:name/requests', discordAuth, async (req, res, next) => {
  try {
    const { name } = req.params;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    if (team.captainDiscordId !== req.discordUser.discordId) return res.status(403).json({ error: 'Chỉ đội trưởng xem được' });
    const requests = await prisma.joinRequest.findMany({ where: { teamId: team.id }, orderBy: { createdAt: 'desc' } });
    res.json(requests);
  } catch (e) { next(e); }
});
router.put('/:name/requests/:requestId/approve', discordAuth, async (req, res, next) => {
  try {
    const { name, requestId } = req.params;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    if (team.captainDiscordId !== req.discordUser.discordId) return res.status(403).json({ error: 'Chỉ đội trưởng mới duyệt được' });
    const joinReq = await prisma.joinRequest.findUnique({ where: { id: requestId } });
    if (!joinReq || joinReq.teamId !== team.id) return res.status(404).json({ error: 'Đơn không tồn tại' });
    if (joinReq.status !== 'pending') return res.status(400).json({ error: 'Đơn đã được xử lý' });
    const roster = JSON.parse(team.rosterJson || '[]');
    if (roster.length >= 5) return res.status(400).json({ error: 'Đội đã đủ 5 người' });
    roster.push(joinReq.playerDiscordId);
    await prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'approved' } });
    await prisma.team.update({ where: { id: team.id }, data: { rosterJson: JSON.stringify(roster) } });
    await prisma.player.updateMany({ where: { discordId: joinReq.playerDiscordId }, data: { teamId: team.name } }).catch(() => {});
    const io = require('../utils/socket').getIO();
    if (io) io.emit('joinRequest:resolved', { requestId, status: 'approved', teamName: team.name, playerDiscordId: joinReq.playerDiscordId });
    res.json({ ok: true, message: 'Đã duyệt ' + joinReq.playerName + ' vào đội' });
  } catch (e) { next(e); }
});
router.put('/:name/requests/:requestId/reject', discordAuth, async (req, res, next) => {
  try {
    const { name, requestId } = req.params;
    const team = await prisma.team.findFirst({ where: { name } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    if (team.captainDiscordId !== req.discordUser.discordId) return res.status(403).json({ error: 'Chỉ đội trưởng mới từ chối được' });
    const joinReq = await prisma.joinRequest.findUnique({ where: { id: requestId } });
    if (!joinReq || joinReq.teamId !== team.id) return res.status(404).json({ error: 'Đơn không tồn tại' });
    await prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
    const io = require('../utils/socket').getIO();
    if (io) io.emit('joinRequest:resolved', { requestId, status: 'rejected' });
    res.json({ ok: true, message: 'Đã từ chối ' + joinReq.playerName });
  } catch (e) { next(e); }
});

// KDA routes
router.get('/kda/:matchId', getKDA);
router.put('/kda/:matchId', auth, saveKDA);

module.exports = router;
