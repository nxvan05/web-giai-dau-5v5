const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getPagination, paginatedResponse } = require('../utils/pagination');

router.get('/', auth, async (req, res, next) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.auditLog.count()
    ]);
    res.json(paginatedResponse(logs, page, limit, total));
  } catch (e) { next(e); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { action, detail } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });
    const log = await prisma.auditLog.create({ data: { action, detail: String(detail || '').slice(0, 500) } });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

module.exports = router;
