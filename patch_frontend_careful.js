const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Patch checkDiscordLogin success block
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

// 2. Patch logoutDiscord function
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

// 3. Patch switchTab admin-tab block
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

// 4. Update requireAdminAuth
const oldRequireAuth = `          function requireAdminAuth() {
            if (apiToken) return true;
            _adminModalAllowed = true;
            openAdminLoginModal();
            showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!', 'error');
            return false;
          }`;

const newRequireAuth = `          function requireAdminAuth() {
            if (apiToken) return true;
            showToast('Quyền truy cập bị từ chối: Bạn không phải Admin!', 'error');
            return false;
          }`;

appJs = appJs.replace(oldRequireAuth, newRequireAuth);

// 5. Replace the admin login functions with dummies to prevent crashes
appJs = appJs.replace(/function confirmAdminLogin\(\)[\s\S]*?\}\s*function openAdminLoginModal\(\)[\s\S]*?\}\s*function closeAdminLoginModal\(\)[\s\S]*?\}/m, `function confirmAdminLogin() {}
          function openAdminLoginModal() {}
          function closeAdminLoginModal() {}`);

appJs = appJs.replace(/async function checkAdminPassword\(\)[\s\S]*?\}\s*function logoutAdmin\(\)[\s\S]*?\}/m, `async function checkAdminPassword() {}
          function logoutAdmin() {}`);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Carefully patched app.js and index.html');
