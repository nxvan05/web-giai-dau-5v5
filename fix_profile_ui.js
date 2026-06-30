const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

if (!indexHtml.includes('function handleLogoError')) {
    indexHtml = indexHtml.replace('<head>', '<head>\n    <script>function handleLogoError(img) { if(img) img.style.display = "none"; }</script>');
}

if (!indexHtml.includes('id="profile-banner-bg"')) {
    indexHtml = indexHtml.replace(
        `<div class="absolute inset-0 opacity-20 bg-[url('https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/wideart.png')] bg-cover bg-center mix-blend-overlay"></div>`,
        `<div id="profile-banner-bg" class="absolute inset-0 opacity-20 bg-[url('https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/wideart.png')] bg-cover bg-center mix-blend-overlay"></div>`
    );
}

// Ensure the onerror calls pass `this`
indexHtml = indexHtml.replace(/onerror="handleLogoError\(\)"/g, 'onerror="handleLogoError(this)"');

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

// 2. Update app.js
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Remove the injected handleLogoError if it exists in app.js
if (appJs.includes('window.handleLogoError = function')) {
    appJs = appJs.replace(/window\.handleLogoError = function[^\n]+\n/, '');
}

// Add logic to openProfile to set cardUrl and accountLevel
const targetLine = "document.getElementById('profile-name').textContent = p.displayName + ' — HỒ SƠ';";
if (!appJs.includes("document.getElementById('profile-banner-bg')")) {
    const newLogic = `document.getElementById('profile-name').innerHTML = p.displayName + ' <span class="text-sm font-normal text-gray-400">— HỒ SƠ</span>';
                  const banner = document.getElementById('profile-banner-bg');
                  if (banner) {
                      if (p.cardUrl) {
                          banner.style.backgroundImage = 'url(' + p.cardUrl + ')';
                          banner.classList.replace('opacity-20', 'opacity-30');
                      } else {
                          banner.style.backgroundImage = "url('https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/wideart.png')";
                          banner.classList.replace('opacity-30', 'opacity-20');
                      }
                  }
                  
                  const riotIdEl = document.getElementById('profile-riot-id');
                  if (riotIdEl) {
                      riotIdEl.innerHTML = (p.riotId || 'Unknown') + (p.accountLevel ? ' <span class="ml-2 px-1.5 py-0.5 bg-valRed/20 text-valRed text-[10px] rounded border border-valRed/30">Lv ' + p.accountLevel + '</span>' : '');
                  }`;
    appJs = appJs.replace(targetLine, newLogic);
}

// Find where riot id is populated in openProfile
// Currently it is: document.getElementById('profile-riot-id').textContent = p.riotId || 'Chưa cập nhật';
const targetRiotIdLine = "document.getElementById('profile-riot-id').textContent = p.riotId || 'Chưa cập nhật';";
if (appJs.includes(targetRiotIdLine)) {
    // We already populate it above, so just remove or comment this old line
    appJs = appJs.replace(targetRiotIdLine, "// replaced by dynamic HTML");
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Fixed handleLogoError and added Profile UI logic');
