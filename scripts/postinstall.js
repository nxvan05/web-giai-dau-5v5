const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');

function chmodPrismaEngines() {
  if (process.platform === 'win32') return;

  const enginesDir = path.join(rootDir, 'node_modules', '@prisma', 'engines');
  try {
    for (const entry of fs.readdirSync(enginesDir)) {
      const enginePath = path.join(enginesDir, entry);
      try {
        if (fs.statSync(enginePath).isFile()) {
          fs.chmodSync(enginePath, 0o755);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

function runPrisma(args) {
  execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: rootDir,
    stdio: 'inherit'
  });
}

try {
  chmodPrismaEngines();
  runPrisma(['generate']);
  runPrisma(['db', 'push']);
} catch (error) {
  console.warn('prisma setup failed (non-fatal)');
  if (error && error.message) {
    console.warn(error.message);
  }
}
