const fs = require('fs');
const path = 'C:\\Users\\Evan\\Downloads\\giải 5v5 deep\\wed giai 5v5\\public\\js\\app.js';

let code = fs.readFileSync(path, 'utf8');

// Fix 1: generateSchedule - add missing duration variable declaration
const oldGen = `  const startDate = document.getElementById('sched-date').value;
  const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';

  try {
    await api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: fmt } });`;

const newGen = `  const startDate = document.getElementById('sched-date').value;
  const duration = parseInt(document.getElementById('sched-duration').value) || 60;
  const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';

  try {
    await api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: fmt } });`;

code = code.replace(oldGen, newGen);

// Fix 2: renderSchedule - add format selector dropdown + Swiss button
const oldControls = `<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Phút/trận</label>
<input type="number" id="sched-duration" value="60" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button></div>`;

const newControls = `<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Phút/trận</label>
<input type="number" id="sched-duration" value="60" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Hình thức</label>
<select id="sched-format" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">
<option value="round-robin">Vòng tròn</option>
<option value="swiss">Swiss</option>
</select></div>
<div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
<button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
<i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button>
<button onclick="generateSwissRound()" class="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition mt-1">
<i class="fa-solid fa-shuffle mr-1"></i>Vòng Swiss</button></div>`;

code = code.replace(oldControls, newControls);

// Fix 3: generateSwissRound - replace optional chaining with ternary
const oldSwissRef = `const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';`;
code = code.split(oldSwissRef).join(`const fmt = 'swiss';`);

fs.writeFileSync(path, code);
console.log('Done! Fixed 3 issues in app.js');
