// Auto-update: set git tracking and pull latest code
try {
  const { execSync } = require('child_process');
  execSync('git config branch.master.remote origin 2>/dev/null', { stdio: 'ignore' });
  execSync('git config branch.master.merge refs/heads/master 2>/dev/null', { stdio: 'ignore' });
  execSync('git pull --ff-only 2>/dev/null', { stdio: 'ignore' });
  execSync('npx prisma db push 2>/dev/null', { stdio: 'ignore' });
} catch (_) {}

const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http' && !req.headers.host?.startsWith('localhost')) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const corsOptions = {
  origin: isProduction ? FRONTEND_URL : true,
  credentials: true
};
app.use(cors(corsOptions));

app.use(cookieParser());

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, message: { error: 'Too many requests, try again later' } });
app.use('/api', apiLimiter);

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Too many login attempts, try again later' } });

app.use(express.json({ limit: '1mb' }));

const { sanitizeBody } = require('./middleware/sanitize');
app.use((req, res, next) => { if (req.body) req.body = sanitizeBody(req.body); next(); });

app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: isProduction ? '1d' : 0,
  etag: true
}));

app.use('/api/auth/login', authLimiter, require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/bracket', require('./routes/bracket'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/penalties', require('./routes/penalties'));
app.use('/api/veto', require('./routes/veto'));
app.use('/api/notify', require('./routes/notifications'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/discord', require('./routes/discord'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/valorant', require('./routes/valorant'));

app.get('/api/health', async (req, res) => {
  try {
    const prisma = require('./utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', time: new Date().toISOString(), db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', time: new Date().toISOString(), db: 'disconnected', error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: isProduction ? 'Internal server error' : err.message });
});

const PORT = process.env.PORT || 5000;

const { initSocket } = require('./utils/socket');

const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

let server;
if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  server = https.createServer(httpsOptions, app);
  console.log('HTTPS mode enabled');
} else {
  server = http.createServer(app);
  if (isProduction) {
    console.warn('WARNING: Running without HTTPS in production. Set SSL_CERT_PATH and SSL_KEY_PATH.');
  }
}

initSocket(server, FRONTEND_URL);

// Start Discord bot
const discordBot = require('./discord/bot');
discordBot.start();

// Start match reminder loop (uses Discord bot for DMs)
const discordReminder = require('./discord/reminder');
discordReminder.startReminderLoop(discordBot);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => console.log('HTTP server closed'));
  try {
    const prisma = require('./utils/prisma');
    await prisma.$disconnect();
    console.log('Prisma disconnected');
  } catch (e) {
    console.error('Error during shutdown:', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
