const fs = require('fs');
const path = require('path');

const dcPath = path.join(__dirname, 'src', 'controllers', 'discordController.js');
let dc = fs.readFileSync(dcPath, 'utf8');

// Replace exports.me logic
const oldMe = `exports.me = (req, res) => {
  res.json({ user: req.discordUser });
};`;

const newMe = `exports.me = (req, res) => {
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim());
  const isAdmin = adminIds.includes(req.discordUser.discordId);
  res.json({ user: { ...req.discordUser, isAdmin } });
};`;

if (dc.includes(oldMe)) {
  dc = dc.replace(oldMe, newMe);
  fs.writeFileSync(dcPath, dc, 'utf8');
  console.log('Updated exports.me in discordController.js');
} else {
  // Let's do a regex replacement in case spacing is slightly different
  dc = dc.replace(/exports\.me\s*=\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ user: req\.discordUser \}\);[\s\S]*?\};/, newMe);
  fs.writeFileSync(dcPath, dc, 'utf8');
  console.log('Regex updated exports.me in discordController.js');
}
