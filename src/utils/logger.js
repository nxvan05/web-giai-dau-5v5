const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = process.env.LOG_LEVEL || 'info';

function log(level, message, meta = {}) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  const color = colors[level === 'debug' ? 'dim' : level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'cyan'];
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  console.log(`${color}[${ts}] [${level.toUpperCase()}]${colors.reset} ${message}${metaStr ? ` ${colors.dim}${metaStr}${colors.reset}` : ''}`);
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
