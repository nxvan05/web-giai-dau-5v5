const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendWebhook } = require('../controllers/webhookController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/', auth,
  body('action').trim().notEmpty().withMessage('Action required'),
  validate,
  sendWebhook
);
module.exports = router;