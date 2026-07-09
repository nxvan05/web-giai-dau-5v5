// === Discord Auth Functions ===
window.discordUser = null;

let _userMenuInitialized = false;

window.closeUserMenu = function() {
    const dd = document.getElementById('user-dropdown');
    const ch = document.getElementById('user-menu-chevron');
    if (dd) dd.classList.remove('open');
    if (ch) ch.style.transform = '';
};

window.initUserMenu = function() {
    if (_userMenuInitialized) return;
    _userMenuInitialized = true;
    const trigger = document.getElementById('user-dropdown-trigger');
    const dd = document.getElementById('user-dropdown');
    const ch = document.getElementById('user-menu-chevron');
    if (!trigger) return;
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        dd.classList.toggle('open');
        if (ch) ch.style.transform = dd.classList.contains('open') ? 'rotate(180deg)' : '';
    });
    document.addEventListener('click', function() {
        dd.classList.remove('open');
        if (ch) ch.style.transform = '';
    });
};

window.checkDiscordAuth = async function() {
    window.initUserMenu();
    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
        try {
            await fetch('/api/discord/refresh', { method: 'POST', credentials: 'include' }).catch(() => {});
            const res = await fetch('/api/discord/me', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                window.discordUser = data.user;
                document.getElementById('discord-login-btn').classList.add('hidden');
                const info = document.getElementById('discord-user-info');
                info.classList.remove('hidden');
                const avatar = document.getElementById('discord-avatar');
                const username = document.getElementById('discord-username');
                username.textContent = window.discordUser.discordUsername;
                document.getElementById('dropdown-username').textContent = window.discordUser.discordUsername;
                document.getElementById('dropdown-discord-id').textContent = window.discordUser.discordId;
                
                avatar.src = getAvatarUrl(window.discordUser.discordId, window.discordUser.discordAvatar, 64);
                avatar.setAttribute('data-discord-id', window.discordUser.discordId || '');
                avatar.setAttribute('data-name', window.discordUser.discordUsername || '');
                avatar.onerror = function(){ this.src = window.getFallbackAvatar(window.discordUser.discordId, window.discordUser.discordUsername, 64); };
                
                if (data.user.isAdmin && !window.apiToken) {
                    window.apiToken = 'discord_admin';
                    localStorage.setItem('evan_api_token', 'discord_admin');
                }
                if (data.user.isAdmin) {
                    const btnAdmin = document.getElementById('btn-admin-tab');
                    if (btnAdmin) btnAdmin.classList.remove('hidden');
                }
                
                const dashInput = document.getElementById('dashboard-discord-id');
                if (dashInput) { dashInput.value = window.discordUser.discordId; }
                
                try {
                    const player = await window.api('/api/players/lookup/' + window.discordUser.discordId);
                    if (player && window.showToast) window.showToast('Chào mừng ' + player.displayName + '!', 'success');
                } catch(e) {}
                
                const pendingCheckin = localStorage.getItem('pending_checkin');
                if (pendingCheckin) {
                    localStorage.removeItem('pending_checkin');
                    if (window.showToast) window.showToast('Đang thực hiện điểm danh...', 'info');
                    setTimeout(async () => {
                        if (window.toggleCheckin) {
                            await window.toggleCheckin(pendingCheckin, window.discordUser.discordId, window.discordUser.discordUsername);
                        }
                    }, 1000);
                }
                return; // success
            } else if (res.status === 401 && retries < maxRetries) {
                // Token expired, retry after refresh
                retries++;
                await new Promise(r => setTimeout(r, 500 * retries));
                continue;
            }
            break;
        } catch(e) {
            if (retries < maxRetries) {
                retries++;
                await new Promise(r => setTimeout(r, 500 * retries));
                continue;
            }
            break;
        }
    }
    // If we get here, auth failed — clear stale state
    window.discordUser = null;
    if (window.apiToken === 'discord_admin') {
        window.apiToken = null;
        localStorage.removeItem('evan_api_token');
    }
    const btnAdmin = document.getElementById('btn-admin-tab');
    if (btnAdmin) btnAdmin.classList.add('hidden');
};

window.loginDiscord = async function() {
    try {
        const data = await window.api('/api/discord/auth-url');
        if (data.url) window.location.href = data.url;
        else if (window.showToast) window.showToast('Không thể lấy link đăng nhập Discord', 'error');
    } catch(e) {
        if (window.showToast) window.showToast('Không thể kết nối Discord: ' + e.message, 'error');
    }
};

window.logoutDiscord = async function() {
    try {
        await fetch('/api/discord/logout', { method: 'POST', credentials: 'include' });
    } catch(e) {}
    
    window.discordUser = null;
    if (window.apiToken === 'discord_admin') {
        window.apiToken = null;
        localStorage.removeItem('evan_api_token');
    }
    document.getElementById('discord-login-btn').classList.remove('hidden');
    document.getElementById('discord-user-info').classList.add('hidden');
    if (window.showToast) window.showToast('Đã đăng xuất Discord', 'info');
};
