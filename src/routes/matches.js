const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/', async (req, res, next) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const [matches, total] = await Promise.all([
      prisma.match.findMany({ orderBy: { scheduledAt: 'asc' }, skip, take: limit }),
      prisma.match.count()
    ]);
    res.json(paginatedResponse(matches, page, limit, total));
  } catch (e) { next(e); }
});

router.post('/', auth,
  body('team1Name').trim().notEmpty().withMessage('Team 1 name required'),
  body('team2Name').trim().notEmpty().withMessage('Team 2 name required'),
  validate,
  async (req, res, next) => {
  try {
    const { team1Name, team2Name, group, round, scheduledAt } = req.body;
    if (!team1Name || !team2Name) return res.status(400).json({ error: 'Tên đội không được để trống' });
    const match = await prisma.match.create({
      data: { team1Name, team2Name, group: group || null, round: round || 'group', scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
    });
    res.status(201).json(match);
  } catch (e) { next(e); }
});

router.put('/:id', auth,
  body('score1').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('score2').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('forfeit').optional().isString().withMessage('forfeit must be a team name'),
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score1, score2, map, status, streamUrl, forfeit } = req.body;
    const existing = await prisma.match.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Trận đấu không tồn tại' });

    let winner = existing.winner;
    if (forfeit === existing.team1Name) { winner = existing.team2Name; }
    else if (forfeit === existing.team2Name) { winner = existing.team1Name; }
    else if (!forfeit) {
      const s1 = score1 ?? existing.score1;
      const s2 = score2 ?? existing.score2;
      if (s1 > s2) winner = existing.team1Name;
      else if (s2 > s1) winner = existing.team2Name;
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        score1: forfeit ? (forfeit === existing.team1Name ? 0 : (score1 ?? existing.score1)) : (score1 ?? existing.score1),
        score2: forfeit ? (forfeit === existing.team2Name ? 0 : (score2 ?? existing.score2)) : (score2 ?? existing.score2),
        map: map || existing.map, status: status || 'completed', winner,
        streamUrl: streamUrl !== undefined ? streamUrl : existing.streamUrl
      }
    });
    res.json(match);
  } catch (e) { next(e); }
});

router.put('/:id/mvp', auth,
  body('discordId').optional().trim().notEmpty().withMessage('Discord ID cannot be empty'),
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discordId, playerName } = req.body;
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return res.status(404).json({ error: 'Trận không tồn tại' });
    if (match.status !== 'completed') return res.status(400).json({ error: 'Chỉ có thể gán MVP cho trận đã kết thúc' });

    await prisma.match.update({ where: { id }, data: { mvpDiscordId: discordId || null, mvpPlayerName: playerName || null } });
    if (discordId) {
      const player = await prisma.player.findFirst({ where: { discordId } });
      if (player) await prisma.player.update({ where: { id: player.id }, data: { mvps: { increment: 1 } } });
    }
    res.json({ message: 'MVP updated' });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.match.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Không tìm thấy trận' });
    throw e;
  }
});

router.post('/generate', auth,
  body('teams').isArray({ min: 2 }).withMessage('At least 2 teams required'),
  validate,
  async (req, res, next) => {
  try {
    const { teams, startDate, matchDurationMinutes, group } = req.body;
    if (!teams || teams.length < 2) return res.status(400).json({ error: 'Cần ít nhất 2 đội' });

    const existing = await prisma.match.findMany({ where: { round: 'group', group: group || 'default' } });
    if (existing.length > 0) return res.status(400).json({ error: 'Lịch thi đấu đã được tạo cho bảng này' });

    const matches = [];
    const start = new Date(startDate || Date.now());
    const durationMs = (matchDurationMinutes || 60) * 60 * 1000;
    let currentTime = start.getTime();

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ team1Name: teams[i], team2Name: teams[j], group: group || null, round: 'group', scheduledAt: new Date(currentTime), status: 'pending' });
        currentTime += durationMs;
      }
    }

    await prisma.$transaction(matches.map(m => prisma.match.create({ data: m })));
    res.status(201).json({ count: matches.length, matches });
  } catch (e) { next(e); }
});

router.get('/leaderboard', async (req, res) => {
  const players = await prisma.player.findMany({ orderBy: [{ wins: 'desc' }, { elo: 'desc' }], take: 100 });
  res.json(players.map((p, i) => ({ rank: i + 1, displayName: p.displayName, elo: p.elo, rankName: p.rank, wins: p.wins, losses: p.losses, mvps: p.mvps, discordId: p.discordId })));
});

router.get('/standings', async (req, res) => {
  const matches = await prisma.match.findMany({ where: { status: 'completed' } });
  const groups = {};
  for (const m of matches) {
    const g = m.group || 'default';
    if (!groups[g]) groups[g] = {};
    for (const team of [m.team1Name, m.team2Name]) {
      if (!groups[g][team]) groups[g][team] = { played: 0, wins: 0, losses: 0, pts: 0 };
    }
    groups[g][m.team1Name].played++; groups[g][m.team2Name].played++;
    if (m.winner === m.team1Name) { groups[g][m.team1Name].wins++; groups[g][m.team1Name].pts += 3; groups[g][m.team2Name].losses++; }
    else if (m.winner === m.team2Name) { groups[g][m.team2Name].wins++; groups[g][m.team2Name].pts += 3; groups[g][m.team1Name].losses++; }
  }
  const sorted = {};
  for (const [g, teams] of Object.entries(groups)) {
    const arr = Object.entries(teams).map(([name, s]) => ({ name, ...s }));
    arr.sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; return 0; });
    sorted[g] = arr;
  }
  res.json(sorted);
});

