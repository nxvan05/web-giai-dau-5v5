const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const orAuth = require('../middleware/orAuth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { body } = require('express-validator');
const validate = require('../middleware/validate');



router.get('/', orAuth, async (req, res, next) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.dispute.count()
    ]);
    res.json(paginatedResponse(disputes, page, limit, total));
  } catch (e) { next(e); }
});

router.post('/',
  orAuth,
  body('matchId').trim().notEmpty().withMessage('matchId required'),
  body('teamName').trim().notEmpty().withMessage('teamName required'),
  body('filedBy').trim().notEmpty().withMessage('filedBy required'),
  body('reason').trim().notEmpty().withMessage('Reason required'),
  validate,
  async (req, res, next) => {
  try {
    const { matchId, teamName, reason, detail, filedBy } = req.body;
    if (!matchId || !teamName || !reason || !filedBy) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }
    const dispute = await prisma.dispute.create({
      data: { matchId, teamName, reason, detail, filedBy }
    });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('dispute:created', dispute);
    try { const { createNotification } = require('./notifications'); createNotification('dispute_filed', `Khiếu nại từ ${teamName}: ${reason}`, { matchId, teamName }); } catch(e) {}
    res.json(dispute);
  } catch (e) { next(e); }
});

router.put('/:id', auth,
  body('status').optional().trim().notEmpty().withMessage('Status cannot be empty'),
  validate,
  async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const { logAction } = require('../utils/audit');
    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: { status, resolution }
    });
    await logAction(`Dispute ${req.params.id}: ${status}`);
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('dispute:updated', dispute);
    res.json(dispute);
  } catch (e) { next(e); }
});

module.exports = router;
