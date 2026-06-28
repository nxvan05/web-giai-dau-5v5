const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getTeams, updateTeams, listAll, createTeam, approveTeam, rejectTeam, saveKDA, getKDA } = require('../controllers/teamController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Old auto-draft routes (auth required)
router.get('/', auth, getTeams);
router.put('/', auth, updateTeams);

// New team registration (create is public, list/approve/reject need auth)
router.get('/all', listAll);
router.post('/',
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

// KDA routes
router.get('/kda/:matchId', getKDA);
router.put('/kda/:matchId', auth, saveKDA);

module.exports = router;