router.get('/player/:discordId/upcoming', async (req, res) => {
  const { discordId } = req.params;
  const player = await prisma.player.findFirst({ where: { discordId } });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }], status: 'pending', scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' }
  });
  res.json(matches);
});

router.get('/stats', auth, async (req, res, next) => {
  try {
    const [players, matches, checkins] = await Promise.all([prisma.player.count(), prisma.match.count(), prisma.checkIn.count()]);
    const completed = await prisma.match.count({ where: { status: 'completed' } });
    const pending = await prisma.match.count({ where: { status: 'pending' } });
    res.json({ players, matches, completed, pending, checkins });
  } catch (e) { next(e); }
});

router.get('/team/:teamName', async (req, res) => {
  const { teamName } = req.params;
  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: teamName }, { team2Name: teamName }] },
    orderBy: { scheduledAt: 'asc' }
  });
  res.json(matches.map(m => ({ ...m, isTeam1: m.team1Name === teamName, result: m.winner ? (m.winner === teamName ? 'win' : 'loss') : 'pending' })));
});

router.get('/player/:discordId', async (req, res) => {
  const { discordId } = req.params;
  const player = await prisma.player.findFirst({ where: { discordId } });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }] },
    orderBy: { scheduledAt: 'asc' }
  });
  res.json(matches.map(m => ({ ...m, isTeam1: m.team1Name === (player.teamId || ''), result: m.winner ? (m.winner === (player.teamId || '') ? 'win' : 'loss') : 'pending' })));
});

router.get('/:id/detail', async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const [team1Roster, team2Roster, playerStats] = await Promise.all([
      prisma.player.findMany({ where: { teamId: match.team1Name } }),
      prisma.player.findMany({ where: { teamId: match.team2Name } }),
      prisma.matchPlayerStat.findMany({ where: { matchId: match.id } })
    ]);
    res.json({ match, team1Roster, team2Roster, playerStats });
  } catch (e) { next(e); }
});

// === Captain Score Reporting ===
router.post('/:id/report-score', discordAuth,
  body('teamName').trim().notEmpty().withMessage('Tên đội không được để trống'),
  body('score1').isInt({ min: 0 }).withMessage('Tỉ số không hợp lệ'),
  body('score2').isInt({ min: 0 }).withMessage('Tỉ số không hợp lệ'),
  validate,
  async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Trận không tồn tại' });
    if (match.team1Name !== req.body.teamName && match.team2Name !== req.body.teamName) {
      return res.status(400).json({ error: 'Bạn không thuộc trận này' });
    }
    const existing = await prisma.scoreReport.findFirst({ where: { matchId: match.id, reportedByDiscordId: req.discordUser.discordId, status: 'pending' } });
    if (existing) return res.status(400).json({ error: 'Bạn đã gửi báo cáo cho trận này rồi' });
    const report = await prisma.scoreReport.create({
      data: { matchId: match.id, reportedByDiscordId: req.discordUser.discordId, reportedByName: req.discordUser.discordUsername, teamName: req.body.teamName, score1: req.body.score1, score2: req.body.score2, map: req.body.map || null, screenshot: req.body.screenshot || null }
    });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('score:report', report);
    try { const { createNotification } = require('./notifications'); createNotification('info', `Báo cáo kết quả từ ${req.discordUser.discordUsername} cho trận ${match.team1Name} vs ${match.team2Name}`, { matchId: match.id, reportId: report.id }); } catch(e) {}
    res.status(201).json(report);
  } catch (e) { next(e); }
});

router.get('/score-reports', auth, async (req, res, next) => {
  try {
    const reports = await prisma.scoreReport.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const enriched = await Promise.all(reports.map(async r => {
      const match = await prisma.match.findUnique({ where: { id: r.matchId } });
      return { ...r, match };
    }));
    res.json(enriched);
  } catch (e) { next(e); }
});

router.put('/score-reports/:id/approve', auth, async (req, res, next) => {
  try {
    const report = await prisma.scoreReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'pending') return res.status(400).json({ error: 'Report already resolved' });
    const match = await prisma.match.findUnique({ where: { id: report.matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    let winner = report.score1 > report.score2 ? report.teamName : (report.score1 < report.score2 ? (match.team1Name === report.teamName ? match.team2Name : match.team1Name) : null);
    await prisma.match.update({ where: { id: match.id }, data: { score1: report.score1, score2: report.score2, map: report.map || match.map, status: 'completed', winner } });
    await prisma.scoreReport.update({ where: { id: report.id }, data: { status: 'approved', resolvedAt: new Date(), resolvedBy: req.user.username || 'admin' } });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('match:result', match);
    try { const { createNotification } = require('./notifications'); createNotification('match_result', `Kết quả đã được xác nhận: ${match.team1Name} ${report.score1}-${report.score2} ${match.team2Name}`, { matchId: match.id }); } catch(e) {}
    res.json({ message: 'Đã duyệt báo cáo', report, match });
  } catch (e) { next(e); }
});

router.put('/score-reports/:id/reject', auth, async (req, res, next) => {
  try {
    const report = await prisma.scoreReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await prisma.scoreReport.update({ where: { id: report.id }, data: { status: 'rejected', resolvedAt: new Date(), resolvedBy: req.user.username || 'admin' } });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('score:report-resolved', report);
    res.json({ message: 'Đã từ chối báo cáo' });
  } catch (e) { next(e); }
});

router.get('/h2h/:team1/:team2', async (req, res) => {
  const { team1, team2 } = req.params;
  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: team1, team2Name: team2 }, { team1Name: team2, team2Name: team1 }] },
    orderBy: { scheduledAt: 'asc' }
  });
  res.json({ team1, team2, matches, t1Wins: matches.filter(m => m.winner === team1).length, t2Wins: matches.filter(m => m.winner === team2).length });
});

module.exports = router;
