const fs = require('fs');
const path = require('path');

// 1. Update playerController.js
const pcPath = path.join(__dirname, 'src', 'controllers', 'playerController.js');
let pc = fs.readFileSync(pcPath, 'utf8');

pc = pc.replace(
  "const { displayName, riotId, rank, role, type, pts, peakRank } = req.body;",
  "const { displayName, riotId, rank, role, type, pts, peakRank, cardUrl, accountLevel } = req.body;"
);
pc = pc.replace(
  "const data = {\n    displayName, discordId, riotId, rank, role, type, pts: parseInt(pts) || 0\n  };",
  "const data = {\n    displayName, discordId, riotId, rank, role, type, pts: parseInt(pts) || 0, cardUrl: cardUrl || '', accountLevel: parseInt(accountLevel) || 0\n  };"
);
pc = pc.replace(
  "['displayName', 'riotId', 'rank', 'role', 'type']",
  "['displayName', 'riotId', 'rank', 'role', 'type', 'cardUrl', 'accountLevel']"
);
fs.writeFileSync(pcPath, pc, 'utf8');

// 2. Update players.js (PUT /me)
const plPath = path.join(__dirname, 'src', 'routes', 'players.js');
let pl = fs.readFileSync(plPath, 'utf8');

pl = pl.replace(
  "const { displayName, riotId, rank, role } = req.body;",
  "const { displayName, riotId, rank, role, cardUrl, accountLevel } = req.body;"
);
pl = pl.replace(
  "if (role !== undefined) data.role = role;",
  "if (role !== undefined) data.role = role;\n        if (cardUrl !== undefined) data.cardUrl = cardUrl;\n        if (accountLevel !== undefined) data.accountLevel = parseInt(accountLevel);"
);
fs.writeFileSync(plPath, pl, 'utf8');

console.log('Updated controllers to save cardUrl and accountLevel');
