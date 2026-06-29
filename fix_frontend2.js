const fs = require('fs');
const path = 'C:\Users\Evan\Downloads\giải 5v5 deep\wed giai 5v5\public\js\app.js';
let code = fs.readFileSync(path, 'utf8');

// Fix 1: Add duration declaration before fmt in generateSchedule
const oldLine = '  const startDate = document.getElementById(\'sched-date\').value;\n  const fmt = document.getElementById(\'sched-format\')';
const newLine = '  const startDate = document.getElementById(\'sched-date\').value;\n  const duration = parseInt(document.getElementById(\'sched-duration\').value) || 60;\n  const fmt = document.getElementById(\'sched-format\')';
code = code.replace(oldLine, newLine);

// Fix 2: Update renderSchedule to add format selector and Swiss button
const oldBtn = '<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>\n<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">\n<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button></div>';
const newBtn = '<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Định dạng</label>\n<select id="sched-format" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">\n<option value="round-robin">Vòng tròn</option>\n<option value="swiss">Swiss</option>\n</select></div>\n<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>\n<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">\n<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button>\n<button onclick="generateSwissRound()" class="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition mt-1">\n<i class="fa-solid fa-shuffle mr-1"></i>Vòng Swiss</button></div>';
code = code.replace(oldBtn, newBtn);

fs.writeFileSync(path, code);
console.log('Done!');
