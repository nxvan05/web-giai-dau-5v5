const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCheckins, toggleCheckin, removeCheckin } = require('../controllers/checkinController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/:matchId', auth, getCheckins);
router.post('/:matchId',
  body('discordId').trim().notEmpty().withMessage('discordId required'),
  validate,
  toggleCheckin
);
router.delete('/:matchId/:discordId', auth, removeCheckin);

module.exports = router;
