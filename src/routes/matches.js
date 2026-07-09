const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { getIO } = require('../utils/socket');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { applyEloChanges } = require('../utils/elo');

function toScore(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getWinnerFromScores(team1Name, team2Name, score1, score2) {
  if (score1 > score2) return team1Name;
  if (score2 > score1) return team2Name;
  return null;
}

function normalizeReportScores(match, reportingTeamName, ownScore, opponentScore) {
  if (reportingTeamName === match.team1Name) {
    return { score1: ownScore, score2: opponentScore };
  }
  return { score1: opponentScore, score2: ownScore };
}

router.get('/stats', async (req, res, next) => {
  try {
    const players = await prisma.player.count();
    const teams = await prisma.team.count();
    const matches = await prisma.match.count();
    res.json({ players, teams, matches });
  } catch(e) { next(e); }
});

router.get('/score-reports', async (req, res, next) => {
  try {
    const reports = await prisma.scoreReport.findMany({
      include: { reporter: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch(e) { next(e); }
});

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
  }
);

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

      const nextScore1 = toScore(score1, existing.score1);
      const nextScore2 = toScore(score2, existing.score2);
      let winner = existing.winner;
      if (forfeit === existing.team1Name) { winner = existing.team2Name; }
      else if (forfeit === existing.team2Name) { winner = existing.team1Name; }
      else if (!forfeit) {
        winner = getWinnerFromScores(existing.team1Name, existing.team2Name, nextScore1, nextScore2);
      }

      const match = await prisma.match.update({
        where: { id },
        data: {
          score1: forfeit ? (forfeit === existing.team1Name ? 0 : nextScore1) : nextScore1,
          score2: forfeit ? (forfeit === existing.team2Name ? 0 : nextScore2) : nextScore2,
          map: map || existing.map, status: status || 'completed', winner,
          streamUrl: streamUrl !== undefined ? streamUrl : existing.streamUrl
        }
      });

      if (match.status === 'completed' && winner) {
        try {
          await applyEloChanges(match.id, match.team1Name, match.team2Name, winner);
        } catch (e) { /* non-critical */ }
      }
      
      const io = getIO();
      if (io) io.emit('data:updated', { type: 'match', id: match.id });
      
      res.json(match);
    } catch (e) { next(e); }
  }
);

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
  }
);

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.match.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Không tìm thấy trận' });
    throw e;
  }
});

router.post('/generate', auth, async (req, res, next) => {
  try {
    const { teams, startDate, matchDurationMinutes, group, format } = req.body;
    if (!teams || teams.length < 2) return res.status(400).json({ error: 'Cần ít nhất 2 đội' });
    const existing = await prisma.match.findMany({ where: { round: 'group', group: group || 'default' } });
    if (existing.length > 0 && format !== 'swiss') return res.status(400).json({ error: 'Lịch thi đấu đã được tạo cho bảng này' });

    if (format === 'swiss') {
      const players = await prisma.player.findMany({ where: { teamId: { not: null } } });
      const teamMap = {};
      for (const p of players) { if (!teamMap[p.teamId]) teamMap[p.teamId] = { name: p.teamId, pts: 0, wins: 0, losses: 0, scoreDiff: 0 }; }
      const completed = await prisma.match.findMany({ where: { status: 'completed' } });
      for (const m of completed) {
        if (teamMap[m.team1Name]) {
          if (m.winner === m.team1Name) { teamMap[m.team1Name].wins++; teamMap[m.team1Name].pts += 3; }
          else if (m.winner === m.team2Name) { teamMap[m.team1Name].losses++; }
          teamMap[m.team1Name].scoreDiff += (m.score1 || 0) - (m.score2 || 0);
        }
        if (teamMap[m.team2Name]) {
          if (m.winner === m.team2Name) { teamMap[m.team2Name].wins++; teamMap[m.team2Name].pts += 3; }
          else if (m.winner === m.team1Name) { teamMap[m.team2Name].losses++; }
          teamMap[m.team2Name].scoreDiff += (m.score2 || 0) - (m.score1 || 0);
        }
      }
      const sorted = Object.values(teamMap).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.scoreDiff - a.scoreDiff);
      const played = new Set(completed.map(m => [m.team1Name, m.team2Name].sort().join('|||')));
      const paired = new Set();
      const pairs = [];
      for (let i = 0; i < sorted.length; i++) {
        if (paired.has(sorted[i].name)) continue;
        paired.add(sorted[i].name);
        for (let j = i + 1; j < sorted.length; j++) {
          if (paired.has(sorted[j].name)) continue;
          if (played.has([sorted[i].name, sorted[j].name].sort().join('|||'))) continue;
          paired.add(sorted[j].name);
          pairs.push([sorted[i].name, sorted[j].name]);
          break;
        }
      }
      if (pairs.length === 0) return res.status(400).json({ error: 'Không thể ghép cặp Swiss' });

      const start = new Date(startDate || Date.now());
      const dur = (matchDurationMinutes || 60) * 60000;
      let t = start.getTime();
      const created = [];
      for (const [t1, t2] of pairs) {
        const match = await prisma.match.create({ data: { team1Name: t1, team2Name: t2, group: group || 'swiss', round: 'swiss', scheduledAt: new Date(t), status: 'pending' } });
        created.push(match);
        t += dur;
      }
      const io = getIO();
      if (io) io.emit('matches:generated', { count: pairs.length, format: 'swiss' });
      return res.status(201).json({ count: pairs.length, matches: created });
    }

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
    const all = await prisma.match.findMany({ orderBy: { scheduledAt: 'asc' } });
    res.status(201).json({ count: matches.length, matches: all });
  } catch (e) { next(e); }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    let players = await prisma.player.findMany();
    
    // Sort logic: parse Score from adminEvaluation, fallback to wins & elo
    players.sort((a, b) => {
      const scoreA = a.adminEvaluation ? parseFloat(a.adminEvaluation.replace(/[^0-9.]/g, '')) || 0 : 0;
      const scoreB = b.adminEvaluation ? parseFloat(b.adminEvaluation.replace(/[^0-9.]/g, '')) || 0 : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.elo - a.elo;
    });
    
    players = players.slice(0, 100);
    
    const { getPointsFromRank } = require('../utils/rankPoints');
    res.json(players.map((p, i) => ({ 
      rank: i + 1, 
      displayName: p.displayName, 
      elo: p.elo, // Keep in JSON for fallback or debug, UI will hide it
      rankName: p.rank, 
      peakRank: p.peakRank, 
      rankIconUrl: p.rankIconUrl, 
      peakIconUrl: p.peakIconUrl || p.rankIconUrl, 
      pts: getPointsFromRank(p.peakRank || p.rank), 
      wins: p.wins, 
      losses: p.losses, 
      mvps: p.mvps, 
      discordId: p.discordId, 
      teamId: p.teamId, 
      discordAvatar: p.discordAvatar,
      headshotPct: p.headshotPct || 0,
      adminEvaluation: p.adminEvaluation || '',
      role: p.role || 'Flex'
    })));
  } catch(e) { next(e); }
});

