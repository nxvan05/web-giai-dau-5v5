const log = require('../utils/logger');
const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');
const { notifyMatchResult } = require('./webhookController');
const { logAction } = require('../utils/audit');
const { applyEloChanges } = require('../utils/elo');
const { checkAndAwardAchievements } = require('../utils/achievements');

exports.getAll = async (req, res) => {
  const matches = await prisma.match.findMany({ orderBy: { scheduledAt: 'asc' } });
  res.json(matches);
};

exports.create = async (req, res) => {
  const { team1Name, team2Name, group, round, scheduledAt } = req.body;
  if (!team1Name || !team2Name) return res.status(400).json({ error: 'Tên đội không được để trống' });
  const match = await prisma.match.create({
    data: { team1Name, team2Name, group: group || null, round: round || 'group', scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
  });
  const io = getIO();
  if (io) io.emit('match:created', match);
  res.status(201).json(match);
};

exports.updateResult = async (req, res) => {
  const { id } = req.params;
  const { score1, score2, map, status, streamUrl } = req.body;
  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Trận đấu không tồn tại' });

  const s1 = score1 ?? existing.score1;
  const s2 = score2 ?? existing.score2;
  let winner = existing.winner;
  if (s1 > s2) winner = existing.team1Name;
  else if (s2 > s1) winner = existing.team2Name;

  const match = await prisma.match.update({
    where: { id },
    data: {
      score1: s1, score2: s2,
      map: map || existing.map,
      status: status || 'completed',
      winner,
      streamUrl: streamUrl !== undefined ? streamUrl : existing.streamUrl
    }
  });

  if (winner && existing.round === 'semifinal') {
    const finalMatch = await prisma.match.findFirst({ where: { round: 'final' } });
    if (finalMatch) {
      const updateData = {};
      if (finalMatch.team1Name === 'TBD1' || finalMatch.team1Name === 'TBD2') {
        updateData.team1Name = winner;
      } else {
        updateData.team2Name = winner;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.match.update({ where: { id: finalMatch.id }, data: updateData });
        const io2 = getIO();
        if (io2) io2.emit('bracket:generated', {});
      }
    }
  }

  const io = getIO();
  if (io) io.emit('match:result', match);
  try { const { createNotification } = require('../routes/notifications'); createNotification('match_result', match.team1Name + ' ' + s1 + '-' + s2 + ' ' + match.team2Name, { matchId: id, winner }); } catch(e) {}

  try {
    await applyEloChanges(id, existing.team1Name, existing.team2Name, winner);
  } catch (e) { /* non-critical */ }

  logAction('match.result', existing.team1Name + ' ' + s1 + '-' + s2 + ' ' + existing.team2Name).catch(err => log.error('Caught error', { error: err.message }));
  if (winner || status === 'completed') {
    notifyMatchResult({ ...existing, score1: s1, score2: s2, winner, map: map || existing.map }).catch(err => log.error('Caught error', { error: err.message }));
  }

  res.json(match);
};

exports.setMvp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discordId, playerName } = req.body;
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return res.status(404).json({ error: 'Trận không tồn tại' });
    if (match.status !== 'completed') return res.status(400).json({ error: 'Chỉ có thể gán MVP cho trận đã kết thúc' });

    await prisma.match.update({ where: { id }, data: { mvpDiscordId: discordId || null, mvpPlayerName: playerName || null } });
    if (discordId) {
      const player = await prisma.player.findFirst({ where: { discordId } });
      if (player) {
          await prisma.player.update({ where: { id: player.id }, data: { mvps: { increment: 1 } } });
          await checkAndAwardAchievements(discordId);
      }
    }

    const io = getIO();
    if (io) io.emit('mvp:assigned', { matchId: id, discordId, playerName });
    res.json({ message: 'MVP updated' });
  } catch (e) { next(e); }
};

exports.delete = async (req, res) => {
  try {
    await prisma.match.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Không tìm thấy trận' });
    throw e;
  }
};



exports.getLeaderboard = async (req, res) => {
  const players = await prisma.player.findMany({
    orderBy: [{ wins: 'desc' }, { elo: 'desc' }],
    select: { id: true, displayName: true, elo: true, rank: true, wins: true, losses: true, mvps: true, discordId: true, teamId: true }
  });
  const result = players.map((p, i) => ({
    rank: i + 1, displayName: p.displayName, elo: p.elo,
    rankName: p.rank, wins: p.wins, losses: p.losses, mvps: p.mvps, discordId: p.discordId, teamId: p.teamId
  }));
  res.json(result);
};

exports.getStandings = async (req, res) => {
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
  for (const [g, teams] of Object.entries(groups)) {
    const arr = Object.entries(teams).map(([name, s]) => ({ name, ...s }));
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
};

exports.getPlayerMatches = async (req, res) => {
  const { discordId } = req.params;
  const player = await prisma.player.findFirst({ where: { discordId } });
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const matches = await prisma.match.findMany({
    where: { OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }] },
    orderBy: { scheduledAt: 'asc' }
  });

  res.json(matches.map(m => ({
    ...m, isTeam1: m.team1Name === (player.teamId || ''),
    result: m.winner ? (m.winner === (player.teamId || '') ? 'win' : 'loss') : 'pending'
  })));
};

exports.getStats = async (req, res, next) => {
  try {
    const [players, matches, checkins] = await Promise.all([
      prisma.player.count(), prisma.match.count(), prisma.checkIn.count()
    ]);
    const completed = await prisma.match.count({ where: { status: 'completed' } });
    const pending = await prisma.match.count({ where: { status: 'pending' } });
    const totalElo = await prisma.player.aggregate({ _sum: { elo: true } });
    res.json({ players, matches, completed, pending, checkins, totalElo: totalElo._sum.elo || 0 });
  } catch (e) { next(e); }
};

exports.getTeamMatches = async (req, res, next) => {
  try {
    const { teamName } = req.params;
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: teamName }, { team2Name: teamName }] },
      orderBy: { scheduledAt: 'asc' }
    });
    res.json(matches.map(m => ({ ...m, isTeam1: m.team1Name === teamName, result: m.winner ? (m.winner === teamName ? 'win' : 'loss') : 'pending' })));
  } catch (e) { next(e); }
};

exports.getUpcomingPlayerMatches = async (req, res) => {
  const { discordId } = req.params;
  const player = await prisma.player.findFirst({ where: { discordId } });
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }],
      status: 'pending',
      scheduledAt: { gte: new Date() }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  res.json(matches);
};

exports.getHeadToHead = async (req, res, next) => {
  try {
    const { team1, team2 } = req.params;
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: team1, team2Name: team2 }, { team1Name: team2, team2Name: team1 }] },
      orderBy: { scheduledAt: 'asc' }
    });
    const t1Wins = matches.filter(m => m.winner === team1).length;
    const t2Wins = matches.filter(m => m.winner === team2).length;
    res.json({ team1, team2, matches, t1Wins, t2Wins, draws: matches.filter(m => !m.winner && m.status === 'completed').length });
  } catch (e) { next(e); }
};
