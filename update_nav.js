const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Remove the 4 tabs from the main <nav> element
// Register Tab
indexHtml = indexHtml.replace(/<button onclick="switchTab\('register-tab'\)" id="btn-register-tab"[\s\S]*?<\/button>/, '');
// Admin Tab
indexHtml = indexHtml.replace(/<button onclick="switchTab\('admin-tab'\)" id="btn-admin-tab"[\s\S]*?<\/button>/, '');
// Veto Tab
indexHtml = indexHtml.replace(/<button onclick="switchTab\('veto-tab'\)" id="btn-veto-tab"[\s\S]*?<\/button>/, '');
// Stream Tab
indexHtml = indexHtml.replace(/<button onclick="switchTab\('stream-tab'\)" id="btn-stream-tab"[\s\S]*?<\/button>/, '');

// 2. Insert CTA Button for Registration next to Auth Section
const authSectionRegex = /<div id="auth-section"/;
const ctaButtonHTML = `
                <!-- CTA Đăng Ký -->
                <button onclick="switchTab('register-tab')" id="btn-nav-register" class="hidden sm:flex items-center gap-2 bg-valRed/90 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-black tracking-wide shadow-[0_0_15px_rgba(255,70,85,0.4)] transition-all transform hover:scale-105 border border-valRed/50">
                    <i class="fa-solid fa-fire animate-pulse text-yellow-300"></i> GHI DANH NGAY
                </button>
                <div id="auth-section"`;
indexHtml = indexHtml.replace(authSectionRegex, ctaButtonHTML);

// 3. Add hidden tabs to User Dropdown Menu
const dropdownDividerRegex = /<div class="user-dropdown-divider"><\/div>\s*<button onclick="logoutDiscord\(\);/;
const dropdownItems = `
                        <button onclick="switchTab('admin-tab'); closeUserMenu()" class="user-dropdown-item"><i class="fa-solid fa-crown text-yellow-400 w-4 text-center"></i> Quản Trị (Admin)</button>
                        <button onclick="switchTab('stream-tab'); closeUserMenu()" class="user-dropdown-item"><i class="fa-solid fa-tower-broadcast text-purple-400 w-4 text-center"></i> Stream Booth</button>
                        <button onclick="switchTab('veto-tab'); closeUserMenu()" class="user-dropdown-item"><i class="fa-solid fa-map-location-dot text-amber-400 w-4 text-center"></i> VETO BO3</button>
                        <div class="user-dropdown-divider"></div>
                        <button onclick="logoutDiscord();`;
indexHtml = indexHtml.replace(dropdownDividerRegex, dropdownItems);

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Updated index.html Navigation');

// 4. Update app.js to include Veto button in pending match cards
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const matchCardRenderRegex = /<div class="\$\{bgClass\} border \$\{borderClass\} p-4 rounded-xl mb-4 transition-all relative overflow-hidden">/;
const newMatchCardRender = `<div class="\${bgClass} border \${borderClass} p-4 rounded-xl mb-4 transition-all relative overflow-hidden">
                \${!isCompleted && !m.map && type === 'pending' ? \`<button onclick="switchTab('veto-tab'); document.getElementById('veto-match-select').value='\${m.id}'; onSelectVetoMatch();" class="absolute top-2 left-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-400/30 px-2 py-1 rounded text-[9px] font-bold z-10 transition"><i class="fa-solid fa-map-location-dot"></i> VETO</button>\` : ''}`;

if (appJs.includes('<div class="${bgClass} border ${borderClass} p-4 rounded-xl mb-4 transition-all relative overflow-hidden">')) {
    appJs = appJs.replace(matchCardRenderRegex, newMatchCardRender);
    fs.writeFileSync(appJsPath, appJs, 'utf8');
    console.log('Updated app.js Veto button integration');
}

