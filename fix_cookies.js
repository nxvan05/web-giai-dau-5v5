const fs = require('fs');
const path = require('path');

const filesToFix = [
  path.join(__dirname, 'src', 'controllers', 'discordController.js'),
  path.join(__dirname, 'src', 'controllers', 'authController.js')
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/secure: process\.env\.NODE_ENV === 'production'/g, "secure: process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https'");
    content = content.replace(/secure: isProduction/g, "secure: process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https'");
    fs.writeFileSync(file, content, 'utf8');
  }
}
console.log('Fixed cookie secure flags');
