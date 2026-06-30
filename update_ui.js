const fs = require('fs');
const path = require('path');

// 1. Update players.js /refresh-rank
const plPath = path.join(__dirname, 'src', 'routes', 'players.js');
let pl = fs.readFileSync(plPath, 'utf8');

pl = pl.replace(
  "const newRank = currentRank || peakRank || 'Unknown';\n      await prisma.player.update({ where: { id: player.id }, data: { rank: newRank, peakRank: peakRank || \nplayer.peakRank } });",
  "const newRank = currentRank || peakRank || 'Unknown';\n      let cardUrl = undefined, accountLevel = undefined;\n      try { const acc = await henrikRequest(`/valorant/v1/account/${name}/${tag}`); cardUrl = acc?.card?.large; accountLevel = acc?.account_level; } catch(e){}\n      const data = { rank: newRank, peakRank: peakRank || player.peakRank };\n      if(cardUrl) data.cardUrl = cardUrl;\n      if(accountLevel) data.accountLevel = accountLevel;\n      await prisma.player.update({ where: { id: player.id }, data });"
);
fs.writeFileSync(plPath, pl, 'utf8');

// 2. Update app.js renderProfile
const appPath = path.join(__dirname, 'public', 'js', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

app = app.replace(
  `<div class="bg-valCard border border-gray-800 rounded-2xl shadow-xl overflow-hidden relative group">`,
  `<div class="bg-valCard border border-gray-800 rounded-2xl shadow-xl overflow-hidden relative group">
                \${player.cardUrl ? \`<div class="absolute inset-0 z-0 opacity-20 bg-cover bg-center transition duration-500 group-hover:opacity-30" style="background-image: url('\${player.cardUrl}')"></div>\` : ''}
                <div class="relative z-10">`
);

app = app.replace(
  `</div>\n                    </div>\n                    <div class="mt-6 flex flex-wrap gap-2">`,
  `</div>\n                    </div>\n                    <div class="mt-6 flex flex-wrap gap-2"></div>\n                </div>`
);

app = app.replace(
  `<div class="flex justify-between items-start mb-6">`,
  `<div class="flex justify-between items-start mb-6">
                            <div class="flex items-center gap-3">
                                \${player.cardUrl ? \`<img src="\${player.cardUrl}" class="w-16 h-16 rounded-lg object-cover border border-gray-700 shadow-md">\` : ''}
                                <div>
                                    <h3 class="font-display text-2xl font-black text-white">\${player.displayName}</h3>
                                    <p class="text-valCyan text-sm font-mono">\${player.riotId} \${player.accountLevel ? \`<span class="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300 border border-gray-700">Lv \${player.accountLevel}</span>\` : ''}</p>
                                </div>
                            </div>`
);

app = app.replace(
  `<h3 class="font-display text-2xl font-black text-white">\${player.displayName}</h3>\n                                <p class="text-valCyan text-sm font-mono">\${player.riotId}</p>`,
  ``
);

fs.writeFileSync(appPath, app, 'utf8');
console.log('Updated refresh-rank and renderProfile');
