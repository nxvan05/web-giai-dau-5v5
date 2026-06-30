const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const orAuth = require('../middleware/orAuth');
const discordAuth = require('../middleware/discordAuth');
const { getCheckins, toggleCheckin, removeCheckin } = require('../controllers/checkinController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');



router.get('/:matchId', orAuth, getCheckins);
router.post('/:matchId',
  orAuth,
  body('discordId').trim().notEmpty().withMessage('discordId required'),
  validate,
  toggleCheckin
);
router.delete('/:matchId/:discordId', orAuth, removeCheckin);

module.exports = router;
