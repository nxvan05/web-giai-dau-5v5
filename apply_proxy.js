const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'controllers', 'discordController.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const tokenResp = await fetch('https://discord.com/api/oauth2/token', {",
  "const tokenResp = await fetch('https://young-silence-7da5.vandzvl09.workers.dev/api/oauth2/token', {"
);

content = content.replace(
  "const userResp = await fetch('https://discord.com/api/users/@me', {",
  "const userResp = await fetch('https://young-silence-7da5.vandzvl09.workers.dev/api/users/@me', {"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Applied Proxy to discordController.js');
