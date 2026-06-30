const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Add id="btn-admin-dropdown" and class hidden to the admin button
indexHtml = indexHtml.replace(
  `<button onclick="switchTab('admin-tab'); closeUserMenu()" class="user-dropdown-item"><i class="fa-solid fa-crown text-yellow-400 w-4 text-center"></i> Quản Trị (Admin)</button>`,
  `<button onclick="switchTab('admin-tab'); closeUserMenu()" id="btn-admin-dropdown" class="user-dropdown-item hidden"><i class="fa-solid fa-crown text-yellow-400 w-4 text-center"></i> Quản Trị (Admin)</button>`
);

// Remove the admin-login-modal HTML block
indexHtml = indexHtml.replace(
  /<div id="admin-login-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  ''
);

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('index.html patched.');

// 2. Update app.js
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Patch checkDiscordLogin success block
const targetMeBlock = `                  if (res.ok) {
                      const data = await res.json();
                      discordUser = data.user;
                      document.getElementById('discord-login-btn').classList.add('hidden');
                      const info = document.getElementById('discord-user-info');
                      info.classList.remove('hidden');
                      const avatar = document.getElementById('discord-avatar');
                      const username = document.getElementById('discord-username');`;

const newMeBlock = `                  if (res.ok) {
                      const data = await res.json();
                      discordUser = data.user;
                      
                      // Check admin status
                      if (discordUser.isAdmin) {
                          apiToken = 'discord_admin';
                          const adminBtn = document.getElementById('btn-admin-dropdown');
                          if (adminBtn) adminBtn.classList.remove('hidden');
                      } else {
                          const adminBtn = document.getElementById('btn-admin-dropdown');
                          if (adminBtn) adminBtn.classList.add('hidden');
                      }

                      document.getElementById('discord-login-btn').classList.add('hidden');
                      const info = document.getElementById('discord-user-info');
                      info.classList.remove('hidden');
                      const avatar = document.getElementById('discord-avatar');
                      const username = document.getElementById('discord-username');`;

appJs = appJs.replace(targetMeBlock, newMeBlock);

// Patch logoutDiscord function
const oldLogout = `        async function logoutDiscord() {
              try {
                  await fetch('/api/discord/logout', { method: 'POST', credentials: 'include' });
              } catch(e) {}
              discordUser = null;
              document.getElementById('discord-login-btn').classList.remove('hidden');
              document.getElementById('discord-user-info').classList.add('hidden');
              showToast('Đã đăng xuất Discord', 'info');
          }`;

const newLogout = `        async function logoutDiscord() {
              try {
                  await fetch('/api/discord/logout', { method: 'POST', credentials: 'include' });
              } catch(e) {}
              discordUser = null;
              apiToken = null;
              localStorage.removeItem('evan_api_token');
              const adminBtn = document.getElementById('btn-admin-dropdown');
              if (adminBtn) adminBtn.classList.add('hidden');
              document.getElementById('discord-login-btn').classList.remove('hidden');
              document.getElementById('discord-user-info').classList.add('hidden');
              showToast('Đã đăng xuất Discord', 'info');
              if (document.getElementById('admin-tab') && !document.getElementById('admin-tab').classList.contains('hidden')) {
                  switchTab('leaderboard-tab');
              }
          }`;

appJs = appJs.replace(oldLogout, newLogout);

// Patch switchTab admin-tab block
const oldSwitchTab = `              if (id === 'admin-tab') {
                  if (!apiToken) { _adminModalAllowed = true; openAdminLoginModal(); return; }
                  loadPendingTeams(); renderAdmin();
                  loadScoreReports();
                  switchAdminSubTab(currentAdminSubTab);
              }`;

const newSwitchTab = `              if (id === 'admin-tab') {
                  const isAdmin = discordUser && discordUser.isAdmin;
                  if (!isAdmin) {
                      showToast('Bạn không có quyền truy cập trang này!', 'error');
                      switchTab('leaderboard-tab');
                      return;
                  }
                  apiToken = 'discord_admin';
                  loadPendingTeams(); renderAdmin();
                  loadScoreReports();
                  switchAdminSubTab(currentAdminSubTab);
              }`;

appJs = appJs.replace(oldSwitchTab, newSwitchTab);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('app.js patched.');
