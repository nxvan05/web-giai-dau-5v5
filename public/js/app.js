
        // Khởi động trang, tự động hồi phục trạng thái dữ liệu cũ (LocalStorage)
                window.onload = async function() {
              loadTournamentData();
              // Admin is now managed by Discord login (checkDiscordLogin).
              // No need to call /api/auth/me with old token.
          };

        // Đồng bộ dữ liệu cục bộ an toàn
        function saveTournamentData() {
            localStorage.setItem('evan_cup_players', JSON.stringify(players));
            localStorage.setItem('evan_cup_team1', JSON.stringify(team1));
            localStorage.setItem('evan_cup_team2', JSON.stringify(team2));
            const t1Name = document.getElementById('team1-name-input')?.value;
            const t2Name = document.getElementById('team2-name-input')?.value;
            if (t1Name) localStorage.setItem('evan_cup_team1_name', t1Name);
            if (t2Name) localStorage.setItem('evan_cup_team2_name', t2Name);
        }

        function loadTournamentData() {
            try {
                const pSaved = localStorage.getItem('evan_cup_players');
                const t1Saved = localStorage.getItem('evan_cup_team1');
                const t2Saved = localStorage.getItem('evan_cup_team2');
                
                if (pSaved) players = JSON.parse(pSaved);
                if (t1Saved) team1 = JSON.parse(t1Saved);
                if (t2Saved) team2 = JSON.parse(t2Saved);
                
                const t1n = document.getElementById('team1-name-input');
                const t2n = document.getElementById('team2-name-input');
                if (t1n) { const saved = localStorage.getItem('evan_cup_team1_name'); if (saved) t1n.value = saved; }
                if (t2n) { const saved = localStorage.getItem('evan_cup_team2_name'); if (saved) t2n.value = saved; }
                
                renderAdmin();
            } catch (e) {
                console.error("Lỗi đồng bộ dữ liệu cục bộ:", e);
            }
        }

        // Lắng nghe sự kiện broadcast cho Auto Fetch API
        if (socket) {
            socket.on('broadcast:receive', (data) => {
                if (data.type === 'progress') {
                    const btn = document.getElementById('auto-fetch-api-text');
                    if (btn) btn.innerText = `Đang tải: ${data.progress}%`;
                } else if (data.type === 'success') {
                    showToast(data.message, 'success');
                    const btn = document.getElementById('auto-fetch-api-text');
                    if (btn) btn.innerText = 'Auto Fetch API';
                }
            });
        }

        // Tự động sửa lỗi tải Logo và vẽ Vector thay thế
        function handleLogoError(img) {
            const logoImg = img || document.getElementById('main-logo');
            if (logoImg && logoImg.getAttribute('src') === 'image_f5cea1.jpg') {
                if (logoImg.getAttribute('src') === 'image_f5cea1.jpg') {
                    logoImg.src = 'image_27c3e1.jpg';
                } else {
                    logoImg.outerHTML = `
                    <div class="w-full h-full bg-gradient-to-tr from-valRed to-pink-600 flex flex-col items-center justify-center text-white p-1">
                        <span class="font-display font-black text-xs tracking-tight leading-none">EVAN</span>
                        <span class="text-[8px] tracking-widest text-valCyan mt-1 font-mono uppercase leading-none font-bold">CUP</span>
                    </div>`;
                }
            }
        }

        // === Guide interactive functions ===

        function editFinalsTime() {
            const current = localStorage.getItem('evan_finals_time') || '';
            const t = prompt('Nhập thời gian Bán Kết & Chung Kết (vd: 13/07 · 14:00):', current);
            if (t !== null) {
                localStorage.setItem('evan_finals_time', t);
                document.getElementById('schedule-finals-time').textContent = t || 'Đang cập nhật';
                showToast('Đã cập nhật thời gian!', 'success');
            }
        }
        let _guideInit = false;
        function initGuideInteractions() {
            if (_guideInit) return;
            _guideInit = true;
            // Carousel: dots + nav + counter
            document.querySelectorAll('.guide-carousel').forEach(carousel => {
                const slides = carousel.querySelectorAll('.guide-slide');
                const dots = carousel.querySelectorAll('.guide-dot');
                const prev = carousel.querySelector('.guide-prev');
                const next = carousel.querySelector('.guide-next');
                const counter = carousel.closest('.bg-valCard')?.querySelector('.guide-carousel-counter');
                let idx = 0;
                function show(i) {
                    slides.forEach(s => s.classList.remove('active'));
                    dots.forEach(d => d.classList.remove('active'));
                    idx = (i + slides.length) % slides.length;
                    slides[idx].classList.add('active');
                    if (dots[idx]) dots[idx].classList.add('active');
                    if (counter) counter.innerHTML = '<span class="text-white font-bold">' + (idx + 1) + '</span>/' + slides.length;
                }
                dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
                if (prev) prev.addEventListener('click', () => show(idx - 1));
                if (next) next.addEventListener('click', () => show(idx + 1));
                show(0);
            });
            // Accordion
            document.querySelectorAll('.guide-accordion-header').forEach(h => {
                h.addEventListener('click', () => {
                    const body = h.nextElementSibling;
                    if (!body || !body.classList.contains('guide-accordion-body')) return;
                    const isOpen = body.classList.contains('open');
                    body.classList.toggle('open');
                    h.classList.toggle('open');
                    body.style.maxHeight = isOpen ? '0' : body.scrollHeight + 'px';
                });
            });
            // Popup triggers
            document.querySelectorAll('[data-guide-popup]').forEach(el => {
                el.addEventListener('click', () => {
                    const id = el.getAttribute('data-guide-popup');
                    const popup = document.getElementById(id);
                    if (popup) popup.classList.remove('hidden');
                });
            });
            // Close popups on backdrop click
            document.querySelectorAll('.guide-popup-overlay').forEach(p => {
                p.addEventListener('click', (e) => {
                    if (e.target === p) p.classList.add('hidden');
                });
            });
            // Double-click help button → detailed guide
            const helpBtn = document.getElementById('help-btn');
            if (helpBtn) {
                helpBtn.addEventListener('dblclick', function(e) {
                    e.preventDefault();
                    toggleHelpModal();
                    setTimeout(toggleHelpDetailed, 300);
                });
            }
            // Load finals time from localStorage
            const savedFinals = localStorage.getItem('evan_finals_time');
            if (savedFinals) document.getElementById('schedule-finals-time').textContent = savedFinals;
            // Show admin edit button if admin
            if (apiToken) document.getElementById('schedule-finals-admin')?.classList.remove('hidden');
        }
        document.addEventListener('DOMContentLoaded', initGuideInteractions);


        // === Player Profile ===
        let profileChartInstances = {};


        // Bảo mật 2 lớp chống tuyển thủ tự động gọi Tab Admin từ URL hoặc console
        function switchTab(id) {
            document.querySelectorAll('.tab-content').forEach(el => { el.classList.remove('tab-fade-in'); el.classList.add('hidden'); });
            const target = document.getElementById(id);
            target.classList.remove('hidden');
            void target.offsetWidth;
            target.classList.add('tab-fade-in');
            
            document.querySelectorAll('.tab-btn').forEach(btn => { 
                btn.classList.remove('bg-valRed', 'text-white', 'glow-red'); 
                btn.classList.add('text-gray-400'); 
            });
            
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.classList.remove('text-gray-400'); 
                btn.classList.add('bg-valRed', 'text-white', 'glow-red');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Quản lý Đăng Nhập & Đăng Xuất Admin an toàn
        let _adminModalAllowed = false;
        
        function logoutAdmin() {
            apiToken = null;
            localStorage.removeItem('evan_api_token');
            const btnAdmin = document.getElementById('btn-admin-tab');
            if (btnAdmin) btnAdmin.classList.add('hidden');
            switchTab('dashboard-tab');
            showToast('Đã đăng xuất Admin', 'success');
        }

        async function checkAdminAuth() {
            // Chỉ khôi phục apiToken từ cookie, KHÔNG tự động hiện admin tab
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        const m = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
                        if (m) window.apiToken = m[1];
                    }
                }
            } catch(e) {}
        }

        let currentAdminSubTab = 'dashboard';
        function switchAdminSubTab(tab) {
            document.querySelectorAll('[id^="admin-sub-"]').forEach(el => {
                if (el.id.startsWith('admin-sub-') && !el.id.startsWith('admin-sub-btn')) {
                    el.classList.add('hidden');
                }
            });
            document.getElementById('admin-sub-' + tab)?.classList.remove('hidden');
            document.querySelectorAll('.admin-sub-btn').forEach(btn => {
                btn.classList.remove('bg-valRed', 'text-white', 'glow-red');
                btn.classList.add('text-gray-400');
            });
            const btn = document.getElementById('admin-sub-btn-' + tab);
            if (btn) {
                btn.classList.remove('text-gray-400');
                btn.classList.add('bg-valRed', 'text-white', 'glow-red');
            }
            currentAdminSubTab = tab;
            if (tab === 'dashboard') loadAdminDashboard();
            if (tab === 'teams') renderAdmin();
            if (tab === 'reports') loadScoreReports();
            if (tab === 'data') { loadAdminStats(); loadFreeAgents(); loadAuditLog(); adminLoadSettings(); }
        }

        const MAP_LIST = ['summit', 'breeze', 'ascent', 'haven', 'split', 'sunset', 'icebox', 'lotus'];
        const VETO_PHASES = [
            { label: 'Team Cyan cấm', team: 1, action: 'ban' },
            { label: 'Team Red cấm', team: 2, action: 'ban' },
            { label: 'Team Cyan chọn (Ván 1)', team: 1, action: 'pick' },
            { label: 'Team Red chọn (Ván 2)', team: 2, action: 'pick' },
            { label: 'Team Cyan cấm', team: 1, action: 'ban' },
            { label: 'Team Red cấm', team: 2, action: 'ban' },
            { label: 'Ván 3 (Decider)', team: 0, action: 'decider' }
        ];

        let currentRegMaxPts = 26;

        // Preserve backward compat

        document.addEventListener('DOMContentLoaded', function() {
            selectRegType('solo');
            const riotInput = document.getElementById('reg-riotid');
            if (riotInput) {
                let debounceTimer;
                riotInput.addEventListener('input', function() {
                    clearTimeout(debounceTimer);
                    const el = document.getElementById('reg-riot-lookup-result');
                    el.classList.add('hidden');
                    debounceTimer = setTimeout(() => {
                        if (riotInput.value.trim().includes('#')) lookupRiotIdForRegister();
                    }, 800);
                });
            }
        });




        // === Leaderboard Tab ===
        let leaderboardData = [];
        let currentSort = { key: 'rank', asc: true };

        async function loadLeaderboard() {
            showLoading('Đang tải bảng xếp hạng...');
            try {
                const players = await api('/api/matches/leaderboard');
                leaderboardData = players;
                hideLoading();
                renderLeaderboardTable();
                
                const searchInput = document.getElementById('leaderboard-search');
                const roleSelect = document.getElementById('leaderboard-role-filter');
                if (searchInput && !searchInput.dataset.hasListener) {
                    searchInput.addEventListener('input', renderLeaderboardTable);
                    searchInput.dataset.hasListener = 'true';
                }
                if (roleSelect && !roleSelect.dataset.hasListener) {
                    roleSelect.addEventListener('change', renderLeaderboardTable);
                    roleSelect.dataset.hasListener = 'true';
                }
            } catch(e) {
                hideLoading();
                document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="10" class="py-8 text-center text-gray-500"><i class="fa-solid fa-trophy text-2xl mb-2 block"></i>Chưa có dữ liệu</td></tr>';
            }
        }

        window.sortLeaderboard = function(key) {
            if (currentSort.key === key) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.key = key;
                currentSort.asc = (key === 'name' || key === 'rank'); 
            }
            renderLeaderboardTable();
        };

        function renderLeaderboardTable() {
            const tbody = document.getElementById('leaderboard-body');
            if (!tbody) return;
            
            let data = [...leaderboardData];
            
            const searchInput = document.getElementById('leaderboard-search');
            const roleSelect = document.getElementById('leaderboard-role-filter');
            const term = searchInput ? searchInput.value.toLowerCase() : '';
            const role = roleSelect ? roleSelect.value : 'all';
            
            if (term) {
                data = data.filter(p => (p.displayName && p.displayName.toLowerCase().includes(term)) || (p.discordId && p.discordId.includes(term)));
            }
            if (role !== 'all') {
                data = data.filter(p => p.role === role);
            }
            
            data.sort((a, b) => {
                let valA = a[currentSort.key];
                let valB = b[currentSort.key];
                
                if (currentSort.key === 'hs') {
                    valA = a.headshotPct || 0;
                    valB = b.headshotPct || 0;
                } else if (currentSort.key === 'score') {
                    valA = a.adminEvaluation ? parseFloat(a.adminEvaluation.replace(/[^0-9.]/g, '')) || 0 : 0;
                    valB = b.adminEvaluation ? parseFloat(b.adminEvaluation.replace(/[^0-9.]/g, '')) || 0 : 0;
                } else if (currentSort.key === 'name') {
                    valA = (a.displayName || '').toLowerCase();
                    valB = (b.displayName || '').toLowerCase();
                } else if (currentSort.key === 'rankName') {
                    valA = window.getPtsFromRank ? window.getPtsFromRank(a.peakRank || a.rankName) : 0;
                    valB = window.getPtsFromRank ? window.getPtsFromRank(b.peakRank || b.rankName) : 0;
                }
                
                if (valA < valB) return currentSort.asc ? -1 : 1;
                if (valA > valB) return currentSort.asc ? 1 : -1;
                return 0;
            });
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="py-8 text-center text-gray-500"><i class="fa-solid fa-ghost text-2xl mb-2 block"></i>Không tìm thấy kết quả</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map((p, index) => {
                const rankNum = currentSort.key === 'rank' && currentSort.asc ? p.rank : (index + 1);
                
                let hsColor = 'text-gray-400';
                if (p.headshotPct >= 25) hsColor = 'text-emerald-400';
                else if (p.headshotPct >= 15) hsColor = 'text-yellow-400';
                else if (p.headshotPct > 0) hsColor = 'text-red-400';

                return `<tr class="${rankNum === 1 ? 'top1-border bg-yellow-500/5' : ''} border-b border-gray-800/50 cursor-pointer hover:bg-valBg/50 transition" onclick="openProfile('${p.discordId}')" data-player-discord="${p.discordId}" data-player-name="${p.displayName}">
                        <td class="py-2.5 px-3 text-center font-bold ${rankNum <= 3 ? 'text-yellow-400 text-sm' : 'text-gray-400'}">${rankNum <= 3 ? ['🥇','🥈','🥉'][rankNum-1] : '#' + rankNum}</td>
                        <td class="py-2.5 px-3 font-bold text-valCyan hover:text-white transition flex items-center gap-2 flex-wrap min-w-[150px]">
                            <img src="${getAvatarUrl(p.discordId, p.discordAvatar, 24)}" class="w-5 h-5 rounded-full border border-gray-700 inline-block hover:ring-2 hover:ring-valCyan transition" data-discord-id="${p.discordId||''}" data-name="${(p.displayName||'?').replace(/"/g,'&quot;')}" onerror="this.src=window.getFallbackAvatar('${p.discordId||''}','${(p.displayName||'?').replace(/'/g,"\\'")}',24)">
                            ${p.displayName} <i class="fa-solid fa-magnifying-glass-chart text-gray-500 hover:text-valCyan ml-1 transition-colors cursor-pointer" onclick="event.stopPropagation(); openProfile('${p.discordId}', true)" title="Xem Tracker"></i>
                        </td>
                        <td class="py-2.5 px-3 text-center">${p.teamId ? `<span class="team-link text-[10px] bg-valCyan/10 text-valCyan border border-valCyan/20 px-2 py-0.5 rounded-full cursor-pointer hover:bg-valCyan hover:text-black transition" title="Click xem chi tiết đội" onclick="event.stopPropagation();openTeamProfile('${p.teamId.replace(/'/g, "\\'")}')">${p.teamId}</span>` : '<span class="text-[10px] text-gray-600">-</span>'}</td>
                        <td class="py-2.5 px-3 text-center text-gray-300 relative group cursor-help">
                            ${(function(){var _u = (window.getRankIconUrl ? window.getRankIconUrl(p.peakRank || p.rankName) : ''); return _u ? '<img src="' + _u + '" class="w-4 h-4 inline-block mr-1 align-middle" title="' + (p.peakRank || p.rankName) + '" onerror="this.style.display=\'none\'">' : '';})()}${p.peakRank || p.rankName || '—'}
                            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-gray-900 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-lg border border-gray-700">Peak: ${p.peakRank || '—'}</span>
                        </td>
                        <td class="py-2.5 px-3 text-center text-yellow-400 font-bold">${p.elo || 1000}</td>
                        <td class="py-2.5 px-3 text-center font-mono ${hsColor} font-bold">${p.headshotPct ? p.headshotPct.toFixed(1) + '%' : '-'}</td>
                        <td class="py-2.5 px-3 text-center text-valCyan font-bold">${p.pts || window.getPtsFromRank(p.peakRank || p.rankName)}</td>
                        <td class="py-2.5 px-3 text-center text-emerald-400 font-bold">${p.wins}</td>
                        <td class="py-2.5 px-3 text-center text-red-400 font-bold">${p.losses}</td>
                        <td class="py-2.5 px-3 text-center text-yellow-400">${p.mvps || 0}</td>
                    </tr>`;
            }).join('');
            
            const updatedEl = document.getElementById('leaderboard-updated');
            if (updatedEl) updatedEl.textContent = 'Cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN');
        }

                async function loadStandings() {
            showLoading('Đang tải bảng xếp hạng đội...');
            try {
                const standings = await api('/api/matches/standings');
                hideLoading();
                const container = document.getElementById('standings-container');
                container.innerHTML = '';
                for (const [group, teams] of Object.entries(standings)) {
                    let html = `<div class="bg-valBg/60 border border-gray-800 p-4 rounded-xl">
                        <h4 class="text-xs font-bold text-valCyan uppercase mb-2">Bảng ${group}</h4>
                        <table class="w-full text-xs">
                            <thead><tr class="text-gray-500 uppercase"><th class="py-1 px-2 text-left">Đội</th><th class="py-1 px-2 text-center">Trận</th><th class="py-1 px-2 text-center">W</th><th class="py-1 px-2 text-center">L</th><th class="py-1 px-2 text-center text-emerald-400">Điểm</th></tr></thead>
                            <tbody>`;
                    teams.forEach((t, i) => {
                        html += `<tr class="${i < 2 ? 'bg-emerald-500/5 border-l-2 border-emerald-400' : 'border-b border-gray-800/50'}">
                            <td class="py-1.5 px-2 font-bold text-white team-link cursor-pointer hover:text-valCyan" onclick="openTeamProfile('${t.name.replace(/'/g, "\\'")}')">
                                <div class="flex items-center gap-2">
                                    ${t.logo ? 
                                        `<img src="${t.logo}" class="w-5 h-5 rounded-full object-cover border border-gray-600">` : 
                                        `<div class="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style="background-color: ${t.color || '#6B7280'}">${(t.shortName || t.name.substring(0,2)).toUpperCase()}</div>`
                                    }
                                    <span>${t.name}${i < 2 ? ' ⭐' : ''}</span>
                                </div>
                            </td>
                            <td class="py-1.5 px-2 text-center">${t.played}</td>
                            <td class="py-1.5 px-2 text-center text-emerald-400">${t.wins}</td>
                            <td class="py-1.5 px-2 text-center text-red-400">${t.losses}</td>
                            <td class="py-1.5 px-2 text-center font-black text-white">${t.pts}</td>
                        </tr>`;
                    });
                    html += '</tbody></table></div>';
                    container.innerHTML += html;
                }
                if (Object.keys(standings).length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-clock-rotate-left text-2xl mb-2 block"></i>Chưa có kết quả trận đấu</div>';
                }
            } catch(e) {
                hideLoading();
                document.getElementById('standings-container').innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Chưa có dữ liệu</div>';
            }
        }

        // === Dashboard Tab ===

        // === Team Detail Modal ===
        function wireTeamClicks() {
            document.querySelectorAll('.team-link').forEach(el => {
                el.addEventListener('click', function(e) { e.stopPropagation(); openTeamProfile(this.dataset.team); });
            });
        }


        // === Reschedule ===
        async function reschedule(matchId) {
            const dt = document.getElementById('resched-time-' + matchId).value;
            if (!dt) return showToast('Chọn thời gian!', 'error');
            try {
                await api('/api/matches/' + matchId, { method: 'PUT', body: { scheduledAt: new Date(dt).toISOString() } });
                showToast('Đã đặt lại giờ!', 'success');
                loadSchedule();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        // === Match Detail Modal ===

        // === Captain Score Reporting ===

        // === Check-in Functions ===
        async function toggleCheckin(matchId, discordId, playerName) {
            if (discordUser && !discordId) discordId = discordUser.discordId;
            if (!discordId) return showToast('Nhập Discord ID hoặc đăng nhập Discord', 'error');
            try {
                await api('/api/checkin/' + matchId, {
                    method: 'POST',
                    body: { discordId, playerName }
                });
                loadSchedule();
                showToast('Đã cập nhật check-in!', 'success');
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Result Modal Functions ===

        // === MVP Modal ===


        // === Webhook Config ===
        // === Admin Stats ===
        async function loadAdminStats() {
            if (!requireAdminAuth()) return;
            try {
                const stats = await api('/api/matches/stats');
                document.getElementById('stat-players').textContent = stats.players;
                document.getElementById('stat-matches').textContent = stats.matches;
                document.getElementById('stat-completed').textContent = stats.completed;
                document.getElementById('stat-pending').textContent = stats.pending;
            } catch(e) {}
        }

        async function loadFreeAgentsBrowser() {
            const container = document.getElementById('freeagents-browser');
            if (!container) return;
            try {
                const agents = await api('/api/players/free-agents');
                if (!agents || agents.length === 0) {
                    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-users-slash text-3xl mb-2"></i><p>Không có tuyển thủ tự do</p></div>';
                    return;
                }
                container.innerHTML = agents.map(p => {
                    const name = p.displayName || p.discordId;
                    const avatar = '<img src="' + getAvatarUrl(p.discordId, p.discordAvatar, 64) + '" class="w-10 h-10 rounded-full border border-gray-700" data-discord-id="' + (p.discordId||'') + '" data-name="' + (p.displayName||'?').replace(/"/g,'&quot;') + '" onerror="this.src=window.getFallbackAvatar(\'' + (p.discordId||'') + '\',\'' + (p.displayName||'?').replace(/'/g,"\\'") + '\',64)">';
                    const rankClass = p.rank && p.rank.includes('Immortal') ? 'text-red-400' : p.rank && p.rank.includes('Diamond') ? 'text-cyan-300' : 'text-gray-300';
                    return '<div class="bg-valCard border border-gray-800 rounded-xl p-3 hover:border-valCyan/30 transition cursor-pointer" onclick="openProfile(\'' + p.discordId + '\')">' +
                        '<div class="flex items-center gap-3">' +
                            avatar +
                            '<div class="flex-1 min-w-0">' +
                                '<p class="text-sm font-bold text-white truncate">' + name + '</p>' +
                                '<div class="flex items-center gap-2 mt-0.5 text-[10px]">' +
                                    '<span class="' + rankClass + ' font-mono">' + (p.rank || 'N/A') + '</span>' +
                                    '<span class="text-gray-500">' + (p.role || 'N/A') + '</span>' +
                                    '<span class="text-valCyan">' + (p.elo || '?') + ' elo</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            } catch(e) {
                container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-exclamation-triangle text-3xl mb-2"></i><p>Lỗi tải dữ liệu</p></div>';
            }
        }

        async function loadFreeAgents() {
            showLoading('Đang tải danh sách tự do...');
            const container = document.getElementById('free-agent-list');
            try {
                const agents = await api('/api/players/free-agents');
                hideLoading();
                if (!agents || agents.length === 0) {
                    container.innerHTML = '<div class="text-gray-500 text-center py-2">Không có tuyển thủ tự do</div>';
                    return;
                }
                container.innerHTML = agents.map(p => `
                    <div class="flex justify-between items-center bg-valCard/40 p-2 rounded-lg border border-gray-800 cursor-pointer hover:bg-valCard/60 hover:border-valCyan/30 transition" onclick="openProfile('${p.discordId}')">
                        <span class="text-gray-200 font-medium hover:text-valCyan">${p.displayName}</span>
                        <span class="text-[10px] text-gray-400">${p.rank} • ${p.role} • ${p.elo} Elo</span>
                    </div>
                `).join('');
            } catch(e) {
                hideLoading();
                container.innerHTML = '<div class="text-gray-500 text-center py-2">Lỗi tải dữ liệu</div>';
            }
        }

        // === Export Functions ===
        function downloadFile(content, filename, mime) {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        }
        async function exportCSV(type) {
            try {
                let data, csv, headers;
                if (type === 'players') {
                    data = await api('/api/players');
                    headers = 'ID,Name,Discord,Riot,Rank,Role,Type,Pts,Elo,Wins,Losses,MVPs,Team\n';
                    csv = headers + data.map(p => `"${p.id}","${p.displayName}","${p.discordId}","${p.riotId}","${p.rank}","${p.role}","${p.type}",${p.pts},${p.elo},${p.wins},${p.losses},${p.mvps},"${p.teamId||''}"`).join('\n');
                } else if (type === 'matches') {
                    data = await api('/api/matches');
                    headers = 'ID,Team1,Team2,Score1,Score2,Winner,Map,Status,Scheduled\n';
                    csv = headers + data.map(m => `"${m.id}","${m.team1Name}","${m.team2Name}",${m.score1},${m.score2},"${m.winner||''}","${m.map||''}","${m.status}","${m.scheduledAt||''}"`).join('\n');
                } else if (type === 'leaderboard') {
                    data = await api('/api/matches/leaderboard');
                    headers = 'Rank,Name,Elo,RankName,Wins,Losses,MVPs\n';
                    csv = headers + data.map(p => `${p.rank},"${p.displayName}",${p.elo},"${p.rankName}",${p.wins},${p.losses},${p.mvps}`).join('\n');
                }
                downloadFile('\uFEFF' + csv, 'evan-cup-' + type + '.csv', 'text/csv;charset=utf-8;');
                showToast('Đã tải ' + type + '.csv', 'success');
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function autoRefreshAPI() {
            if (!confirm("Hệ thống sẽ tự động gọi API lấy lại Rank và Tỉ lệ HS% cho toàn bộ tuyển thủ. Quá trình này sẽ mất khoảng 3 phút và chạy ngầm. Tiếp tục?")) return;
            try {
                const btn = document.getElementById('auto-fetch-api-text');
                if (btn) btn.innerText = 'Đang chạy...';
                const res = await api('/api/players/admin/auto-refresh-all', { method: 'POST' });
                showToast(res.message, 'success');
            } catch (e) {
                showToast(e.message || 'Lỗi khi gọi auto refresh', 'error');
                const btn = document.getElementById('auto-fetch-api-text');
                if (btn) btn.innerText = 'Auto Fetch API';
            }
        }

        async function autoEvaluatePlayers(force) {
            if (!confirm(force ? "CẢNH BÁO: Bạn sắp GHI ĐÈ điểm số của TẤT CẢ tuyển thủ. Chấm điểm thủ công trước đó sẽ bị mất. Tiếp tục?" : "Tính năng này sẽ tự động chấm điểm cho các tuyển thủ chưa có C.Score. Chạy ngay?")) return;
            
            showLoading('Đang chấm điểm tự động...');
            try {
                const res = await api('/api/players/auto-evaluate', {
                    method: 'POST',
                    body: JSON.stringify({ force })
                });
                hideLoading();
                showToast(res.message || 'Chấm điểm hoàn tất', 'success');
                // Reload data if we are in teams/dashboard
                if (currentAdminSubTab === 'teams') renderAdmin();
                if (currentAdminSubTab === 'data') loadAdminStats();
            } catch (e) {
                hideLoading();
                showToast(e.message || 'Lỗi khi chấm điểm', 'error');
            }
        }

        async function exportJSON() {
            try {
                const [players, matches, leaderboard, standings] = await Promise.all([
                    api('/api/players'), api('/api/matches'),
                    api('/api/matches/leaderboard'), api('/api/matches/standings')
                ]);
                const json = JSON.stringify({ exportedAt: new Date().toISOString(), players, matches, leaderboard, standings }, null, 2);
                downloadFile(json, 'evan-cup-all.json', 'application/json');
                showToast('Đã tải evan-cup-all.json', 'success');
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function lookupRiotId() {
            const riotId = document.getElementById('riot-lookup-input').value.trim();
            const region = document.getElementById('riot-lookup-region').value;
            const resultEl = document.getElementById('riot-lookup-result');
            if (!riotId) return showToast('Nhập Riot ID!', 'error');
            resultEl.className = 'mt-3 p-3 bg-valBg/80 border border-gray-800 rounded-lg';
            resultEl.innerHTML = '<div class="text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Đang tra cứu...</div>';
            resultEl.classList.remove('hidden');
            try {
                const data = await api('/api/valorant/lookup', { method: 'POST', body: { riotId, region } });
                resultEl.innerHTML = `<div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <span class="text-white font-bold text-sm">${data.riotId}</span>
                        <span class="ml-2 text-xs text-yellow-400">${data.rank}</span>
                        <span class="ml-2 text-xs text-gray-500">${data.elo} elo</span>
                        <span class="ml-2 text-xs text-gray-500">${data.pts}đ</span>
                    </div>
                    <button onclick="addLookedUpPlayer()" class="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/30 transition">
                        <i class="fa-solid fa-plus mr-1"></i>Thêm vào giải
                    </button>
                </div>`;
                resultEl.dataset.riotId = data.riotId;
                resultEl.dataset.rank = data.rank;
                resultEl.dataset.pts = data.pts;
                resultEl.dataset.elo = data.elo;
            } catch(e) {
                resultEl.innerHTML = `<div class="text-valRed text-xs"><i class="fa-solid fa-circle-exclamation mr-1"></i>${e.message}</div>`;
            }
        }
        async function addLookedUpPlayer() {
            const el = document.getElementById('riot-lookup-result');
            const riotId = el.dataset.riotId;
            if (!riotId) return showToast('Chưa có dữ liệu!', 'error');
            const name = riotId.split('#')[0];
            const discordId = 'manual_' + Date.now();
            const playerData = {
                displayName: name,
                discordId: discordId,
                riotId: riotId,
                rank: el.dataset.rank || 'Silver (Bạc)',
                role: 'Flex',
                type: 'Solo',
                pts: parseInt(el.dataset.pts) || 3
            };
            const textarea = document.getElementById('csv-import-area');
            const existing = textarea.value.trim();
            const line = `${playerData.displayName},${playerData.discordId},${playerData.riotId},${playerData.rank},${playerData.role},${playerData.type},${playerData.pts}`;
            textarea.value = existing ? existing + '\n' + line : line;
            showToast('Đã thêm vào danh sách Import!', 'success');
        }
        async function importCSV() {
            if (!requireAdminAuth()) return showToast('Lỗi xác thực!', 'error');
            const text = document.getElementById('csv-import-area').value.trim();
            if (!text) return showToast('Nhập dữ liệu CSV!', 'error');
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const players = lines.map(line => {
                const parts = line.split(',').map(s => s.trim());
                return { displayName: parts[0] || '', discordId: parts[1] || '', riotId: parts[2] || '', rank: parts[3] || '', role: parts[4] || '', type: parts[5] || '', pts: parseInt(parts[6]) || 3 };
            });
            const resultEl = document.getElementById('csv-import-result');
            resultEl.textContent = 'Đang import...';
            try {
                const res = await api('/api/players/import', { method: 'POST', body: { players } });
                resultEl.textContent = `✅ Imported: ${res.imported}, Lỗi: ${res.errors.length}`;
                showToast(`Import xong: ${res.imported} người chơi!`, 'success');
                document.getElementById('csv-import-area').value = '';
                renderAdmin();
            } catch(e) { resultEl.textContent = '❌ Lỗi: ' + e.message; showToast('Lỗi import!', 'error'); }
        }

        // === Player tự chỉnh sửa thông tin ===
        async function lookupPlayerForEdit() {
            let discordId = document.getElementById('edit-discord-id').value.trim();
            if (!discordId && discordUser) { discordId = discordUser.discordId; document.getElementById('edit-discord-id').value = discordId; }
            if (!discordId) return showToast('Nhập Discord ID!', 'error');
            try {
                const p = await api('/api/players/lookup/' + encodeURIComponent(discordId));
                document.getElementById('edit-display-name').value = p.displayName || '';
                document.getElementById('edit-riot-id').value = p.riotId || '';
                document.getElementById('edit-rank').value = p.rank || '';
                document.getElementById('edit-role').value = p.role || '';
                document.getElementById('edit-type').value = p.type || '';
                document.getElementById('edit-player-form').classList.remove('hidden');
                document.getElementById('edit-player-id').value = p.id;
                document.getElementById('edit-player-status').textContent = 'Tìm thấy: ' + p.displayName;
                document.getElementById('edit-player-status').className = 'text-xs text-emerald-400 mt-1';
            } catch(e) {
                document.getElementById('edit-player-form').classList.add('hidden');
                document.getElementById('edit-player-status').textContent = 'Không tìm thấy!';
                document.getElementById('edit-player-status').className = 'text-xs text-red-400 mt-1';
                showToast('Không tìm thấy người chơi!', 'error');
            }
        }
        async function savePlayerEdit() {
            if (!apiToken && !discordUser) return showToast('Cần đăng nhập để chỉnh sửa!', 'error');
            const id = document.getElementById('edit-player-id').value;
            const data = {
                displayName: document.getElementById('edit-display-name').value.trim(),
                riotId: document.getElementById('edit-riot-id').value.trim(),
                rank: document.getElementById('edit-rank').value,
                role: document.getElementById('edit-role').value,
                type: document.getElementById('edit-type').value
            };
            if (!data.displayName) return showToast('Tên không được để trống!', 'error');
            try {
                await api('/api/players/' + id, { method: 'PATCH', body: data });
                showToast('Đã cập nhật thông tin!', 'success');
                document.getElementById('edit-player-form').classList.add('hidden');
                document.getElementById('edit-discord-id').value = '';
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        // === Substitute ===
        async function substitutePlayer() {
            const discordId = document.getElementById('sub-player-id').value.trim();
            const newTeam = document.getElementById('sub-new-team').value.trim();
            if (!discordId || !newTeam) return showToast('Nhập Discord ID và tên đội!', 'error');
            try {
                const players = await api('/api/players');
                const p = players.find(x => x.discordId === discordId);
                if (!p) return showToast('Không tìm thấy VĐV!', 'error');
                await api('/api/players/' + p.id, { method: 'PATCH', body: { teamId: newTeam } });
                showToast('Đã chuyển ' + p.displayName + ' sang ' + newTeam, 'success');
                document.getElementById('sub-player-id').value = '';
                document.getElementById('sub-new-team').value = '';
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        // === Team Management (Admin) ===

        async function sendPlayerNotification() {
            if (!requireAdminAuth()) return showToast('Lỗi xác thực!', 'error');
            const playerId = document.getElementById('admin-notify-player-id').value.trim();
            const message = document.getElementById('admin-notify-message').value.trim();
            if (!message) return showToast('Nhập nội dung thông báo!', 'error');
            try {
                await api('/api/notify/send-notification', { method: 'POST', body: { playerId: playerId || null, message } });
                showToast('Đã gửi thông báo!', 'success');
                document.getElementById('admin-notify-message').value = '';
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Audit Log ===
        async function loadAuditLog() {
            if (!requireAdminAuth()) return;
            try {
                const logs = await api('/api/audit');
                const container = document.getElementById('audit-log-list');
                if (logs.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-2">Chưa có hành động nào</p>'; return; }
                container.innerHTML = logs.map(l => `<div class="flex justify-between bg-valBg/40 border-b border-gray-800/50 p-1.5">
                    <span class="text-gray-300">${l.action}</span>
                    <span class="text-gray-500">${l.detail || ''} &middot; ${new Date(l.createdAt).toLocaleString('vi-VN')}</span>
                </div>`).join('');
            } catch(e) {}
        }

        async function saveWebhookUrl() {
            if (!requireAdminAuth()) return;
            const url = document.getElementById('webhook-url-input').value.trim();
            if (!url) return showToast('Nhập webhook URL!', 'error');
            try {
                await api('/api/settings/webhook_url', { method: 'PUT', body: { value: url } });
                showToast('Đã lưu webhook URL!', 'success');
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }
        async function loadWebhookUrl() {
            if (!requireAdminAuth()) return;
            try {
                const settings = await api('/api/settings');
                const wh = settings.find(s => s.key === 'webhook_url');
                if (wh) document.getElementById('webhook-url-input').value = wh.value;
            } catch(e) {}
        }

        // === Bracket Tab ===
        window.escHtml = function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        function getPtsFromRank(rankStr) {
            if (!rankStr || typeof rankStr !== 'string') return 3;
            const map = { iron:1, sắt:1, bronze:2, đồng:2, silver:3, bạc:3, gold:4, vàng:4, platinum:5, 'bạch kim':5, diamond:6, 'kim cương':6, ascendant:7, 'siêu việt':7, 'thuợng nhân':7, immortal:9, 'bất tử':9, radiant:10, 'thách đấu':10 };
            const k = rankStr.toLowerCase();
            for (const [key, val] of Object.entries(map)) { if (k.includes(key)) return val; }
            return 3;
        }
        function requireAdminAuth() {
            if (window.apiToken) return true;
            if (window.discordUser && window.discordUser.isAdmin) { window.apiToken = 'discord_admin'; localStorage.setItem('evan_api_token', 'discord_admin'); return true; }
            window.showToast('Bạn không có quyền Admin!', 'error');
            return false;
        }
        function getAvatarUrl(discordId, discordAvatar, size) {
            if (!discordId) return '';
            if (discordAvatar) return 'https://cdn.discordapp.com/avatars/' + discordId + '/' + discordAvatar + '.png?size=' + (size || 32);
            try { const idx = Number((BigInt(discordId) >> 22n) % 6n); return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png'; } catch(e) { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
        }
        window.getFallbackAvatar = function(discordId, name, size) {
            const letter = (name && name.length > 0) ? name.charAt(0).toUpperCase() : '?';
            const colorIdx = discordId ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
            const colors = ['#5865F2','#ED4245','#57F287','#FEE75C','#EB459E','#00AFFA'];
            const bg = colors[Number(colorIdx)] || '#5865F2';
            const s = size || 64;
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '"><rect width="' + s + '" height="' + s + '" rx="' + (s/4) + '" fill="' + bg + '"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="' + (s*0.45) + '" font-weight="700" font-family="Arial,sans-serif">' + letter + '</text></svg>';
            return 'data:image/svg+xml,' + encodeURIComponent(svg);
        };
        window.getRankIconUrl = function(rankStr) {
            if (!rankStr) return '';
            var tierMap = { iron:3, bronze:6, silver:9, gold:12, platinum:15, diamond:18, ascendant:21, immortal:24, radiant:26 };
            var lower = rankStr.toLowerCase();
            for (var key in tierMap) {
                if (lower.includes(key)) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/' + tierMap[key] + '/smallicon.png';
            }
            return '';
        };
        // Global fallback cho avatar Discord
        document.addEventListener('error', function(e) {
            const img = e.target;
            if (img.tagName !== 'IMG') return;
            if (img.src && img.src.indexOf('discordapp.com') !== -1 && img.src.indexOf('data:image') === -1) {
                const did = img.getAttribute('data-discord-id') || '';
                const name = img.getAttribute('data-name') || img.getAttribute('alt') || '?';
                img.src = window.getFallbackAvatar(did, name, img.width || 64);
                img.onerror = null;
            }
        }, true);

        // === Teams browser ===
        let allTeams = [];
        let currentPlayerTeam = null;
        let pendingRequestsMap = {};

        async function loadTeams() {
            return loadTeamsBrowser();
        }

        async function loadBracket() {
            const container = document.getElementById('bracket-container');
            const btn = document.getElementById('btn-generate-playoff');
            const isAdmin = !!apiToken;
            showLoading('Đang tải playoff...');
            try {
                const bracket = await api('/api/bracket');
                if (bracket.semis?.length > 0 || bracket.final) {
                    if (isAdmin) btn.classList.add('hidden');
                    const matches = await api('/api/matches');
                    const playoffMatches = matches.filter(m => m.group === 'playoff' || m.round === 'semifinal' || m.round === 'final');
                    let html = '<div class="flex flex-col md:flex-row gap-4 items-center justify-center">';
                    bracket.semis.forEach((s, i) => {
                        const m = playoffMatches.find(p => p.team1Name === s.team1Name && p.team2Name === s.team2Name);
                        const score = m?.status === 'completed' ? `${m.score1} - ${m.score2}` : '?';
                        const wClass = m?.winner === s.team1Name ? 'text-emerald-400' : m?.winner === s.team2Name ? 'text-emerald-400' : '';
                        html += `<div class="bg-valBg/60 border border-gray-800 p-4 rounded-xl text-center min-w-[180px]">
                            <div class="text-[10px] text-yellow-400 uppercase font-bold mb-2">${i === 0 ? 'Bán kết 1' : 'Bán kết 2'}</div>
                            <div class="text-sm font-bold text-white">${s.team1Name || 'TBD'}</div>
                            <div class="text-lg font-black font-mono ${wClass}">${score}</div>
                            <div class="text-sm font-bold text-white">${s.team2Name || 'TBD'}</div>
                            ${m && isAdmin ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> KQ</button>` : ''}
                        </div>`;
                    });
                    html += '</div>';
                    const final = playoffMatches.find(p => p.round === 'final');
                    if (final) {
                        const fScore = final.status === 'completed' ? `${final.score1} - ${final.score2}` : '?';
                        const fClass = final.winner === final.team1Name ? 'text-emerald-400' : final.winner === final.team2Name ? 'text-emerald-400' : '';
                        html += `<div class="mt-6 flex justify-center">
                            <div class="bg-gradient-to-b from-yellow-500/20 via-valBg to-yellow-950/30 border-2 border-yellow-400 p-6 rounded-2xl text-center min-w-[250px]">
                                <div class="text-[10px] text-yellow-400 uppercase font-bold mb-2"><i class="fa-solid fa-trophy"></i> CHUNG KẾT</div>
                                <div class="text-sm font-bold text-white">${final.team1Name || 'TBD'}</div>
                                <div class="text-2xl font-black font-mono ${fClass}">${fScore}</div>
                                <div class="text-sm font-bold text-white">${final.team2Name || 'TBD'}</div>
                                ${final.winner ? `<div class="mt-2 text-sm font-black text-yellow-400">🏆 Vô địch: ${final.winner}</div>` : ''}
                                ${isAdmin ? `<button onclick="openResultModal('${final.id}','${final.team1Name}','${final.team2Name}','${final.score1}','${final.score2}','${final.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> Nhập KQ</button>` : ''}
                            </div>
                        </div>`;
                    }
                    container.innerHTML = html;
                    hideLoading();
                } else {
                    if (isAdmin) btn.classList.remove('hidden');
                    hideLoading();
                    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-diagram-project text-3xl mb-2"></i><p>Chưa có playoff.</p></div>';
                }
            } catch(e) {
                hideLoading();
                container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải dữ liệu playoff</div>';
            }
        }
        async function generatePlayoff() {
            if (!requireAdminAuth()) return;
            try {
                await api('/api/bracket/generate', { method: 'POST' });
                showToast('Đã tạo playoff!', 'success');
                loadBracket();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }


        // === Stream Archive Functions ===


        // === Stream Functions ===
        function pulseTab(tabId) {
            const btn = document.getElementById('btn-' + tabId);
            if (btn && !btn.querySelector('.tab-pulse-dot')) {
                const dot = document.createElement('span');
                dot.className = 'tab-pulse-dot';
                btn.appendChild(dot);
            }
        }

        // Override switchTab to load data on tab switch
        const _baseSwitchTab = switchTab;
        switchTab = async function(id) {
            // Remove pulse dot from the clicked tab
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.querySelectorAll('.tab-pulse-dot').forEach(d => d.remove());
            _baseSwitchTab(id);
            if (id === 'register-tab') { autoFillRegisterForm(); }
            if (id === 'dashboard-tab') { loadPlayerProfile(); }
            if (id === 'profile-tab') { loadPlayerProfile(); }
            if (id === 'schedule-tab') { renderSchedule(); }
            if (id === 'teams-tab') { loadTeamsBrowser(); }
            if (id === 'veto-tab') { loadVetoMatches(); }
            if (id === 'leaderboard-tab') { loadLeaderboard(); loadStandings(); }
            if (id === 'bracket-tab') { switchScheduleSubTab('playoff'); _baseSwitchTab('schedule-tab'); }
            if (id === 'tracker-tab') { renderTrackerPage(); }
            if (id === 'stream-tab') {
                await loadStreamBooth();
                loadStreamArchive();
                if (socket && currentStreamSession) {
                    socket.emit('stream:join', currentStreamSession.id);
                }
            }
            if (id === 'admin-tab') {
                // Thử khôi phục apiToken từ cookie nếu chưa có
                if (!window.apiToken) {
                    const m = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
                    if (m) window.apiToken = m[1];
                }
                if (!window.apiToken) {
                  if (!window.discordUser) {
                    window.showToast('Vui l\xf2ng \u0111\u0103ng nh\u1eadp Admin \u0111\u1ec3 s\u1eed d\u1ee5ng', 'warning');
                    setTimeout(() => window.openAdminLoginModal(), 1500);
                  } else {
                    window.showToast('T\xe0i kho\u1ea3n Discord c\u1ee7a b\u1ea1n kh\xf4ng ph\u1ea3i Admin', 'error');
                  }
                  return;
                }
                loadPendingTeams(); renderAdmin();
                loadScoreReports();
                loadAdminDashboard();
                switchAdminSubTab(currentAdminSubTab);
            }
        };

        // Socket events for stream
        if (socket) {
            socket.on('stream:started', (data) => {
                if (data.match) {
                    currentStreamSession = data.session;
                    currentStreamMatch = data.match;
                    showToast('🔴 Stream bắt đầu: ' + data.match.team1Name + ' vs ' + data.match.team2Name, 'success');
                    if (!document.getElementById('stream-tab').classList.contains('hidden')) {
                        loadStreamBooth();
                    }
                }
            });

            socket.on('stream:score', (data) => {
                if (currentStreamMatch && data.matchId === currentStreamMatch.id) {
                    currentStreamMatch.score1 = data.score1;
                    currentStreamMatch.score2 = data.score2;
                    renderStreamLive();
                }
            });

            socket.on('stream:stopped', () => {
                currentStreamSession = null;
                currentStreamMatch = null;
                showToast('Stream đã kết thúc', 'info');
                if (!document.getElementById('stream-tab').classList.contains('hidden')) {
                    loadStreamBooth();
                }
            });

            socket.on('caster:added', (data) => {
                renderCasters();
            });

            socket.on('caster:removed', () => {
                renderCasters();
            });
        }

        // Check for OBS widget mode on page load
        // === Tương tác ẩn & Easter Eggs ===
        function fireConfetti(count) {
            const canvas = document.getElementById('confetti-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            const colors = ['#ff4655','#00f2fe','#eab308','#22c55e','#a855f7','#ec4899'];
            const pieces = [];
            for (let i = 0; i < (count || 120); i++) {
                pieces.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height*-1, w: Math.random()*8+3, h: Math.random()*8+3, color: colors[Math.floor(Math.random()*colors.length)], vy: Math.random()*3+2, vx: (Math.random()-0.5)*4, rot: Math.random()*360, rv: (Math.random()-0.5)*6, opacity: 1 });
            }
            let frames = 0;
            function animate() {
                if (frames > 120) { ctx.clearRect(0,0,canvas.width,canvas.height); return; }
                ctx.clearRect(0,0,canvas.width,canvas.height);
                for (const p of pieces) {
                    p.y += p.vy; p.x += p.vx; p.rot += p.rv; p.vy += 0.04; p.opacity -= 0.005;
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot*Math.PI/180);
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                    ctx.restore();
                }
                frames++; requestAnimationFrame(animate);
            }
            animate();
        }
        function playEasterEggSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
                o.connect(g); g.connect(audioCtx.destination);
                o.frequency.value = 523.25; o.type = 'sine';
                g.gain.setValueAtTime(0.15, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.5);
                setTimeout(() => {
                    const o2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
                    o2.connect(g2); g2.connect(audioCtx.destination);
                    o2.frequency.value = 659.25; o2.type = 'sine';
                    g2.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                    o2.start(audioCtx.currentTime); o2.stop(audioCtx.currentTime + 0.5);
                }, 200);
            } catch(e) {}
        }
        function playClickSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.frequency.value = 660; o.type = 'sine';
                g.gain.setValueAtTime(0.04, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.08);
            } catch(e) {}
        }
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('button, .tab-btn, [onclick]');
            if (btn && (btn.tagName === 'BUTTON' || btn.classList.contains('tab-btn'))) playClickSound();
        });
        let logoClickCount = 0; let logoTimer = null;
        let rainbowInterval = null;
        function toggleRainbow(enable) {
            const header = document.querySelector('header');
            if (!header) return;
            if (enable) {
                if (rainbowInterval) return;
                let hue = 0;
                rainbowInterval = setInterval(() => {
                    header.style.borderBottomColor = 'hsl(' + hue + ', 100%, 50%)';
                    header.style.borderBottomWidth = '3px';
                    hue = (hue + 2) % 360;
                }, 30);
                showToast('🌈 Konami Code activated! Rainbow mode ON', 'success', 3000);
            } else {
                if (rainbowInterval) { clearInterval(rainbowInterval); rainbowInterval = null; }
                header.style.borderBottomColor = '';
                header.style.borderBottomWidth = '';
            }
        }
        // Konami Code: ↑↑↓↓←→←→BA
        let konamiBuffer = [];
        const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        // Key sequence "evan"
        let evanBuffer = [];
        document.addEventListener('keydown', function(e) {
            if (!e || !e.key) return;
            konamiBuffer.push(e.key);
            if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
            if (konamiBuffer.length === KONAMI.length && konamiBuffer.every((k,i) => k === KONAMI[i])) {
                toggleRainbow(true);
                fireConfetti(150);
                playEasterEggSound();
                konamiBuffer = [];
            }
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            evanBuffer.push(e.key.toLowerCase());
            if (evanBuffer.length > 4) evanBuffer.shift();
            if (evanBuffer.join('') === 'evan') {
                fireConfetti(60);
                playEasterEggSound();
                showToast('🎉 EVAN!', 'success', 2000);
                evanBuffer = [];
            }
        });
        // Secret console commands
        window.evan = {
            help: function() { console.log('%c🎮 EVAN CUP SECRETS','font-size:18px;color:#ff4655;font-weight:bold'); console.log('%cevan.rainbow() %c- Toggle rainbow mode','color:#00f2fe','color:#888'); console.log('%cevan.confetti() %c- Fire confetti','color:#00f2fe','color:#888'); console.log('%cevan.party() %c- Full party mode','color:#00f2fe','color:#888'); console.log('%cevan.whoami() %c- Current user info','color:#00f2fe','color:#888'); },
            rainbow: function() { toggleRainbow(!rainbowInterval); },
            confetti: function() { fireConfetti(100); playEasterEggSound(); },
            party: function() { toggleRainbow(true); fireConfetti(200); playEasterEggSound(); setInterval(() => fireConfetti(50), 2000); showToast('🎊 PARTY MODE!','success'); },
            whoami: function() { console.log('%c👤 Current User:','font-weight:bold', discordUser || 'Not logged in'); },
            version: '1.0-easter'
        };
        // Click 7 lần vào admin empty area
        let adminClickCount = 0; let adminClickTimer = null;
        function initAdminEasterEgg() {
            const adminSection = document.getElementById('admin-tab');
            if (!adminSection) return;
            adminSection.addEventListener('click', function(e) {
                if (e.target === adminSection || e.target.closest('.bg-valCard') === null && e.target.closest('#admin-sub-players') === null) {
                    adminClickCount++;
                    if (adminClickTimer) clearTimeout(adminClickTimer);
                    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 3000);
                    if (adminClickCount === 7) {
                        adminClickCount = 0;
                        showToast('🕵️ Bạn tìm gì ở đây thế? Admin menu có nhiều bí mật lắm!', 'info', 5000);
                        fireConfetti(40);
                    }
                }
            });
        }
        // Particles theo chuột
        let particleCtx = null; let particleCanvas = null;
        function initParticles() {
            const adminSub = document.getElementById('admin-sub-players');
            if (!adminSub) return;
            particleCanvas = document.getElementById('confetti-canvas');
            if (!particleCanvas) return;
            adminSub.addEventListener('mousemove', function(e) {
                if (Math.random() > 0.3) return;
                const rect = adminSub.getBoundingClientRect();
                const x = e.clientX, y = e.clientY;
                const colors = ['rgba(0,242,254,0.5)','rgba(255,70,85,0.4)','rgba(234,179,8,0.4)'];
                const p = { x, y, vx: (Math.random()-0.5)*2, vy: -Math.random()*2-1, size: Math.random()*2.5+1, color: colors[Math.floor(Math.random()*colors.length)], life: 1 };
                const d = 0.02;
                function animParticle() { if (!particleCanvas) return;
                    const ctx = particleCanvas.getContext('2d');
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                    ctx.globalAlpha = 1;
                    p.x += p.vx; p.y += p.vy; p.life -= d;
                    if (p.life > 0) requestAnimationFrame(animParticle);
                }
                animParticle();
            });
        }
        // Custom cursor
        // Custom cursor removed per user request

        // Scroll effect — glassmorphism header
        document.addEventListener('scroll', function() {
            const h = document.querySelector('header');
            if (!h) return;
            if (window.scrollY > 40) h.classList.add('header-scroll');
            else h.classList.remove('header-scroll');
        });

        // Input validation — Riot ID tick
        document.addEventListener('input', function(e) {
            const inp = e.target;
            if (inp.id === 'riot-id' || inp.id === 'register-riot-id') {
                const tick = inp.parentElement.querySelector('.input-tick');
                const hasHash = inp.value.includes('#') && inp.value.split('#')[1]?.length > 0;
                if (tick) { tick.classList.toggle('hidden', !hasHash); tick.classList.toggle('opacity-100', hasHash); }
                inp.classList.toggle('input-valid', hasHash);
            }
        });

        // Button loading state helper
        function withLoading(btn, fn) {
            return async function(...args) {
                if (btn.disabled) return;
                const orig = btn.innerHTML;
                btn.disabled = true; btn.classList.add('btn-loading');
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i>Đang xử lý...';
                try { await fn.apply(this, args); } catch(e) { showToast(e.message, 'error'); }
                btn.disabled = false; btn.classList.remove('btn-loading');
                btn.innerHTML = orig;
            };
        }

        function initEasterEggs() {
            const logoEl = document.getElementById('main-logo');
            if (logoEl) {
                logoEl.addEventListener('dblclick', function(e) {
                    fireConfetti(80);
                    playEasterEggSound();
                    showToast('🎉 EVAN CUP!', 'success');
                });
            }
            document.querySelectorAll('p, span').forEach(el => {
                if (el.textContent.includes('26') && el.textContent.includes('TRẦN')) {
                    el.style.cursor = 'pointer';
                    el.title = 'Giới hạn 26 điểm cho 5 người — bấm để xem luật';
                    el.addEventListener('click', function() {
                        showToast('🏆 Luật trần điểm: Tổng điểm 5 thành viên không được vượt quá 26 điểm!', 'info', 5000);
                    });
                }
            });
            // Triple-click "make u feel better"
            document.querySelectorAll('span').forEach(el => {
                if (el.textContent.includes('make u feel better')) {
                    let clickCount = 0; let clickTimer = null;
                    el.style.cursor = 'pointer';
                    el.title = '👀';
                    el.addEventListener('click', function() {
                        clickCount++;
                        if (clickTimer) clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
                        if (clickCount >= 3) {
                            clickCount = 0;
                            let hue = 0;
                            const interval = setInterval(() => {
                                el.style.color = 'hsl(' + hue + ', 100%, 65%)';
                                hue = (hue + 5) % 360;
                            }, 50);
                            setTimeout(() => { clearInterval(interval); el.style.color = ''; }, 3000);
                            fireConfetti(50);
                            playEasterEggSound();
                            showToast('🌈 You make me feel better too!', 'success', 3000);
                        }
                    });
                }
            });
            initAdminEasterEgg();
            initParticles();
            // Hover feedback cho các vùng tương tác ẩn
            let audioCtx = null;
            function hoverBeep() {
                try {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.frequency.value = 880; gain.gain.value = 0.05;
                    osc.start(); osc.stop(audioCtx.currentTime + 0.08);
                } catch(e) {}
            }
            document.querySelectorAll('[data-interactive]').forEach(el => {
                el.addEventListener('mouseenter', function() {
                    this.classList.add('wiggle');
                    setTimeout(() => this.classList.remove('wiggle'), 600);
                    hoverBeep();
                });
            });
            // Twinkle effect trên logo và các elements có data-interactive
            const style = document.createElement('style');
            style.textContent = `
                @keyframes wiggle {
                    0%,100%{transform:rotate(0deg)}
                    20%{transform:rotate(-3deg) scale(1.05)}
                    40%{transform:rotate(3deg) scale(1.05)}
                    60%{transform:rotate(-2deg)}
                    80%{transform:rotate(2deg)}
                }
                .wiggle { animation: wiggle 0.6s ease-in-out; }
                [data-interactive] { cursor: pointer; transition: all 0.2s; }
                [data-interactive]:hover { filter: brightness(1.3); transform: scale(1.05); }
                @keyframes skeleton { 0%,100%{opacity:.4} 50%{opacity:1} }
                .skeleton { background: linear-gradient(90deg,#1f2937 25%,#374151 50%,#1f2937 75%); background-size:200% 100%; animation:skeleton 1.5s ease-in-out infinite; border-radius:8px; }
                .toast-slide { animation: toastIn .3s ease-out, toastOut .3s ease-in 2.7s forwards; }
                @keyframes toastIn { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
                @keyframes toastOut { from { opacity:1 } to { opacity:0; transform:translateX(50%) } }
                .toast-progress { position:absolute; bottom:0; left:0; height:2px; border-radius:0 0 12px 12px; animation: toastProgress 3s linear forwards; }
                @keyframes toastProgress { from { width:100% } to { width:0% } }
                .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
                @keyframes bounce-subtle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                .tab-fade-in { animation: fadeInUp .3s ease-out forwards; }
                @keyframes fadeInUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
                .input-glow:focus-within label { color:#00f2fe; text-shadow:0 0 8px rgba(0,242,254,0.3); }
                .input-glow input:focus, .input-glow textarea:focus { border-color:#00f2fe; box-shadow:0 0 0 2px rgba(0,242,254,0.1), 0 0 20px rgba(0,242,254,0.05); }
                .input-valid { border-color:#22c55e !important; box-shadow:0 0 0 2px rgba(34,197,94,0.1) !important; }
                .header-scroll { backdrop-filter:blur(16px) saturate(180%) !important; background:rgba(11,14,20,0.85) !important; border-bottom-color:rgba(0,242,254,0.15) !important; }
                .btn-loading { pointer-events:none; opacity:.7; position:relative; }
                .glitch { animation: glitch .3s ease 2; }
                @keyframes glitch { 0%{transform:translate(0)} 20%{transform:translate(-2px,1px)} 40%{transform:translate(2px,-1px)} 60%{transform:translate(-1px,-1px)} 80%{transform:translate(1px,2px)} 100%{transform:translate(0)} }
                @keyframes logoGlitch { 0%{clip-path:inset(0 0 80% 0);transform:translate(-2px,2px)} 10%{clip-path:inset(20% 0 60% 0);transform:translate(2px,-2px)} 20%{clip-path:inset(40% 0 40% 0);transform:translate(-1px,1px)} 30%{clip-path:inset(60% 0 20% 0);transform:translate(1px,-1px)} 40%{clip-path:inset(80% 0 0 0);transform:translate(-2px,1px)} 50%{clip-path:inset(0 0 70% 0);transform:translate(2px,2px)} 60%{clip-path:inset(10% 0 50% 0);transform:translate(-1px,-1px)} 70%{clip-path:inset(30% 0 30% 0);transform:translate(1px,2px)} 80%{clip-path:inset(50% 0 10% 0);transform:translate(-2px,-1px)} 90%{clip-path:inset(70% 0 0 0);transform:translate(2px,1px)} 100%{clip-path:inset(0 0 80% 0);transform:translate(-1px,-2px)} }
                #main-logo:hover { animation: logoGlitch .4s steps(1) 2; filter: hue-rotate(90deg) contrast(1.5); transition: filter .3s; }
                .tab-pulse-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#22c55e; margin-left:4px; vertical-align:middle; animation: pulseDot 1.5s ease-in-out infinite; }
                @keyframes pulseDot { 0%,100%{opacity:1;box-shadow:0 0 4px rgba(34,197,94,0.6)} 50%{opacity:.3;box-shadow:0 0 8px rgba(34,197,94,0.2)} }
                .animate-pulse-gold { animation: pulseGold 2s ease-in-out infinite; }
                @keyframes pulseGold { 0%,100%{box-shadow:0 0 15px rgba(250,204,21,0.3)} 50%{box-shadow:0 0 30px rgba(250,204,21,0.6)} }
                .energy-bar { height:8px; border-radius:99px; background:#1f2937; overflow:hidden; transition:all .3s; }
                .energy-bar-fill { height:100%; border-radius:99px; transition:width .4s ease, background .4s ease; }
                .map-banned::after { content:''; position:absolute; inset:0; background:linear-gradient(to top right, transparent 40%, rgba(255,70,85,0.25) 48%, rgba(255,70,85,0.4) 50%, rgba(255,70,85,0.25) 52%, transparent 60%); pointer-events:none; z-index:5; }
                .map-banned .banned-slash { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:6; pointer-events:none; }
                .map-banned .banned-slash i { font-size:3rem; color:rgba(255,70,85,0.5); transform:rotate(0deg); }
                .map-picked-cyan::before, .map-picked-red::before, .map-decider::before { content:''; position:absolute; inset:0; background:linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%); background-size:200% 100%; animation: shineSweep 1.5s ease-in-out infinite; pointer-events:none; z-index:5; }
                @keyframes shineSweep { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .top1-border { position:relative; }
                .top1-border::after { content:''; position:absolute; inset:-2px; border-radius:12px; background:linear-gradient(90deg, #ff4655, #00f2fe, #eab308, #ff4655); background-size:300% 100%; z-index:-1; animation: borderRotate 2s linear infinite; }
                @keyframes borderRotate { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
                @keyframes radarScan { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
                .radar-scan { position:absolute; top:-50%; left:-50%; width:200%; height:200%; border-radius:50%; pointer-events:none; z-index:1; }
                .radar-scan::before { content:''; display:block; width:100%; height:100%; border-radius:50%; background:conic-gradient(from 0deg, transparent 0deg, rgba(0,242,254,0.08) 10deg, transparent 20deg); animation:radarScan .6s linear 1; }
            `;
            document.head.appendChild(style);
            // Mark easter egg elements
            if (logoEl) logoEl.setAttribute('data-interactive', '1');
            document.querySelectorAll('span').forEach(el => {
                if (el.textContent.includes('make u feel better')) el.setAttribute('data-interactive', '1');
            });
            document.querySelectorAll('[class*="21"]').forEach(el => {
                if (el.textContent.includes('TRẦN')) el.setAttribute('data-interactive', '1');
            });
            console.log('%c🎮 Evan Cup loaded. Type %cevan.help() %cfor secrets!', 'color:#888', 'color:#00f2fe;font-weight:bold', 'color:#888');
        }
        // === Context Menu ===
        let contextTarget = null;
        document.addEventListener('contextmenu', function(e) {
            const playerEl = e.target.closest('[data-player-discord]');
            if (playerEl) {
                e.preventDefault();
                contextTarget = {
                    discordId: playerEl.dataset.playerDiscord,
                    name: playerEl.dataset.playerName || 'Unknown',
                    riotId: playerEl.dataset.playerRiot || ''
                };
                const menu = document.getElementById('context-menu');
                document.getElementById('context-target-name').textContent = contextTarget.name;
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
                menu.classList.remove('hidden');
            }
        });
        document.addEventListener('click', function() {
            document.getElementById('context-menu')?.classList.add('hidden');
        });
        function contextAction(action) {
            document.getElementById('context-menu')?.classList.add('hidden');
            if (!contextTarget) return;
            if (action === 'profile') { openProfile(contextTarget.discordId); }
            else if (action === 'copy-id') {
                navigator.clipboard.writeText(contextTarget.discordId).then(() => showToast('Đã copy Discord ID!', 'success')).catch(() => {});
            } else if (action === 'copy-riot') {
                navigator.clipboard.writeText(contextTarget.riotId || contextTarget.discordId).then(() => showToast('Đã copy Riot ID!', 'success')).catch(() => {});
            }
            contextTarget = null;
        }
        // === Phím tắt ===
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                ['profile-modal','team-modal','profile-edit-modal','help-modal','score-report-modal','score-modal','dispute-modal','result-modal','discord-guide-modal'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
                });
            }
            // Mouse-only interactions — no keyboard shortcuts beyond Escape
        });
        // === Copy on double-click ===
        document.addEventListener('dblclick', function(e) {
            const el = e.target.closest('[data-copy]');
            if (el) {
                navigator.clipboard.writeText(el.dataset.copy).then(() => { showToast('Đã copy: ' + el.dataset.copy, 'success'); }).catch(() => {});
            }
        });
        // === Load H2H ===
        async function loadH2H() {
            const opponentId = document.getElementById('h2h-opponent')?.value?.trim();
            const resultDiv = document.getElementById('h2h-result');
            if (!opponentId || !lastProfileDiscordId) { resultDiv.innerHTML = '<p class="text-gray-500 text-xs">Nhập Discord ID đối thủ</p>'; return; }
            resultDiv.innerHTML = '<p class="text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Đang so sánh...</p>';
            try {
                const data = await api('/api/matches/h2h/' + lastProfileDiscordId + '/' + opponentId);
                if (data.matches.length === 0) {
                    resultDiv.innerHTML = '<p class="text-gray-500 text-xs">Chưa có trận đối đầu nào</p>';
                    return;
                }
                let html = '<div class="flex items-center justify-between bg-valCard border border-gray-800 p-2 rounded-lg mb-2 text-xs">';
                html += '<span class="font-bold text-valCyan">' + data.p1.displayName + ': ' + data.p1.wins + ' thắng</span>';
                html += '<span class="text-gray-500">vs</span>';
                html += '<span class="font-bold text-valCyan">' + data.p2.displayName + ': ' + data.p2.wins + ' thắng</span>';
                html += '</div>';
                html += '<div class="space-y-1 max-h-32 overflow-y-auto">';
                data.matches.forEach(m => {
                    const date = m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('vi-VN') : '';
                    html += '<div class="flex items-center justify-between bg-valBg/40 border border-gray-800 p-1.5 rounded text-[10px]"><span class="text-gray-400">' + date + '</span><span class="font-mono font-bold ' + (m.p1Win ? 'text-emerald-400' : 'text-red-400') + '">' + m.p1Score + ' - ' + m.p2Score + '</span><span class="text-gray-500">' + (m.map || '') + '</span></div>';
                });
                html += '</div>';
                resultDiv.innerHTML = html;
            } catch(e) {
                resultDiv.innerHTML = '<p class="text-red-400 text-xs">' + e.message + '</p>';
            }
        }
        let lastProfileDiscordId = null;

        window.animateValue = function(element, start, end, duration) {
            if (!element) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(easeOutQuart * (end - start) + start);
                element.textContent = current;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    element.textContent = end;
                }
            };
            window.requestAnimationFrame(step);
        };

        window.copyToClipboard = function(text, event) {
            if (event) event.stopPropagation();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showToast('Đã sao chép: ' + text, 'success');
                }).catch(() => {
                    window.showToast('Không thể sao chép!', 'error');
                });
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    window.showToast('Đã sao chép: ' + text, 'success');
                } catch (err) {
                    window.showToast('Không thể sao chép!', 'error');
                }
                document.body.removeChild(textArea);
            }
        };

        document.addEventListener('DOMContentLoaded', function() {
            const params = new URLSearchParams(window.location.search);
            const checkinParam = params.get('checkin');
            if (checkinParam) {
                window.history.replaceState({}, document.title, window.location.pathname);
                localStorage.setItem('pending_checkin', checkinParam);
                if (!document.cookie.includes('discord_token')) {
                    showToast('Cần đăng nhập Discord để điểm danh!', 'warning');
                    setTimeout(() => loginDiscord(), 1500);
                    return;
                }
            }
            
            checkDiscordAuth().then(() => checkAdminAuth());
            if (params.get('discord') === 'loggedin') {
                window.history.replaceState({}, document.title, window.location.pathname);
                checkDiscordAuth();
                showToast('Đã đăng nhập Discord thành công!', 'success');
                setTimeout(() => { if (discordUser) switchTab('profile-tab'); }, 500);
            }
            if (params.get('discord') === 'denied') {
                window.history.replaceState({}, document.title, window.location.pathname);
                showToast('Bạn đã từ chối cấp quyền Discord. Cần đăng nhập để gửi đơn.', 'error');
            }
            if (params.get('obs-widget') === '1') {
                document.getElementById('obs-widget-overlay').classList.remove('hidden');
                setInterval(async () => {
                    try {
                        const data = await api('/api/stream/current');
                        if (data.live && data.match) {
                            currentStreamMatch = data.match;
                            document.getElementById('obs-team1').textContent = data.match.team1Name;
                            document.getElementById('obs-team2').textContent = data.match.team2Name;
                            document.getElementById('obs-score1').textContent = data.match.score1 || 0;
                            document.getElementById('obs-score2').textContent = data.match.score2 || 0;
                            document.getElementById('obs-map').textContent = 'MAP: ' + (data.match.map || 'TBD');
                            document.getElementById('obs-round').textContent = 'VÒNG: ' + (data.match.round === 'semifinal' ? 'Bán Kết' : data.match.round === 'final' ? 'Chung Kết' : 'Bảng');
                            const casterNames = (data.casters || []).map(c => c.name || '???').join(', ');
                            document.getElementById('obs-casters').textContent = 'BLV: ' + (casterNames || '—');
                        }
                    } catch(e) {}
                }, 3000);
            }
            const input = document.getElementById('dashboard-discord-id');
            if (input) input.addEventListener('keydown', function(e) { if (e.key === 'Enter') lookupPlayer(); });
            const teamInput = document.getElementById('dashboard-team-name');
            if (teamInput) teamInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') lookupTeam(); });
            initNotifications();
            initEasterEggs();
        });

        // === Notification Center ===
        let notifCount = 0;
        let notifs = [];

        // Click outside to close
        document.addEventListener('click', function(e) {
            const panel = document.getElementById('notif-panel');
            const bell = document.getElementById('notif-bell');
            if (panel && !panel.classList.contains('hidden') && !e.target.closest('#notif-bell') && !e.target.closest('#notif-panel')) {
                panel.classList.add('hidden');
            }
        });

        // Tooltip guide click handler (for mobile / tap)
        document.addEventListener('click', function(e) {
            const tip = e.target.closest('.tooltip-guide');
            if (!tip) return;
            e.preventDefault();
            tip.classList.toggle('active');
            // auto-hide after 3s
            if (tip.classList.contains('active')) {
                setTimeout(() => tip.classList.remove('active'), 3000);
            }
        });

        // Guide schedule detail popup — 4 phases
        const guideSteps = [
            { title: 'Quy Định Chung', time: null, icon: 'fa-shield-halved', color: 'valRed',
              desc: 'Cấm Toxic 100%. Đúng giờ check-in. Fair Play tuyệt đối. Chụp màn hình kết quả.',
              details: ['Cấm Toxic: Mọi hành vi xúc phạm sẽ bị xử lý kỷ luật', 'Đúng giờ: Check-in trước 15 phút, vào voice đúng giờ', 'Fair Play: Cấm tool, hack, gian lận dưới mọi hình thức', 'Bằng chứng: Chụp màn hình kết quả trận đấu'],
              action: null },
            { title: 'Khung Rank Team 5', time: null, icon: 'fa-layer-group', color: 'purple-400',
              desc: 'Giới hạn rank chi tiết cho 3 Khung: Cao (≤29đ), Trung (≤24đ), Thấp (≤19đ).',
              details: ['Khung Cao (≤29đ): Tối đa 2 Immortal/Radiant, 1 Radiant', 'Khung Trung (≤24đ): Tối đa 1 Ascendant+, 3 Diamond+', 'Khung Thấp (≤19đ): Phù hợp đội hình Gold trở xuống', 'Hệ thống dự bị: điểm sub không tính vào tổng'],
              action: null },
            { title: 'Đăng Ký SOLO & Auto Balance', time: null, icon: 'fa-scale-balanced', color: 'cyan-400',
              desc: 'Đăng ký cá nhân, hệ thống tự động ghép đội cân bằng rank đảm bảo tổng ≤29 điểm.',
              details: ['Đăng ký SOLO: Hệ thống tự động ghép đội dựa trên rank', 'Auto Balance: Cân bằng ELO 5 người ≤29 điểm', 'Dự Bị (Sub): Đội 5-7 người, điểm sub không tính tổng', 'Team 5: Đăng ký theo đội 5-7 người với tổng điểm ≤29'],
              action: { label: 'Đăng Ký Ngay', tab: 'register-tab' } },
            { title: 'VETO Map BO3', time: null, icon: 'fa-map-location-dot', color: 'yellow-500',
              desc: 'Quy trình VETO BO3: Cấm/Chọn map theo lượt, Decider (Ván 3) quyết định.',
              details: ['Đội A CẤM 1 map', 'Đội B CẤM 1 map', 'Đội A CHỌN map 1', 'Đội B CHỌN map 2', 'Map Decider (Ván 3)'],
              action: { label: 'Đi Đến VETO', tab: 'veto-tab' } }
        ];

