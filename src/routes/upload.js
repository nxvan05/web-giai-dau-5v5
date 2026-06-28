const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'logo_' + Date.now() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'), false);
    cb(null, true);
  },
});

router.post('/team-logo', auth, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const teamName = req.body.teamName;
    const url = '/uploads/' + req.file.filename;
    if (teamName) {
      const team = await prisma.team.findUnique({ where: { name: teamName } });
      if (team) {
        await prisma.team.update({ where: { name: teamName }, data: { logo: url } });
      }
    }
    res.json({ url, filename: req.file.filename });
  } catch (e) { next(e); }
});

module.exports = router;
