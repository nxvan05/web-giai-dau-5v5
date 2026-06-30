const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAll, getSetting, updateSetting, resetTournament } = require('../controllers/settingsController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/reset-tournament', auth, resetTournament);

router.get('/', auth, getAll);
router.get('/:key', auth, getSetting);
router.put('/:key', auth,
  body('value').notEmpty().withMessage('Value is required'),
  validate,
  updateSetting
);

module.exports = router;
