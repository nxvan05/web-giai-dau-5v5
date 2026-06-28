const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const pc = require('../controllers/playerController');

router.get('/', auth, pc.getAll);
router.get('/profile/:discordId', pc.getProfile);

router.post('/', auth,
  body('displayName').trim().notEmpty().withMessage('Display name required'),
  body('discordId').trim().notEmpty().withMessage('Discord ID required'),
  body('riotId').trim().notEmpty().withMessage('Riot ID required'),
  validate,
  pc.create
);

router.put('/:id', auth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.patch('/:id', auth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.delete('/:id', auth, pc.delete);

router.get('/lookup/:discordId', async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.params.discordId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (e) { next(e); }
});

router.get('/free-agents', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: null },
      orderBy: { elo: 'desc' }
    });
    res.json(players);
  } catch (e) { next(e); }
});

router.get('/by-team/:teamName', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: req.params.teamName }
    });
    res.json(players);
  } catch (e) { next(e); }
});

module.exports = router;
