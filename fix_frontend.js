const fs = require('fs');
const path = 'C:\Users\Evan\Downloads\giải 5v5 deep\wed giai 5v5\public\js\app.js';
let code = fs.readFileSync(path, 'utf8');

// Fix 1: Add duration declaration in generateSchedule (line ~1197)
// Find the line with "const fmt" in generateSchedule and add duration before it
code = code.replace(
  /(const startDate = document\.getElementById\('sched-date'\)\.value;\n)(    const fmt)/,
  '$1    const duration = parseInt(document.getElementById(\'sched-duration\').value) || 60;\n$2'
);

// Fix 2: Replace optional chaining with ternary for fmt
code = code.replace(
  /const fmt = document\.getElementById\('sched-format'\)\?\.value \|\| 'round-robin';/g,
  "const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';"
);

// Fix 3: Update renderSchedule - add format selector and Swiss button
const oldBtn = `<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button></div>`;

const newBtn = `<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Định dạng</label>
<select id="sched-format" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">
<option value="round-robin">Vòng tròn</option>
<option value="swiss">Swiss</option>
</select></div>
<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button>
<button onclick="generateSwissRound()" class="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition mt-1">
<i class="fa-solid fa-shuffle mr-1"></i>Vòng Swiss</button></div>`;

code = code.replace(oldBtn, newBtn);

fs.writeFileSync(path, code);
console.log('Frontend fixes applied successfully!');
