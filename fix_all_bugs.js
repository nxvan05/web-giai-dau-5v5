const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// ===== FIX 1: window.onload =====
// Old: references btn-admin-tab, admin-trigger-btn, /api/auth/me (all obsolete)
const oldOnload = `        window.onload = async function() {
              loadTournamentData();
              if (apiToken) {
                  try {
                      const me = await api('/api/auth/me');
                      document.getElementById('btn-admin-tab').classList.remove('hidden');
                      document.getElementById('admin-trigger-btn').innerHTML = \`<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập\`;
                      await syncLocalToAPI();
                      await loadPlayers();
                      renderAdmin();
                  } catch(e) {
                      apiToken = null;
                      localStorage.removeItem('evan_api_token');
                  }
              }
          };`;

const newOnload = `        window.onload = async function() {
              loadTournamentData();
              // Admin is now managed by Discord login (checkDiscordLogin).
              // No need to call /api/auth/me with old token.
          };`;

if (appJs.includes(oldOnload)) {
    appJs = appJs.replace(oldOnload, newOnload);
    console.log('FIX 1: Replaced window.onload (exact match)');
} else {
    // Fallback: regex
    appJs = appJs.replace(
        /window\.onload\s*=\s*async function\(\)\s*\{[\s\S]*?loadTournamentData\(\);[\s\S]*?if\s*\(apiToken\)[\s\S]*?catch\(e\)\s*\{[\s\S]*?localStorage\.removeItem\('evan_api_token'\);[\s\S]*?\}\s*\}\s*\};/m,
        newOnload
    );
    console.log('FIX 1: Replaced window.onload (regex)');
}

// ===== FIX 2: drawTeam - guard against missing elements =====
const oldDrawTeam = `            const drawTeam = (arr, id, ptsId, stId, num) => {
                  let pts = 0; document.getElementById(id).innerHTML = '';`;
const newDrawTeam = `            const drawTeam = (arr, id, ptsId, stId, num) => {
                  const el = document.getElementById(id);
                  if (!el) return;
                  let pts = 0; el.innerHTML = '';`;

if (appJs.includes(oldDrawTeam)) {
    appJs = appJs.replace(oldDrawTeam, newDrawTeam);
    console.log('FIX 2a: Added null guard to drawTeam');
} else {
    console.log('FIX 2a: drawTeam target not found, skipping');
}

// Also guard where drawTeam sets innerHTML inside the loop
appJs = appJs.replace(
    /document\.getElementById\(id\)\.innerHTML \+=/g,
    'el.innerHTML +='
);
console.log('FIX 2b: Replaced all document.getElementById(id).innerHTML += with el.innerHTML +=');

// Guard ptsId and stId
const oldPts = `                  document.getElementById(ptsId).innerText = pts+'đ';
                  const st = document.getElementById(stId);`;
const newPts = `                  const ptsEl = document.getElementById(ptsId);
                  if (ptsEl) ptsEl.innerText = pts+'đ';
                  const st = document.getElementById(stId);
                  if (!st) return;`;

if (appJs.includes(oldPts)) {
    appJs = appJs.replace(oldPts, newPts);
    console.log('FIX 2c: Added null guards to ptsId/stId');
} else {
    console.log('FIX 2c: ptsId target not found, skipping');
}

// ===== FIX 3: requireAdminAuth =====
// Replace any version that still calls openAdminLoginModal
appJs = appJs.replace(
    /function requireAdminAuth\(\)\s*\{[\s\S]*?if\s*\(apiToken\)\s*return true;[\s\S]*?return false;[\s\S]*?\}/m,
    `function requireAdminAuth() {
            if (apiToken) return true;
            if (discordUser && discordUser.isAdmin) {
                apiToken = 'discord_admin';
                return true;
            }
            showToast('Bạn không có quyền Admin!', 'error');
            return false;
          }`
);
console.log('FIX 3: Fixed requireAdminAuth');

// ===== FIX 4: Remove leftover reference to apiLogin in checkAdminPassword =====
// Already replaced to empty function, but let's make sure
if (appJs.includes('async function checkAdminPassword()') && !appJs.includes("async function checkAdminPassword() {}")) {
    appJs = appJs.replace(
        /async function checkAdminPassword\(\)\s*\{[\s\S]*?\}/m,
        'async function checkAdminPassword() {}'
    );
    console.log('FIX 4: Cleaned up checkAdminPassword');
}

// ===== FIX 5: Remove let apiToken from loading localStorage =====
// The problem: on page load, apiToken gets set from localStorage (old admin token),
// then window.onload tries /api/auth/me, fails, sets apiToken=null.
// Even though we fixed onload, the stale token in localStorage causes issues.
// Solution: Don't load old token from localStorage. Admin is now Discord-based.
const oldApiTokenInit = `        let apiToken = localStorage.getItem('evan_api_token');`;
const newApiTokenInit = `        let apiToken = null; // Admin auth is now Discord-based`;

if (appJs.includes(oldApiTokenInit)) {
    appJs = appJs.replace(oldApiTokenInit, newApiTokenInit);
    console.log('FIX 5: Removed localStorage apiToken load');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('\nAll fixes applied!');
