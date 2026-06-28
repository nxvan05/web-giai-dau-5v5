const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/', async (req, res, next) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const [penalties, total] = await Promise.all([
      prisma.penalty.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.penalty.count()
    ]);
    res.json(paginatedResponse(penalties, page, limit, total));
  } catch (e) { next(e); }
});

router.post('/', auth,
  body('playerId').trim().notEmpty().withMessage('playerId required'),
  body('reason').trim().notEmpty().withMessage('Reason required'),
  validate,
  async (req, res, next) => {
  try {
    const { playerId, playerName, reason, severity } = req.body;
    if (!playerId || !reason) return res.status(400).json({ error: 'playerId and reason are required' });
    const p = await prisma.penalty.create({
      data: { playerId, playerName: playerName || 'Unknown', reason, severity: severity || 'warning' }
    });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('penalty:added', p);
    res.status(201).json(p);
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.penalty.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
