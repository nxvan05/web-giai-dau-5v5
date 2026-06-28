const express = require('express');
const router = express.Router();
const discordAuth = require('../middleware/discordAuth');
const dc = require('../controllers/discordController');

router.get('/auth-url', dc.getAuthUrl);
router.get('/callback', dc.callback);
router.get('/me', discordAuth, dc.me);
router.post('/logout', dc.logout);

module.exports = router;
