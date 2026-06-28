const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
function toCSV(rows, columns) {
  const header = columns.map(c => c.label || c.key).join(',');
  const body = rows.map(row => columns.map(c => {
    const val = c.key ? row[c.key] : '';
    return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val ?? '';
  }).join(',')).join('\n');
  return header + '\n' + body;
}

router.get('/standings', auth, async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
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
    if (format === 'csv') {
      const rows = Object.entries(sorted).flatMap(([group, teams]) => teams.map(t => ({ ...t, group })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=standings.csv');
      return res.send(toCSV(rows, [
        { key: 'group', label: 'Group' }, { key: 'name', label: 'Team' },
        { key: 'played', label: 'Played' }, { key: 'wins', label: 'Wins' },
        { key: 'losses', label: 'Losses' }, { key: 'pts', label: 'Points' }
      ]));
    }
    res.json(sorted);
  } catch (e) { next(e); }
});

router.get('/leaderboard', auth, async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const players = await prisma.player.findMany({
      orderBy: [{ wins: 'desc' }, { elo: 'desc' }],
      select: { id: true, displayName: true, elo: true, rank: true, wins: true, losses: true, mvps: true, discordId: true }
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
      return res.send(toCSV(players, [
        { key: 'displayName', label: 'Name' }, { key: 'rank', label: 'Rank' },
        { key: 'elo', label: 'ELO' }, { key: 'wins', label: 'Wins' },
        { key: 'losses', label: 'Losses' }, { key: 'mvps', label: 'MVPs' }
      ]));
    }
    res.json(players.map((p, i) => ({ rank: i + 1, ...p })));
  } catch (e) { next(e); }
});

router.get('/matches', auth, async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const matches = await prisma.match.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 500
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=matches.csv');
      return res.send(toCSV(matches, [
        { key: 'id', label: 'ID' }, { key: 'team1Name', label: 'Team 1' },
        { key: 'team2Name', label: 'Team 2' }, { key: 'score1', label: 'Score 1' },
        { key: 'score2', label: 'Score 2' }, { key: 'winner', label: 'Winner' },
        { key: 'map', label: 'Map' }, { key: 'status', label: 'Status' },
        { key: 'round', label: 'Round' }, { key: 'group', label: 'Group' },
        { key: 'scheduledAt', label: 'Scheduled' }, { key: 'createdAt', label: 'Created' }
      ]));
    }
    res.json(matches);
  } catch (e) { next(e); }
});

module.exports = router;
