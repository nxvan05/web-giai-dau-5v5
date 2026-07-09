window.initNotifications = async function() {
            const bell = document.getElementById('notif-bell');
            if (!bell) return;
            bell.classList.remove('hidden');
            try {
                notifs = await window.api('/api/notify/in-app');
                notifCount = 0;
                if (notifs.length > 0) {
                    const lastSeen = localStorage.getItem('evan_last_notif_id') || '';
                    const idx = notifs.findIndex(n => n.id === lastSeen);
                    notifCount = idx < 0 ? notifs.length : idx;
                }
                updateNotifBadge();
            } catch(e) {}
            // Listen for real-time notifications
            if (socket) {
                socket.on('notification:created', (notif) => {
                    notifs.unshift(notif);
                    notifCount++;
                    updateNotifBadge();
                    if (!document.getElementById('notif-panel').classList.contains('hidden')) {
                        renderNotifList();
                    }
                });
            }
        }
window.updateNotifBadge = function() {
            const badge = document.getElementById('notif-badge');
            if (!badge) return;
            if (notifCount > 0) {
                badge.classList.remove('hidden');
                badge.textContent = notifCount > 99 ? '99+' : notifCount;
            } else { badge.classList.add('hidden'); }
        }
window.toggleNotifPanel = function() {
            const panel = document.getElementById('notif-panel');
            if (panel.classList.contains('hidden')) {
                renderNotifList();
                panel.classList.remove('hidden');
            } else { panel.classList.add('hidden'); }
        }
window.renderNotifList = function() {
            const list = document.getElementById('notif-list');
            if (notifs.length === 0) { list.innerHTML = '<p class="text-center text-gray-500 text-xs py-4">Chưa có thông báo</p>'; return; }
            const icons = { match_result: '🏆', team_approved: '✅', dispute_filed: '⚠️', dispute_resolved: '⚖️', match_created: '📅', stream_started: '🔴', info: '📢' };
            list.innerHTML = notifs.map(n => {
                const icon = icons[n.type] || '📢';
                const time = new Date(n.createdAt).toLocaleString('vi-VN');
                return `<div class="flex gap-2 p-2 hover:bg-valBg/40 rounded-lg text-xs border-b border-gray-800/50 last:border-0">
                    <span class="shrink-0">${icon}</span>
                    <div class="min-w-0">
                        <p class="text-white font-medium truncate">${n.message}</p>
                        <p class="text-[9px] text-gray-500">${time}</p>
                    </div>
                </div>`;
            }).join('');
        }
window.markAllNotifRead = function() {
            if (notifs.length > 0) {
                localStorage.setItem('evan_last_notif_id', notifs[0].id);
                notifCount = 0;
                updateNotifBadge();
            }
            document.getElementById('notif-panel').classList.add('hidden');
        }

