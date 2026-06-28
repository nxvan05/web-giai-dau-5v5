const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/:matchId', async (req, res, next) => {
  try {
    const entry = await prisma.setting.findUnique({ where: { key: 'veto_' + req.params.matchId } });
    res.json(entry ? JSON.parse(entry.value) : { phase: 0, maps: {}, log: [], active: false });
  } catch (e) { next(e); }
});

router.put('/:matchId', auth,
  body().isObject().withMessage('Body must be an object'),
  validate,
  async (req, res, next) => {
  try {
    const data = req.body;
    await prisma.setting.upsert({
      where: { key: 'veto_' + req.params.matchId },
      update: { value: JSON.stringify(data) },
      create: { key: 'veto_' + req.params.matchId, value: JSON.stringify(data) }
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:matchId', auth, async (req, res, next) => {
  try {
    await prisma.setting.deleteMany({ where: { key: 'veto_' + req.params.matchId } });
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
