const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { login, logout, me } = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/login',
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
  login
);
router.post('/logout', logout);
router.get('/me', auth, me);
module.exports = router;