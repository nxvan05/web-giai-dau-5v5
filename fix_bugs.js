const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Add handleLogoError
if (!appJs.includes('function handleLogoError')) {
    appJs = `window.handleLogoError = function(img) { img.style.display = 'none'; };\n` + appJs;
}

// 2. Add switchAdminSubTab globally if it doesn't exist
const switchAdminFunc = `
function switchAdminSubTab(tab) {
    const groupMap = {
        'dashboard': ['admin-sub-dashboard'],
        'roster': ['admin-sub-players', 'admin-sub-teams'],
        'matches': ['admin-sub-veto', 'admin-sub-reports'],
        'system': ['admin-sub-config', 'admin-sub-discipline', 'admin-sub-data']
    };
    
    document.querySelectorAll('[id^="admin-sub-"]').forEach(el => {
        if (el.id.startsWith('admin-sub-') && !el.id.startsWith('admin-sub-btn')) {
            el.classList.add('hidden');
        }
    });
    
    if (groupMap[tab]) {
        groupMap[tab].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
    }
    
    document.querySelectorAll('[id^="admin-sub-btn-"]').forEach(btn => {
        btn.classList.remove('bg-valRed', 'text-white', 'glow-red');
        btn.classList.add('text-gray-400');
    });
    
    const btn = document.getElementById('admin-sub-btn-' + tab);
    if (btn) {
        btn.classList.remove('text-gray-400');
        btn.classList.add('bg-valRed', 'text-white', 'glow-red');
    }
    
    window.currentAdminSubTab = tab;
}
`;

if (!appJs.includes('function switchAdminSubTab')) {
    // Insert it before loadAdminDashboard
    appJs = appJs.replace('async function loadAdminDashboard()', switchAdminFunc + '\nasync function loadAdminDashboard()');
}

// 3. Remove drawTeam calls from renderAdmin
const drawTeamRegex1 = /drawTeam\(team1,\s*'team1-slots',\s*'team1-total-points',\s*'team1-status',\s*1\);/g;
const drawTeamRegex2 = /drawTeam\(team2,\s*'team2-slots',\s*'team2-total-points',\s*'team2-status',\s*2\);/g;

appJs = appJs.replace(drawTeamRegex1, '');
appJs = appJs.replace(drawTeamRegex2, '');

// Save app.js
fs.writeFileSync(appJsPath, appJs, 'utf8');

// 4. Rename Cân Bằng & Draft in index.html to Quản Trị (Admin)
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

indexHtml = indexHtml.replace('Cân Bằng &amp; Draft', 'Quản Trị (Admin)');
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

console.log('Fixed bugs successfully!');
