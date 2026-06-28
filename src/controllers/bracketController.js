const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');

exports.getBracket = async (req, res) => {
  const bracket = await prisma.setting.findUnique({ where: { key: 'bracket' } });
  if (bracket) return res.json(JSON.parse(bracket.value));
  res.json({ groups: {}, semis: [], final: null, champion: null });
};

exports.updateBracket = async (req, res) => {
  const data = req.body;
  await prisma.setting.upsert({
    where: { key: 'bracket' },
    update: { value: JSON.stringify(data) },
    create: { key: 'bracket', value: JSON.stringify(data) }
  });
  res.json({ message: 'Bracket updated' });
};

exports.generatePlayoffs = async (req, res, next) => {
  try {
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

    // Sort each group, take top 2
    const topTeams = [];
    for (const [g, teams] of Object.entries(groups)) {
      const sorted = Object.entries(teams)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.pts - a.pts);
      topTeams.push({ group: g, first: sorted[0]?.name, second: sorted[1]?.name });
    }

    if (topTeams.length < 2) {
      return res.status(400).json({ error: 'Cần ít nhất 2 bảng để tạo playoff' });
    }

    // Cross-bracket: A1 vs B2, B1 vs A2
    const semis = [
      { team1Name: topTeams[0].first, team2Name: topTeams[1].second, round: 'semifinal', group: 'playoff', status: 'pending' },
      { team1Name: topTeams[1].first, team2Name: topTeams[0].second, round: 'semifinal', group: 'playoff', status: 'pending' }
    ];

    for (const s of semis) {
      const existing = await prisma.match.findFirst({ where: { round: 'semifinal', group: 'playoff', team1Name: s.team1Name, team2Name: s.team2Name } });
      if (!existing) {
        await prisma.match.create({ data: s });
      }
    }

    // Final (placeholder)
    const finalExists = await prisma.match.findFirst({ where: { round: 'final' } });
    if (!finalExists) {
      await prisma.match.create({ data: { id: 'playoff-final', team1Name: 'TBD1', team2Name: 'TBD2', round: 'final', group: 'playoff', status: 'pending' } });
    }

    const bracketData = { groups: topTeams, semis, final: { team1Name: 'TBD1', team2Name: 'TBD2' }, champion: null };
    await prisma.setting.upsert({
      where: { key: 'bracket' },
      update: { value: JSON.stringify(bracketData) },
      create: { key: 'bracket', value: JSON.stringify(bracketData) }
    });

    const io = getIO();
    if (io) io.emit('bracket:generated', bracketData);
    res.json(bracketData);
  } catch (e) {
    next(e);
  }
};