router.get('/standings', async (req, res, next) => {
  const matches = await prisma.match.findMany({ where: { status: 'completed' } });
  const groups = {};
  for (const m of matches) {
    const g = m.group || 'default';
    if (!groups[g]) groups[g] = {};
    for (const team of [m.team1Name, m.team2Name]) {
      if (!groups[g][team]) groups[g][team] = { played: 0, wins: 0, losses: 0, pts: 0 };
    }
    groups[g][m.team1Name].played++;
    groups[g][m.team2Name].played++;
    if (m.winner === m.team1Name) { groups[g][m.team1Name].wins++; groups[g][m.team1Name].pts += 3; groups[g][m.team2Name].losses++; }
    else if (m.winner === m.team2Name) { groups[g][m.team2Name].wins++; groups[g][m.team2Name].pts += 3; groups[g][m.team1Name].losses++; }
  }
  const sorted = {};
  const allTeams = await prisma.team.findMany();
  for (const [g, teams] of Object.entries(groups)) {
    const arr = Object.entries(teams).map(([name, s]) => { const t = allTeams.find(x => x.name === name); return { name, logo: t?.logo, color: t?.color, ...s }; });
    arr.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const h2h = matches.filter(m => (m.team1Name === a.name && m.team2Name === b.name) || (m.team1Name === b.name && m.team2Name === a.name));
      const aWins = h2h.filter(m => m.winner === a.name).length;
      const bWins = h2h.filter(m => m.winner === b.name).length;
      if (aWins !== bWins) return bWins - aWins;
      return 0;
    });
    sorted[g] = arr;
  }
  res.json(sorted);
});

router.get('/player/:discordId/upcoming', async (req, res, next) => {
  const { discordId } = req.params;
  const player = await prisma.player.findFirst({ where: { discordId } });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }], status: 'pending', scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' }
  });
  res.json(matches);
});

router.put('/score-reports/:id/approve', auth, async (req, res, next) => {
  try {
    const report = await prisma.scoreReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'pending') return res.status(400).json({ error: 'Report already resolved' });
    const match = await prisma.match.findUnique({ where: { id: report.matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status === 'completed') return res.status(400).json({ error: 'Match already completed' });
    const winner = getWinnerFromScores(match.team1Name, match.team2Name, report.score1, report.score2);
    const updatedMatch = await prisma.match.update({ where: { id: match.id }, data: { score1: report.score1, score2: report.score2, map: report.map || match.map, status: 'completed', winner } });
    await prisma.scoreReport.update({ where: { id: report.id }, data: { status: 'approved', resolvedAt: new Date(), resolvedBy: req.user.username || 'admin' } });
    try {
      await applyEloChanges(match.id, match.team1Name, match.team2Name, winner);
    } catch (e) { /* non-critical */ }
    const io = getIO();
    if (io) {
      io.emit('match:result', updatedMatch);
      io.emit('data:updated', { type: 'stats', matchId: match.id });
    }
    try { const { createNotification } = require('./notifications'); createNotification('match_result', 'Kết quả đã được xác nhận: ' + match.team1Name + ' ' + report.score1 + '-' + report.score2 + ' ' + match.team2Name, { matchId: match.id }); } catch(e) {}
    res.json({ message: 'Đã duyệt báo cáo', report, match: updatedMatch });
  } catch (e) { next(e); }
});

router.put('/score-reports/:id/reject', auth, async (req, res, next) => {
  try {
    const report = await prisma.scoreReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await prisma.scoreReport.update({ where: { id: report.id }, data: { status: 'rejected', resolvedAt: new Date(), resolvedBy: req.user.username || 'admin' } });
    const io = getIO();
    if (io) io.emit('score:report-resolved', report);
    res.json({ message: 'Đã từ chối báo cáo' });
  } catch (e) { next(e); }
});

module.exports = router;
