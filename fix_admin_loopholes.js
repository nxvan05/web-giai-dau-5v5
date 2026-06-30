const fs = require('fs');
const path = require('path');

// Fix req.user?.role checks
const filesToPatch = [
  path.join(__dirname, 'src', 'controllers', 'checkinController.js'),
  path.join(__dirname, 'src', 'controllers', 'settingsController.js'),
  path.join(__dirname, 'src', 'routes', 'veto.js')
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/req\.user\?\.role !== 'admin'/g, '!req.user');
    content = content.replace(/req\.user && req\.user\.role === 'admin'/g, '!!req.user');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', path.basename(file));
  }
}

// Remove inline orAuth and require from middleware
const inlineOrAuthFiles = [
  path.join(__dirname, 'src', 'routes', 'checkin.js'),
  path.join(__dirname, 'src', 'routes', 'disputes.js'),
  path.join(__dirname, 'src', 'routes', 'notifications.js')
];

for (const file of inlineOrAuthFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it already requires orAuth
    if (!content.includes('require(\'../middleware/orAuth\')')) {
        // Find where other requires are, e.g. auth
        content = content.replace(/const auth = require\('\.\.\/middleware\/auth'\);/, "const auth = require('../middleware/auth');\nconst orAuth = require('../middleware/orAuth');");
    }

    // Remove the inline orAuth function
    // Use regex to remove function orAuth(req, res, next) { ... }
    content = content.replace(/function orAuth\(req, res, next\) \{[\s\S]*?return res\.status\(401\)\.json\(\{ error: '.*?Unauthorized.*?' \}\);[\s\n]*\}/, '');
    content = content.replace(/function orAuth\(req, res, next\) \{[\s\S]*?return res\.status\(401\)\.json\(\{ error: 'Vui lòng đăng nhập' \}\);[\s\n]*\}/, '');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Removed inline orAuth in', path.basename(file));
  }
}
