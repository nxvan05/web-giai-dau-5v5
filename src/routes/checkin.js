const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const { getCheckins, toggleCheckin, removeCheckin } = require('../controllers/checkinController');
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

router.get('/:matchId', orAuth, getCheckins);
router.post('/:matchId',
  orAuth,
  body('discordId').trim().notEmpty().withMessage('discordId required'),
  validate,
  toggleCheckin
);
router.delete('/:matchId/:discordId', orAuth, removeCheckin);

module.exports = router;
