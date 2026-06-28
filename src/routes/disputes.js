const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

function orAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  const discord = req.cookies?.discord_token;
  const jwt = require('jsonwebtoken');
  try { if (token) { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); } } catch(_) {}
  try { if (discord) { const d = jwt.verify(discord, process.env.JWT_SECRET); if (d.type === 'discord') { req.discordUser = d; return next(); } } } catch(_) {}
  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
}

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
    const { createAudit } = require('../utils/audit');
    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: { status, resolution }
    });
    await createAudit(`Dispute ${req.params.id}: ${status}`);
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('dispute:updated', dispute);
    res.json(dispute);
  } catch (e) { next(e); }
});

module.exports = router;
