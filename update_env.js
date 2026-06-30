const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let env = fs.readFileSync(envPath, 'utf8');

if (!env.includes('ADMIN_DISCORD_IDS')) {
  env += '\nADMIN_DISCORD_IDS="759272152393318410"\n';
  fs.writeFileSync(envPath, env, 'utf8');
  console.log('Added ADMIN_DISCORD_IDS to .env');
} else {
  console.log('ADMIN_DISCORD_IDS already in .env');
}
