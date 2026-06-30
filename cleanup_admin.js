const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Remove the admin-trigger-btn
indexHtml = indexHtml.replace(
  /<button type="button" id="admin-trigger-btn"[\s\S]*?<\/button>/,
  ''
);

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Cleaned up index.html');

// 2. Update app.js
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Remove confirmAdminLogin, openAdminLoginModal, closeAdminLoginModal, checkAdminPassword
// We can use regex to replace them
appJs = appJs.replace(
  /function confirmAdminLogin\(\)[\s\S]*?function openAdminLoginModal\(\)[\s\S]*?function closeAdminLoginModal\(\)[\s\S]*?\}\s*\}\s*;/m,
  ''
);

// Note: checking if checkAdminPassword is still in app.js
// It might be separated. Let's write a regex that matches them if they are still there.
appJs = appJs.replace(/async function checkAdminPassword\(\)[\s\S]*?\}\n\s*\}\n\s*\}/m, '');

// Also check requireAdminAuth
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

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Cleaned up app.js');
