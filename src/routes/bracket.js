const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBracket, updateBracket, generatePlayoffs } = require('../controllers/bracketController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/', getBracket);
router.put('/', auth,
  body().isObject().withMessage('Body must be an object'),
  validate,
  updateBracket
);
router.post('/generate', auth,
  validate,
  generatePlayoffs
);

router.post('/advance', auth, async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
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

    const topTeams = [];
    for (const [g, teams] of Object.entries(groups)) {
      const sorted = Object.entries(teams).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.pts - a.pts);
      if (sorted.length < 2) continue;
      topTeams.push({ group: g, first: sorted[0].name, second: sorted[1].name });
    }

    if (topTeams.length < 2) return res.status(400).json({ error: 'Cần ít nhất 2 bảng' });

    const semis = [
      { team1Name: topTeams[0].first, team2Name: topTeams[1].second, round: 'semifinal', group: 'playoff', status: 'pending' },
      { team1Name: topTeams[1].first, team2Name: topTeams[0].second, round: 'semifinal', group: 'playoff', status: 'pending' }
    ];

    for (const s of semis) {
      const existing = await prisma.match.findFirst({ where: { round: 'semifinal', team1Name: s.team1Name, team2Name: s.team2Name } });
      if (!existing) await prisma.match.create({ data: s });
    }

    const finalExists = await prisma.match.findFirst({ where: { round: 'final' } });
    if (!finalExists) await prisma.match.create({ data: { team1Name: 'TBD1', team2Name: 'TBD2', round: 'final', group: 'playoff', status: 'pending' } });

    const { logAction } = require('../utils/audit');
    await logAction('bracket.advance', 'Auto-advanced from groups');
    res.json({ semis, message: 'Đã tạo vòng playoff từ bảng đấu' });
  } catch (e) { next(e); }
});

module.exports = router;
