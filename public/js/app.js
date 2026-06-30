        const API = window.location.origin;
        let apiToken = localStorage.getItem('evan_api_token');
        let apiPlayerCache = [];
        let lastRiotLookup = null;

        async function api(endpoint, opts = {}) {
          const headers = { 'Content-Type': 'application/json' };
          if (apiToken) headers['Authorization'] = 'Bearer ' + apiToken;
          if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
          let res;
          try { res = await fetch(API + endpoint, { credentials: 'include', ...opts, headers: { ...headers, ...opts.headers } }); }
          catch(e) { throw new Error('Không thể kết nối server — kiểm tra mạng'); }
          if (!res.ok) { let err; try { err = await res.json(); } catch(e) { err = { error: 'HTTP ' + res.status }; } throw new Error(err.error || 'Lỗi kết nối'); }
          if (res.status === 204) return null;
          try { return await res.json(); } catch(e) { throw new Error('Server trả về dữ liệu không hợp lệ'); }
        }

        async function apiLogin(username, password) {
          const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
          apiToken = data.token;
          localStorage.setItem('evan_api_token', data.token);
          return data;
        }

        function apiLogout() {
          apiToken = null;
          localStorage.removeItem('evan_api_token');
          api('/api/auth/logout', { method: 'POST' }).catch(()=>{});
        }

        function requireAdminAuth() {
          if (apiToken) return true;
          _adminModalAllowed = true;
          openAdminLoginModal();
          showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!', 'error');
          return false;
        }

        let loadingCount = 0;

        function showLoading(msg) {
          loadingCount++;
          document.getElementById('loading-text').textContent = msg || 'Đang tải...';
          document.getElementById('loading-overlay').classList.remove('hidden');
        }

        function hideLoading() {
          loadingCount = Math.max(0, loadingCount - 1);
          if (loadingCount === 0) document.getElementById('loading-overlay').classList.add('hidden');
        }

        async function loadPlayers() {
          try { apiPlayerCache = await api('/api/players'); } catch(e) { apiPlayerCache = []; }
          return apiPlayerCache;
        }

        async function syncLocalToAPI() {
          const local = JSON.parse(localStorage.getItem('evan_cup_players') || '[]');
          if (local.length > 0) {
            for (const p of local) {
              try {
                await api('/api/players', { method: 'POST', body: {
                  displayName: p.discord || p.displayName || p.name || 'Unknown',
                  discordId: p.discord || '0',
                  riotId: p.riotId || 'Unknown#000',
                  rank: p.rank || 'Vàng',
                  role: p.role || 'Flex',
                  type: p.type || 'Solo',
                  pts: p.pts || 3
                }});
              } catch(e) {}
            }
            localStorage.removeItem('evan_cup_players');
            localStorage.removeItem('evan_cup_team1');
            localStorage.removeItem('evan_cup_team2');
            await loadPlayers();
            renderAdmin();
          }
        }

        // === End API Layer ===

        // Hệ thống quy đổi Rank thành điểm thi đấu sòng phẳng
        const rankPointsMap = { 
            "Iron (Sắt)": 1, 
            "Bronze (Đồng)": 2, 
            "Silver (Bạc)": 3, 
            "Gold (Vàng)": 4, 
            "Platinum (Bạch Kim)": 5, 
            "Diamond (Kim Cương)": 6, 
            "Ascendant (Thượng Nhân)": 7, 
            "Immortal (Bất Tử)": 8 
        };
        
        let players = [];
        let team1 = [];
        let team2 = [];

        // Khởi động trang, tự động hồi phục trạng thái dữ liệu cũ (LocalStorage)
        window.onload = async function() {
            loadTournamentData();
            if (apiToken) {
                try {
                    const me = await api('/api/auth/me');
                    document.getElementById('btn-admin-tab').classList.remove('hidden');
                    document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập`;
                    await syncLocalToAPI();
                    await loadPlayers();
                    renderAdmin();
                } catch(e) {
                    apiToken = null;
                    localStorage.removeItem('evan_api_token');
                }
            }
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

        // Tự động sửa lỗi tải Logo và vẽ Vector thay thế
        function handleLogoError() {
            const logoImg = document.getElementById('main-logo');
            if (logoImg) {
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
        function toggleHelpModal() {
            const modal = document.getElementById('help-modal');
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                document.getElementById('help-detailed')?.classList.add('hidden');
                document.getElementById('help-easteregg-hint')?.classList.remove('hidden');
            }
        }
        function toggleHelpDetailed() {
            const d = document.getElementById('help-detailed');
            const h = document.getElementById('help-easteregg-hint');
            if (d) { d.classList.toggle('hidden'); }
            if (h) { h.classList.add('hidden'); }
            fireConfetti(30);
            playEasterEggSound();
        }
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

        function showToast(msg, type='info', duration) {
            if (duration === undefined) duration = 3000;
            const container = document.getElementById('toast-container');
            const el = document.createElement('div');
            const colors = { success: 'border-l-valCyan bg-valCard', error: 'border-l-valRed bg-valCard', warning: 'border-l-yellow-500 bg-valCard', info: 'border-l-blue-500 bg-valCard' };
            const progressColors = { success: 'bg-valCyan', error: 'bg-valRed', warning: 'bg-yellow-500', info: 'bg-blue-500' };
            const icons = { success: 'fa-check text-valCyan', error: 'fa-exclamation-circle text-valRed', warning: 'fa-triangle-exclamation text-yellow-400', info: 'fa-circle-info text-blue-400' };
            el.className = 'relative overflow-hidden p-3 rounded-xl border-l-4 ' + (colors[type] || colors.info) + ' shadow-2xl flex items-center gap-3 w-72 text-xs text-white mb-2 toast-slide';
            el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span class="flex-1">' + msg + '</span><div class="toast-progress ' + (progressColors[type] || 'bg-blue-500') + '" style="animation-duration:' + (duration/1000) + 's"></div>';
            container.appendChild(el);
            setTimeout(() => el.remove(), duration);
        }

        // === Player Profile ===
        let profileChartInstances = {};

        function destroyProfileCharts() {
            Object.values(profileChartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
            profileChartInstances = {};
        }

        function closeProfile() {
            destroyProfileCharts();
            document.getElementById('profile-modal').classList.add('hidden');
        }

        async function refreshPlayerRank(discordId) {
            if (!discordUser || discordUser.discordId !== discordId) return showToast('Chỉ chủ tài khoản mới refresh được!', 'error');
            const btn = document.querySelector('button[onclick*="refreshPlayerRank"]');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>'; }
            try {
                const res = await api('/api/players/refresh-rank', { method: 'POST' });
                showToast('Đã cập nhật rank: ' + res.rank, 'success');
                openProfile(discordId);
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i>Đồng bộ Rank'; }
            }
        }

        async function openProfile(discordId) {
            document.getElementById('profile-modal').classList.remove('hidden');
            const modalContent = document.querySelector('#profile-modal > div');
            if (modalContent) {
                const radar = document.createElement('div');
                radar.className = 'radar-scan';
                radar.innerHTML = '<div></div>';
                modalContent.style.position = 'relative';
                modalContent.appendChild(radar);
                setTimeout(() => radar.remove(), 600);
            }
            document.getElementById('profile-name').textContent = 'Đang tải...';
            try {
                const data = await api('/api/players/profile/' + discordId);
                const p = data.player;
                lastProfileDiscordId = discordId;
                document.getElementById('profile-name').textContent = p.displayName + ' — Hồ Sơ';
                const avatarEl = document.getElementById('profile-modal-avatar');
                if (p.discordAvatar) {
                    avatarEl.src = 'https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=64';
                    avatarEl.classList.remove('hidden');
                } else {
                    avatarEl.classList.add('hidden');
                }

                // Info — enhanced player profile
                const teamName = data.team ? data.team.name : p.teamId || 'Tự do';
                const ss = data.seasonStats || {};
                const kda = data.kda || {};
                const k = kda.kills || 0, d = kda.deaths || 0, a = kda.assists || 0;
                const totalGames = p.wins + p.losses;
                const winRate = totalGames > 0 ? Math.round(p.wins / totalGames * 100) : 0;
                const kdaRatio = d > 0 ? ((k + a) / d).toFixed(2) : (k + a > 0 ? (k + a).toFixed(2) : '0.00');
                const totalMatches_ = ss.totalMatches || 0;
                // Estimate HS% from kills (not available from API, show placeholder if no data)
                const hasMatchData = totalMatches_ > 0 || totalGames > 0;
                document.getElementById('profile-info').innerHTML =
                    '<div class="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">' +
                    '<div class="bg-gradient-to-b from-valCyan/10 to-transparent border border-valCyan/20 p-2.5 rounded-xl text-center"><span class="text-[9px] text-gray-500 uppercase block mb-0.5">Xếp Hạng</span><span class="text-valCyan font-black text-lg">#' + (ss.playerRank || '—') + '</span></div>' +
                    '<div class="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 p-2.5 rounded-xl text-center"><span class="text-[9px] text-gray-500 uppercase block mb-0.5">Win Rate</span><span class="text-emerald-400 font-black text-lg">' + winRate + '%</span></div>' +
                    '<div class="bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/20 p-2.5 rounded-xl text-center"><span class="text-[9px] text-gray-500 uppercase block mb-0.5">KDA</span><span class="text-yellow-400 font-black text-lg">' + kdaRatio + '</span></div>' +
                    '<div class="bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 p-2.5 rounded-xl text-center"><span class="text-[9px] text-gray-500 uppercase block mb-0.5">Elo</span><span class="text-purple-400 font-black text-lg">' + p.elo + '</span></div>' +
                    '</div>' +
                    '<div class="col-span-2 bg-valBg/60 border border-gray-800 p-3 rounded-xl"><div class="flex items-center gap-2"><i class="fa-solid fa-gamepad text-valCyan"></i><span class="text-gray-500 text-[10px] uppercase tracking-wider">Thông Tin Tuyển Thủ</span></div><div class="grid grid-cols-2 gap-2 mt-2">' +
                    '<div><span class="text-[10px] text-gray-500">Riot ID</span><p class="text-white font-bold truncate">' + (p.riotId || '—') + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Rank Hiện Tại</span><p class="text-white font-bold">' + (p.rank || '—') + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Peak Rank</span><p class="text-yellow-400 font-bold">' + (p.peakRank || p.rank || '—') + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Vai Trò</span><p class="text-white font-bold">' + (p.role || '—') + '</p></div>' +
                    '</div></div>' +
                    '<div class="col-span-2 bg-valBg/60 border border-gray-800 p-3 rounded-xl"><div class="flex items-center gap-2"><i class="fa-solid fa-chart-simple text-emerald-400"></i><span class="text-gray-500 text-[10px] uppercase tracking-wider">Chỉ Số Thi Đấu</span></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">K / D / A</span><span class="text-white font-mono font-bold text-sm">' + k + ' / ' + d + ' / ' + a + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">W / L</span><span class="text-emerald-400 font-mono font-bold text-sm">' + p.wins + '</span><span class="text-gray-500 mx-0.5">/</span><span class="text-red-400 font-mono font-bold text-sm">' + p.losses + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">MVP</span><span class="text-yellow-400 font-mono font-bold text-sm">' + (p.mvps || 0) + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">Số Trận</span><span class="text-white font-mono font-bold text-sm">' + totalGames + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">Trận Mùa Này</span><span class="text-white font-mono font-bold text-sm">' + totalMatches_ + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">Đội</span><span class="text-valCyan font-mono font-bold text-sm truncate block">' + teamName + '</span></div>' +
                    '</div></div>' +
                    '<div class="col-span-2 bg-valBg/60 border border-gray-800 p-3 rounded-xl"><div class="flex items-center gap-2"><i class="fa-solid fa-shield text-indigo-400"></i><span class="text-gray-500 text-[10px] uppercase tracking-wider">Discord</span></div><div class="flex items-center gap-2 mt-2"><span class="text-[10px] text-gray-500">ID:</span><span class="text-white font-mono text-xs">' + (p.discordId || '—') + '</span></div>' +
'<div class="mt-2"><button onclick="refreshPlayerRank(\'' + p.discordId + '\')" class="text-[10px] bg-valCyan/10 text-valCyan border border-valCyan/30 px-2.5 py-1 rounded-lg hover:bg-valCyan/20 transition"><i class="fa-solid fa-rotate mr-1"></i>Đồng bộ Rank</button></div></div>';

                // Charts
                destroyProfileCharts();
                function showEmpty(container) {
                    const cvs = container.querySelector('canvas');
                    if (cvs) cvs.style.display = 'none';
                    let e = container.querySelector('.chart-empty');
                    if (!e) { e = document.createElement('p'); e.className = 'chart-empty text-gray-500 text-center py-4'; container.appendChild(e); }
                    return e;
                }
                function hideEmpty(container) {
                    const cvs = container.querySelector('canvas');
                    if (cvs) cvs.style.display = '';
                    const e = container.querySelector('.chart-empty');
                    if (e) e.remove();
                }
                const kdaBox = document.querySelector('#kda-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && kdaBox) {
                    const cvs = kdaBox.querySelector('canvas');
                    if (data.kda.kills + data.kda.deaths + data.kda.assists === 0) {
                        showEmpty(kdaBox).textContent = 'Chưa có dữ liệu';
                    } else if (cvs) {
                        hideEmpty(kdaBox);
                        profileChartInstances.kda = new Chart(cvs, {
                            type: 'bar', data: {
                                labels: ['Kills', 'Deaths', 'Assists'],
                                datasets: [{
                                    data: [data.kda.kills, data.kda.deaths, data.kda.assists],
                                    backgroundColor: ['#00f2fe', '#ff4655', '#eab308'],
                                    borderRadius: 4
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } } }
                        });
                    }
                }

                const wlBox = document.querySelector('#wl-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && wlBox) {
                    const cvs = wlBox.querySelector('canvas');
                    if (p.wins + p.losses === 0) {
                        showEmpty(wlBox).textContent = 'Chưa có trận';
                    } else if (cvs) {
                        hideEmpty(wlBox);
                        profileChartInstances.wl = new Chart(cvs, {
                            type: 'doughnut', data: {
                                labels: ['Thắng', 'Thua'],
                                datasets: [{ data: [p.wins, p.losses], backgroundColor: ['#00f2fe', '#ff4655'], borderWidth: 0 }]
                            },
                            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } } } }
                        });
                    }
                }

                const eloBox = document.querySelector('#elo-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && eloBox) {
                    const cvs = eloBox.querySelector('canvas');
                    if (data.eloHistory && data.eloHistory.length > 1 && cvs) {
                        hideEmpty(eloBox);
                        profileChartInstances.elo = new Chart(cvs, {
                            type: 'line', data: {
                                labels: data.eloHistory.map(e => new Date(e.createdAt).toLocaleDateString('vi-VN')),
                                datasets: [{
                                    data: data.eloHistory.map(e => e.elo),
                                    borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.1)',
                                    fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#00f2fe'
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { min: Math.min(...data.eloHistory.map(e=>e.elo)) - 50 || 0, ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af', maxTicksLimit: 8 } } } }
                        });
                    } else {
                        showEmpty(eloBox).textContent = 'Chưa có dữ liệu Elo';
                    }
                }

                // Match history
                const mh = data.matchHistory || [];
                document.getElementById('profile-matches').innerHTML = mh.length === 0
                    ? '<p class="text-gray-500">Chưa có trận nào</p>'
                    : mh.slice().reverse().map(m => {
                        const cls = m.result === 'win' ? 'text-emerald-400' : m.result === 'loss' ? 'text-red-400' : 'text-gray-400';
                        return '<div class="flex items-center justify-between py-1.5 px-2 bg-valBg/50 rounded-lg border-l-2 ' +
                            (m.result === 'win' ? 'border-emerald-400' : m.result === 'loss' ? 'border-red-400' : 'border-gray-600') + '">' +
                            '<span class="text-white">' + m.team1Name + ' vs ' + m.team2Name + '</span>' +
                            '<span class="font-mono font-bold ' + cls + '">' + (m.status === 'completed' ? m.score1 + '-' + m.score2 : '—') + '</span></div>';
                    }).join('');

            } catch(e) {
                document.getElementById('profile-name').textContent = 'Lỗi';
                document.getElementById('profile-content').innerHTML = '<p class="text-red-400">' + e.message + '</p>';
            }
        }

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
        function confirmAdminLogin() {
            _adminModalAllowed = true;
            if (confirm('Bạn có chắc muốn mở Quyền Điều Hành?')) openAdminLoginModal();
        }
        function openAdminLoginModal() {
            if (!_adminModalAllowed) { console.warn('Admin modal blocked (not user-initiated)'); return; }
            _adminModalAllowed = false;
            console.trace('openAdminLoginModal called');
            document.getElementById('admin-password-input').value = "";
            document.getElementById('admin-login-modal').classList.remove('hidden'); 
            setTimeout(() => document.getElementById('admin-password-input')?.focus(), 100);
        }
        
        function closeAdminLoginModal() { 
            document.getElementById('admin-login-modal').classList.add('hidden'); 
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const p = document.getElementById('admin-password-input');
                if (p && !document.getElementById('admin-login-modal').classList.contains('hidden') && document.activeElement === p) {
                    checkAdminPassword();
                }
            }
        });
        
        async function checkAdminPassword() {
            const pin = document.getElementById('admin-password-input').value;
            try {
                await apiLogin('evan', pin);
                document.getElementById('btn-admin-tab').classList.remove('hidden');
                document.getElementById('schedule-finals-admin')?.classList.remove('hidden');
                document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập`;
                closeAdminLoginModal();
                switchTab('admin-tab');
                await syncLocalToAPI();
                await loadPlayers();
                renderAdmin();
                showToast("Đăng nhập quyền Admin thành công!", "success");
            } catch(e) {
                showToast("Sai mật khẩu!", "error");
            }
        }

        function logoutAdmin() {
            apiLogout();
            document.getElementById('btn-admin-tab').classList.add('hidden');
            document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-shield-halved"></i> Kích Hoạt Quyền Admin`;
            switchTab('guide-tab');
            showToast("Đã đăng xuất quyền điều phối giải đấu!", "success");
        }

        let currentAdminSubTab = 'players';
        function switchAdminSubTab(tab) {
            document.querySelectorAll('[id^="admin-sub-"]').forEach(el => {
                if (el.id.startsWith('admin-sub-') && !el.id.startsWith('admin-sub-btn')) {
                    el.classList.add('hidden');
                }
            });
            document.getElementById('admin-sub-' + tab).classList.remove('hidden');
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
            if (tab === 'teams') renderAdmin();
            if (tab === 'veto') { if (vetoMatchId) loadVeto(vetoMatchId); }
            if (tab === 'config') loadWebhookUrl();
            if (tab === 'reports') loadScoreReports();
            if (tab === 'discipline') { loadPenalties(); loadAuditLog(); loadDisputes(); }
            if (tab === 'data') { loadAdminStats(); loadFreeAgents(); }
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
        let currentVetoPhase = 0;
        let vetoMapsState = {};
        let vetoMatchId = null;

        function vetoLabel(m) { return m.charAt(0).toUpperCase() + m.slice(1); }

        async function loadVeto(matchId) {
            vetoMatchId = matchId;
            try {
                const data = await api('/api/veto/' + matchId);
                currentVetoPhase = data.phase || 0;
                vetoMapsState = data.maps || {};
                MAP_LIST.forEach(m => { if (!(m in vetoMapsState)) vetoMapsState[m] = 'active'; });
            } catch(e) {
                currentVetoPhase = 0;
                vetoMapsState = {};
                MAP_LIST.forEach(m => vetoMapsState[m] = 'active');
            }
            renderVetoUI();
        }

        function openVetoForMatch(matchId, team1, team2) {
            switchTab('veto-tab');
            const sel = document.getElementById('veto-match-select');
            if (sel) {
                sel.dataset.selected = matchId;
                loadVetoMatches().then(() => {
                    sel.value = matchId;
                    onSelectVetoMatch();
                });
            }
        }

        function renderVetoUI() {
            MAP_LIST.forEach(m => {
                const el = document.getElementById('map-' + m);
                if (!el) return;
                const state = vetoMapsState[m] || 'active';
                el.className = "map-card bg-valBg border rounded-xl overflow-hidden relative group " +
                    (state === 'active' ? 'cursor-pointer border-gray-800 hover:border-valCyan/50' :
                     state === 'ban' ? 'map-banned' :
                     state === 'pick1' ? 'map-picked-cyan' :
                     state === 'pick2' ? 'map-picked-red' :
                     'map-decider');
                const overlay = el.querySelector('.action-overlay');
                if (state === 'ban') overlay.innerHTML = '<i class="fa-solid fa-xmark text-4xl text-valRed mb-1"></i><span class="text-[9px] bg-valRed text-white px-2 rounded font-black">CẤM</span>';
                else if (state === 'pick1') overlay.innerHTML = '<i class="fa-solid fa-check text-4xl text-white mb-1 drop-shadow-lg"></i><span class="text-[9px] bg-white text-black px-2 rounded font-black">CYAN CHỌN</span>';
                else if (state === 'pick2') overlay.innerHTML = '<i class="fa-solid fa-check text-4xl text-white mb-1 drop-shadow-lg"></i><span class="text-[9px] bg-white text-black px-2 rounded font-black">RED CHỌN</span>';
                else if (state === 'decider') overlay.innerHTML = '<i class="fa-solid fa-star text-4xl text-yellow-400 mb-1 drop-shadow-lg"></i><span class="text-[9px] bg-yellow-400 text-black px-2 rounded font-black">VÁN 3</span>';
                else overlay.innerHTML = '';
            });
            const st = document.getElementById('veto-status-text');
            if (currentVetoPhase >= VETO_PHASES.length) {
                st.innerHTML = 'HOÀN TẤT! Chúc 2 đội thi đấu tốt.';
                document.getElementById('veto-reset-btn').classList.remove('hidden');
                return;
            }
            document.getElementById('veto-reset-btn').classList.add('hidden');
            const phase = VETO_PHASES[currentVetoPhase];
            const color = phase.team === 1 ? 'text-valCyan' : phase.team === 2 ? 'text-valRed' : 'text-yellow-400';
            const bg = phase.team === 1 ? 'bg-valCyan/20' : phase.team === 2 ? 'bg-valRed/20' : 'bg-yellow-400/20';
            const teamName = phase.team === 1 ? 'Team Cyan' : phase.team === 2 ? 'Team Red' : '';
            const actionLabel = phase.action === 'ban' ? 'CẤM' : phase.action === 'pick' ? 'CHỌN' : 'DECIDER';
            st.innerHTML = `Lượt <span class="text-valRed font-bold">${currentVetoPhase+1}/${VETO_PHASES.length}</span>: ${teamName} <span class="${bg} ${color} px-2 rounded font-bold">${actionLabel}</span> — <span class="text-gray-400">${phase.label}</span>`;
        }

        function vetoMap(mapName) {
            if (currentVetoPhase >= VETO_PHASES.length || (vetoMapsState[mapName] || 'active') !== 'active') return;
            const phase = VETO_PHASES[currentVetoPhase];
            const state = phase.action === 'ban' ? 'ban' : phase.action === 'pick' ? (phase.team === 1 ? 'pick1' : 'pick2') : 'decider';
            vetoMapsState[mapName] = state;
            currentVetoPhase++;
            renderVetoUI();
            if (vetoMatchId) {
                api('/api/veto/' + vetoMatchId + '/action', { method: 'POST', body: { mapName } }).catch(() => {});
            }
        }

        function resetMapVeto() {
            currentVetoPhase = 0;
            MAP_LIST.forEach(m => vetoMapsState[m] = 'active');
            renderVetoUI();
            if (vetoMatchId && apiToken) {
                api('/api/veto/' + vetoMatchId + '/reset', { method: 'POST' }).catch(() => {});
            }
            showToast('Đã làm mới VETO', 'success');
        }

        // === New Public VETO Tab ===
        async function loadVetoMatches() {
            const sel = document.getElementById('veto-match-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Đang tải trận đấu... --</option>';
            try {
                const matches = await api('/api/matches');
                const upcoming = matches.filter(m => m.status !== 'completed' && m.team1Name && m.team2Name);
                sel.innerHTML = '<option value="">-- Chọn trận --</option>';
                let selectedVal = sel.dataset.selected || '';
                upcoming.forEach(m => {
                    const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD';
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.team1Name + ' vs ' + m.team2Name + ' (' + time + ')';
                    sel.appendChild(opt);
                });
                if (selectedVal) sel.value = selectedVal;
            } catch(e) {
                sel.innerHTML = '<option value="">Lỗi tải danh sách</option>';
            }
        }

        async function onSelectVetoMatch() {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            const board = document.getElementById('veto-board');
            const startBtn = document.getElementById('veto-start-btn');
            if (!matchId) { board.classList.add('hidden'); return; }
            board.classList.remove('hidden');
            sel.dataset.selected = matchId;

            // Join socket room
            if (socket) socket.emit('veto:join', matchId);

            // Load current veto state
            try {
                const veto = await api('/api/veto/' + matchId);
                window.currentVetoData = veto;
                if (veto.active || veto.phase > 0) {
                    startBtn.classList.add('hidden');
                    renderVetoBoard(veto);
                } else {
                    startBtn.classList.remove('hidden');
                    renderVetoBoard({ phase: 0, maps: Object.fromEntries(MAP_LIST.map(m => [m, 'active'])), matchId, team1Name: '', team2Name: '', active: false });
                }
                // Update team labels
                const match = await api('/api/matches');
                const m = match.find(x => x.id === matchId);
                if (m) {
                    document.querySelector('#veto-team-labels .team1-label').textContent = '🔵 ' + m.team1Name;
                    document.querySelector('#veto-team-labels .team2-label').textContent = '🔴 ' + m.team2Name;
                    window._vetoTeam1Name = m.team1Name;
                    window._vetoTeam2Name = m.team2Name;
                }
            } catch(e) {
                startBtn.classList.add('hidden');
                renderVetoBoard({ phase: 0, maps: Object.fromEntries(MAP_LIST.map(m => [m, 'active'])), matchId, team1Name: '', team2Name: '', active: false });
            }
        }

        async function startVeto() {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            if (!matchId) return;
            try {
                const veto = await api('/api/veto/' + matchId + '/init', { method: 'POST' });
                window.currentVetoData = veto;
                document.getElementById('veto-start-btn').classList.add('hidden');
                renderVetoBoard(veto);
                showToast('VETO bắt đầu!', 'success');
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        function renderVetoBoard(veto) {
            const grid = document.getElementById('map-veto-grid');
            if (!grid) return;
            const phase = veto.phase || 0;
            const phases = VETO_PHASES || [
                { team: 1, action: 'ban', label: 'Cấm map' },
                { team: 2, action: 'ban', label: 'Cấm map' },
                { team: 1, action: 'pick', label: 'Chọn map (Ván 1)' },
                { team: 2, action: 'pick', label: 'Chọn map (Ván 2)' },
                { team: 1, action: 'ban', label: 'Cấm map' },
                { team: 2, action: 'ban', label: 'Cấm map' },
                { team: 0, action: 'decider', label: 'Ván 3 (Decider)' }
            ];
            const isComplete = phase >= phases.length;

            // Status text
            const st = document.getElementById('veto-status-text');
            if (isComplete) {
                st.innerHTML = '✅ <span class="text-emerald-400">VETO HOÀN TẤT!</span> Các map đã được chọn. Chúc 2 đội thi đấu tốt!';
            } else {
                const p = phases[phase];
                const teamName = p.team === 1 ? (window._vetoTeam1Name || 'Team 1') : p.team === 2 ? (window._vetoTeam2Name || 'Team 2') : '';
                const color = p.team === 1 ? 'text-blue-400' : p.team === 2 ? 'text-red-400' : 'text-yellow-400';
                const bg = p.team === 1 ? 'bg-blue-500/20' : p.team === 2 ? 'bg-red-500/20' : 'bg-yellow-400/20';
                const actionLabel = p.action === 'ban' ? 'CẤM' : p.action === 'pick' ? 'CHỌN' : 'DECIDER';
                st.innerHTML = `Lượt <span class="text-purple-400 font-bold">${phase+1}/${phases.length}</span>: ${teamName} <span class="${bg} ${color} px-2 py-0.5 rounded font-bold">${actionLabel}</span> — <span class="text-gray-400">${p.label}</span>`;
            }

            // Map cards
            grid.innerHTML = MAP_LIST.map(m => {
                const state = (veto.maps && veto.maps[m]) || 'active';
                let cls = 'map-card bg-valBg border rounded-xl overflow-hidden relative group ';
                let overlay = '';
                if (state === 'ban') { cls += 'map-banned'; overlay = '<div class="banned-slash"><i class="fa-solid fa-xmark"></i></div><div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"><span class="text-[9px] bg-red-500/80 text-white px-2 py-0.5 rounded font-black">CẤM</span></div>'; }
                else if (state === 'pick1') { cls += 'map-picked-cyan'; overlay = '<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"><i class="fa-solid fa-check text-4xl text-white mb-1"></i><span class="text-[9px] bg-blue-500/80 text-white px-2 py-0.5 rounded font-black">CHỌN V1</span></div>'; }
                else if (state === 'pick2') { cls += 'map-picked-red'; overlay = '<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"><i class="fa-solid fa-check text-4xl text-white mb-1"></i><span class="text-[9px] bg-red-500/80 text-white px-2 py-0.5 rounded font-black">CHỌN V2</span></div>'; }
                else if (state === 'decider') { cls += 'map-decider'; overlay = '<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"><i class="fa-solid fa-star text-4xl text-yellow-400 mb-1"></i><span class="text-[9px] bg-yellow-400/80 text-black px-2 py-0.5 rounded font-black">VÁN 3</span></div>'; }
                else { cls += 'cursor-pointer border-gray-800 hover:border-purple-400/50'; }

                const gradients = {
                    summit: 'linear-gradient(135deg, #1a0a2e 0%, #e91e63 100%)',
                    breeze: 'linear-gradient(135deg, #0d7377 0%, #32e0c4 100%)',
                    ascent: 'linear-gradient(135deg, #3e5151 0%, #decba4 100%)',
                    haven: 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)',
                    split: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
                    sunset: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
                    icebox: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)',
                    lotus: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                };
                const grad = gradients[m] || 'linear-gradient(135deg, #333, #666)';
                const canClick = state === 'active' && !isComplete;
                return `<div id="map-${m}" ${canClick ? `onclick="vetoAction('${m}')"` : ''} class="${cls}">
                    <div class="aspect-[3/4] w-full relative" style="background: ${grad};">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
                        ${overlay}
                        <div class="absolute bottom-2 left-0 right-0 text-center z-10 pointer-events-none">
                            <h4 class="font-display font-black text-xs text-white tracking-wider uppercase">${m}</h4>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        async function vetoAction(mapName) {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            if (!matchId) return;
            try {
                const veto = await api('/api/veto/' + matchId + '/action', { method: 'POST', body: { mapName } });
                window.currentVetoData = veto;
                renderVetoBoard(veto);
                if (!veto.active && veto.phase >= (VETO_PHASES || []).length) {
                    showToast('VETO hoàn tất! Map đã được lưu.', 'success');
                }
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        function openDiscordIdGuide() {
            document.getElementById('discord-guide-modal').classList.remove('hidden');
        }
        function updateFormPoints() {
            const pts = rankPointsMap[document.getElementById('reg-rank').value] || 0;
            document.getElementById('form-points-badge').innerText = pts;
            const bar = document.getElementById('energy-bar-fill');
            if (bar) {
                const pct = Math.min(100, (pts / 21) * 100);
                bar.style.width = pct + '%';
                bar.style.background = pct > 80 ? '#ff4655' : pct > 50 ? '#eab308' : '#22c55e';
            }
        }

        function toggleTeamNameInput() {
            const val = document.getElementById('reg-team-option').value;
            const field = document.getElementById('reg-team-name-field');
            const input = document.getElementById('reg-team-name');
            if (val === 'create') {
                field.classList.remove('hidden');
                input.required = true;
            } else {
                field.classList.add('hidden');
                input.required = false;
                input.value = '';
            }
        }

        async function autoFillRegisterForm() {
            const status = document.getElementById('register-discord-status');
            const discordInput = document.getElementById('reg-discord');
            const discordIdInput = document.getElementById('reg-discord-id');
            const submitBtn = document.getElementById('reg-submit-btn');

            status.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class=\"fa-solid fa-paper-plane mr-2\"></i>Gửi Đơn';

            if (!discordUser) {
                discordInput.value = '';
                discordIdInput.value = '';
                status.className = 'mb-4 p-4 rounded-xl border text-sm bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
                status.innerHTML = '<div class="flex items-center gap-3"><i class="fa-solid fa-shield-halved text-xl"></i><div><strong class="block">Cần đăng nhập Discord</strong><span class="text-xs text-yellow-400/80">Bấm nút <b class="text-white">Đăng Nhập</b> góc phải trên cùng.</span></div></div>';
                status.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-brands fa-discord mr-2"></i>Đăng Nhập Discord Trước';
                submitBtn.onclick = function(e) { e.preventDefault(); loginDiscord(); };
                return;
            }
            submitBtn.onclick = null;

            discordInput.value = discordUser.discordUsername;
            discordIdInput.value = discordUser.discordId;

            const ava = document.getElementById('reg-discord-avatar');
            if (ava && discordUser.discordAvatar) {
                ava.src = 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png?size=64';
            }

            try {
                const existing = await api('/api/players/lookup/' + discordUser.discordId);
                status.className = 'mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                status.innerHTML = '<i class=\"fa-solid fa-circle-check\"></i> Bạn đã đăng ký với tên <strong>' + existing.displayName + '</strong> (Rank: ' + existing.rank + ') <button onclick="switchTab(\'profile-tab\')" class="ml-2 text-[10px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-2 py-0.5 rounded-lg font-bold hover:bg-valCyan/30 transition">Xem Hồ Sơ</button>';
                status.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class=\"fa-solid fa-check mr-2\"></i>Đã Đăng Ký';
            } catch (e) {
                const is404 = e.message.includes('not found') || e.message.includes('chưa đăng ký');
                status.className = 'mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ' + (is404 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-valCyan/10 border-valCyan/30 text-valCyan');
                status.innerHTML = is404
                    ? '<i class=\"fa-solid fa-pencil\"></i> Bạn chưa đăng ký — điền form bên dưới để tham gia giải!'
                    : '<i class=\"fa-solid fa-info-circle\"></i> Thông tin Discord đã được tự động điền';
                status.classList.remove('hidden');
            }
        }

        async function lookupRiotIdForRegister() {
            const riotId = document.getElementById('reg-riotid').value.trim();
            const resultEl = document.getElementById('reg-riot-lookup-result');
            if (!riotId) { resultEl.classList.add('hidden'); return; }
            resultEl.className = 'mt-1 text-[10px] p-2 bg-valBg/50 border border-gray-800 rounded-lg';
            resultEl.innerHTML = '<span class="text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Đang tra cứu...</span>';
            resultEl.classList.remove('hidden');
            try {
                const data = await api('/api/valorant/lookup', { method: 'POST', body: { riotId, region: 'ap' } });
                lastRiotLookup = data;
                const rankSelect = document.getElementById('reg-rank');
                for (let opt of rankSelect.options) {
                    if (opt.value === data.rank) { rankSelect.value = data.rank; break; }
                }
                rankSelect.disabled = true;
                rankSelect.classList.add('opacity-60', 'cursor-not-allowed');
                updateFormPoints();
                resultEl.innerHTML = `<span class="text-emerald-400"><i class="fa-solid fa-lock mr-1"></i>${data.rank} · ${data.elo} elo · ${data.pts}đ <span class="text-gray-500">(Peak: ${data.peakRank || data.rank})</span></span>`;
            } catch(e) {
                resultEl.innerHTML = `<span class="text-valRed"><i class="fa-solid fa-circle-exclamation mr-1"></i>${e.message}</span>`;
            }
        }
        document.addEventListener('DOMContentLoaded', function() {
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
        async function handleRegistration(e) {
            e.preventDefault();
            if (!discordUser) { showToast('Vui lòng đăng nhập Discord trước!', 'error'); return; }
            const teamOption = document.getElementById('reg-team-option').value;
            const teamName = document.getElementById('reg-team-name').value.trim();
            if (teamOption === 'create' && !teamName) { showToast('Vui lòng nhập tên đội!', 'error'); return; }
            const playerPts = parseInt(document.getElementById('form-points-badge').innerText) || 3;
            const body = {
                displayName: discordUser.discordUsername,
                discordId: discordUser.discordId,
                riotId: document.getElementById('reg-riotid').value.trim(),
                rank: document.getElementById('reg-rank').value,
                role: document.getElementById('reg-role').value,
                type: 'Solo',
                pts: playerPts,
                peakRank: lastRiotLookup?.peakRank || null
            };
            try {
                const player = await api('/api/players', { method: 'POST', body });
                if (teamOption === 'create' && teamName) {
                    await api('/api/teams/create-from-registration', { method: 'POST', body: {
                        name: teamName,
                        discordId: discordUser.discordId,
                        displayName: discordUser.discordUsername,
                        pts: playerPts,
                        type: 'duo'
                    }});
                }
                showToast('Đăng ký thành công!', 'success');
                document.getElementById('registration-form').reset();
                document.getElementById('form-points-badge').innerText = '3';
                document.getElementById('reg-team-name-field').classList.add('hidden');
                autoFillRegisterForm();
                loadTeamsBrowser();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function parseQuickImport() {
            const t = document.getElementById('quick-import-area').value;
            if(!t) return showToast("Dán mã vào trước!", "error");
            const get = (rx) => {
                const match = t.match(rx);
                return match ? match[1].trim() : "N/A";
            };
            
            let pts = 3;
            const ptsMatch = t.match(/Điểm:\s*(\d+)đ?/i);
            if (ptsMatch) pts = parseInt(ptsMatch[1]);

            const discord = get(/Discord:\s*(.+)/i);
            const rank = get(/Rank:\s*(.+)/i);
            const role = get(/Role:\s*(.+)/i);
            const name = discord === "N/A" ? (get(/Tên Discord:\s*(.+)/i) || "Tuyển Thủ") : discord;

            // Save to backend API if authenticated
            if (apiToken) {
                try {
                    const body = {
                        displayName: name,
                        discordId: get(/Discord:\s*(.+)/i),
                        riotId: get(/Riot:\s*(.+)/i) || 'Unknown#000',
                        rank: rank,
                        role: role,
                        type: 'Solo',
                        pts: isNaN(pts) ? 3 : pts
                    };
                    await api('/api/players', { method: 'POST', body });
                    await loadPlayers();
                    renderAdmin();
                    document.getElementById('quick-import-area').value = '';
                    showToast("Đã thêm " + name + " vào database!", "success");
                    return;
                } catch(e) {
                    // Fallback to localStorage
                }
            }

            const p = { 
                id: Date.now() + Math.random(), 
                discord: name, 
                rank: rank, 
                role: role, 
                pts: isNaN(pts) ? 3 : pts 
            };
            
            players.push(p); 
            document.getElementById('quick-import-area').value = '';
            
            saveTournamentData();
            renderAdmin(); 
            showToast("Đã thêm " + name, "success");
        }

        async function removePlayer(id) {
            players = players.filter(p => p.id !== id);
            team1 = team1.filter(p => p.id !== id);
            team2 = team2.filter(p => p.id !== id);
            saveTournamentData();
            // Also delete from backend if authenticated
            if (apiToken && typeof id === 'string' && id.length > 10) {
                try { await api('/api/players/' + id, { method: 'DELETE' }); await loadPlayers(); } catch(e) {}
            }
            renderAdmin();
        }

        function renderAdmin() {
            const listContainer = document.getElementById('player-list-container');
            if (!listContainer) return;
            const list = apiToken && apiPlayerCache.length > 0 ? apiPlayerCache : players;
            const search = (document.getElementById('admin-player-search')?.value || '').toLowerCase();
            const filtered = search ? list.filter(p => {
                const name = (p.displayName || p.discord || '').toLowerCase();
                const riotId = (p.riotId || '').toLowerCase();
                const rank = (p.rank || '').toLowerCase();
                const role = (p.role || '').toLowerCase();
                const type = (p.type || '').toLowerCase();
                const teamName = (p.teamId || '').toLowerCase();
                const discordId = (p.discordId || '').toLowerCase();
                return name.includes(search) || riotId.includes(search) || rank.includes(search) || role.includes(search) || type.includes(search) || teamName.includes(search) || discordId.includes(search);
            }) : list;
            const plCount = document.getElementById('player-list-count');
            if (plCount) plCount.innerText = filtered.length;
            const plBadge = document.getElementById('player-count-badge');
            if (plBadge) plBadge.innerText = list.length;
            const adminPlBadge = document.getElementById('admin-player-count-badge');
            if (adminPlBadge) adminPlBadge.innerText = list.length;
            listContainer.innerHTML='';
            
            filtered.forEach((p, idx) => {
                let drafted = team1.some(t=>t.id===p.id) || team2.some(t=>t.id===p.id);
                const name = p.displayName || p.discord || 'Unknown';
                const rank = p.rank || 'N/A';
                const role = p.role || 'N/A';
                const type = p.type || 'Solo';
                const riotId = p.riotId || 'N/A';
                const teamName = p.teamId || '';
                const avatarUrl = p.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=32' : '';
                const rankEmoji = {'Iron (Sắt)':'🥉','Bronze (Đồng)':'🥉','Silver (Bạc)':'🥈','Gold (Vàng)':'🥇','Platinum (Bạch Kim)':'💎','Diamond (Kim Cương)':'💎','Ascendant (Thượng Nhân)':'🔮','Immortal (Bất Tử)':'👑'}[rank] || '';
                listContainer.innerHTML += `<div class="bg-valBg/80 rounded-lg border border-gray-800 ${drafted?'opacity-50':''}" data-player-discord="${p.discordId}" data-player-name="${name}" data-player-riot="${p.riotId}">
                    <div class="flex justify-between items-center p-2.5 cursor-pointer" onclick="document.getElementById('player-detail-${idx}').classList.toggle('hidden')">
                        <div class="flex items-center gap-2">
                            ${avatarUrl ? `<img src="${avatarUrl}" class="w-6 h-6 rounded-full border border-gray-700 cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="event.stopPropagation();openProfile('${p.discordId}')" title="Xem hồ sơ">` : `<div class="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-600 cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="event.stopPropagation();openProfile('${p.discordId}')" title="Xem hồ sơ"><i class="fa-solid fa-user"></i></div>`}
                            <span class="bg-gray-800 text-[10px] px-1.5 rounded text-gray-300 font-bold" data-copy="${p.pts}đ">${p.pts}đ</span>
                            <span class="text-xs font-bold text-white cursor-pointer hover:text-valCyan transition" onclick="event.stopPropagation();openProfile('${p.discordId}')" title="Xem hồ sơ">${name}</span>
                            <span class="text-[10px] text-gray-500 hidden sm:inline">${rankEmoji} ${rank.split(' ')[0]}</span>
                            <span class="text-[10px] text-valCyan hidden md:inline font-mono">${role.substring(0,3)}</span>
                            <span class="text-[10px] text-gray-500 hidden md:inline">W${p.wins||0}/L${p.losses||0}</span>
                            ${teamName ? `<span class="text-[9px] bg-valCyan/10 text-valCyan border border-valCyan/20 px-1.5 rounded-full">${teamName}</span>` : ''}
                        </div>
                        ${!drafted ? `<div class="flex gap-1 shrink-0">
                            <span class="text-[10px] text-gray-600 hidden lg:inline font-mono">${p.elo||1200}elo</span>
                            <button onclick="event.stopPropagation();team1.push(players.find(x=>x.id===${p.id}));saveTournamentData();renderAdmin();" class="bg-valCyan/20 text-valCyan px-2 py-0.5 rounded text-[10px] hover:bg-valCyan/30" title="Xếp vào Team 1">T1</button>
                            <button onclick="event.stopPropagation();team2.push(players.find(x=>x.id===${p.id}));saveTournamentData();renderAdmin();" class="bg-valRed/20 text-valRed px-2 py-0.5 rounded text-[10px] hover:bg-valRed/30" title="Xếp vào Team 2">T2</button>
                            <button onclick="event.stopPropagation();removePlayer(${p.id})" class="text-gray-500 hover:text-valRed px-1" title="Xóa người chơi"><i class="fa-solid fa-trash"></i></button>
                            <button onclick="event.stopPropagation();document.getElementById('player-detail-${idx}').classList.toggle('hidden')" class="text-gray-500 hover:text-valCyan px-1" title="Chi tiết"><i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                        </div>` : `<span class="text-[9px] text-gray-500 flex items-center gap-1"><i class="fa-solid fa-check text-emerald-500"></i> Đã xếp <button onclick="removePlayer(${p.id})" class="text-gray-500 hover:text-valRed ml-1"><i class="fa-solid fa-trash"></i></button></span>`}
                    </div>
                    <div id="player-detail-${idx}" class="hidden px-2.5 pb-2.5 border-t border-gray-800/50 pt-2 space-y-1 text-[10px] text-gray-400">
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            <span class="flex items-center gap-1"><span class="text-gray-500">Discord:</span> <span class="text-white cursor-pointer hover:text-valCyan" title="Double-click để copy" data-copy="${p.discordId || ''}">${p.discordId || 'N/A'}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Riot:</span> <span class="text-white cursor-pointer hover:text-valCyan" title="Double-click để copy" data-copy="${riotId}">${riotId}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Rank:</span> <span class="text-yellow-400">${rank}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Role:</span> <span class="text-valCyan">${role}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Loại:</span> <span class="text-white">${type}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Elo:</span> <span class="text-white">${p.elo || 1200}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">W/L:</span> <span class="text-emerald-400">${p.wins||0}</span><span class="text-gray-500">/</span><span class="text-valRed">${p.losses||0}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">MVP:</span> <span class="text-yellow-400">${p.mvps||0}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Team:</span> <span class="text-valCyan">${teamName || 'Tự do'}</span></span>
                        </div>
                    </div>
                </div>`;
            });

            const drawTeam = (arr, id, ptsId, stId, num) => {
                let pts = 0; document.getElementById(id).innerHTML = '';
                for(let i=0; i<5; i++) {
                    if(arr[i]) {
                        pts += arr[i].pts;
                        const name = arr[i].displayName || arr[i].discord || 'Unknown';
                        document.getElementById(id).innerHTML += `<div class="flex justify-between items-center bg-valCard border border-gray-700 p-2 rounded-lg text-xs"><span class="text-white">${name} (${arr[i].pts}đ)</span><button onclick="team${num}=team${num}.filter(x=>x.id!==${arr[i].id});saveTournamentData();renderAdmin();" class="text-gray-500 hover:text-valRed"><i class="fa-solid fa-xmark"></i></button></div>`;
                    } else document.getElementById(id).innerHTML += `<div class="bg-valBg border border-dashed border-gray-800 p-2 rounded-lg text-xs text-gray-600 italic">Slot Trống</div>`;
                }
                document.getElementById(ptsId).innerText = pts+'đ';
                const st = document.getElementById(stId);
                if(pts>21) { st.innerText = 'VƯỢT TRẦN'; st.className = 'text-[9px] bg-valRed/20 text-valRed px-2 rounded font-bold animate-pulse'; }
                else { st.innerText = 'Hợp Lệ'; st.className = 'text-[9px] bg-emerald-500/20 text-emerald-400 px-2 rounded font-bold'; }
            };
            drawTeam(team1, 'team1-slots', 'team1-total-points', 'team1-status', 1);
            drawTeam(team2, 'team2-slots', 'team2-total-points', 'team2-status', 2);
        }

        // Thuật toán bóc tách và tự động chia 2 đội hình có độ cân bằng rank cao nhất
        function autoDraftBalancedTeams() {
            team1=[]; team2=[]; let av=[...players].sort((a,b)=>b.pts-a.pts);
            let p1=0, p2=0;
            for(let p of av) {
                if(team1.length<5 && team2.length<5) {
                    if(p1<=p2 && p1+p.pts<=21) { team1.push(p); p1+=p.pts; }
                    else if(p2+p.pts<=21) { team2.push(p); p2+=p.pts; }
                    else { team1.push(p); p1+=p.pts; }
                } else if(team1.length<5) { team1.push(p); p1+=p.pts; }
                else if(team2.length<5) { team2.push(p); p2+=p.pts; }
            }
            saveTournamentData();
            syncTeamsToAPI();
            renderAdmin(); 
            showToast("Đã draft xong!", "success");
        }

        async function syncTeamsToAPI() {
            if (!apiToken) return;
            const teamName1 = document.getElementById('team1-name-input')?.value || 'Team Cyan';
            const teamName2 = document.getElementById('team2-name-input')?.value || 'Team Red';
            for (const p of team1) {
                try { await api('/api/players/' + p.id, { method: 'PATCH', body: { teamId: teamName1 } }); } catch(e) {}
            }
            for (const p of team2) {
                try { await api('/api/players/' + p.id, { method: 'PATCH', body: { teamId: teamName2 } }); } catch(e) {}
            }
        }

        function exportTeamsToClipboard() {
            let txt = `🏆 KẾT QUẢ CHIA ĐỘI EVAN CUP\n\n🔵 TEAM CYAN (${team1.reduce((s,p)=>s+p.pts,0)}đ):\n`;
            team1.forEach(p => txt += `- ${p.discord} (${p.pts}đ)\n`);
            txt += `\n🔴 TEAM RED (${team2.reduce((s,p)=>s+p.pts,0)}đ):\n`;
            team2.forEach(p => txt += `- ${p.discord} (${p.pts}đ)\n`);
            
            const el = document.createElement('textarea');
            el.value = txt;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            showToast("Đã sao chép đội hình vào bộ nhớ!", "success");
        }

        // Hướng dẫn cấu hình Ticket Tool tiếng Việt
        const guides = {
            'category': '👉 <b>Danh mục:</b> Kéo Category Created/Opened về "🏆 GIẢI ĐẤU 5v5" để gom ticket gọn gàng.',
            'limits': '👉 <b>Giới Hạn:</b> Set Max Open Tickets = 1 để chống spam form.',
            'panel-msg': '👉 <b>Edit Panel:</b> Sửa tiêu đề nút ngoài kênh chat thành "ĐĂNG KÝ EVAN CUP".',
            'ticket-msg': '👉 <b>Edit Ticket:</b> Sửa lời chào trong form yêu cầu nộp Riot ID.'
        };
        function showGuideDetail(k) { document.getElementById('guide-display-text').innerHTML = guides[k]; }

        function getStreamEmbed(url) {
            if (!url) return '';
            let match;
            if ((match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)) || (match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/))) {
                return `<iframe class="w-full aspect-video rounded-lg mt-2" src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe>`;
            }
            if ((match = url.match(/twitch\.tv\/(\w+)/))) {
                return `<iframe class="w-full aspect-video rounded-lg mt-2" src="https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}" allowfullscreen></iframe>`;
            }
            return `<a href="${url}" target="_blank" class="text-[10px] text-valCyan hover:underline"><i class="fa-solid fa-video"></i> Xem Stream</a>`;
        }

        // === Schedule Tab ===
        function switchScheduleSubTab(type) {
            const matchesSection = document.getElementById('schedule-matches-section');
            const playoffSection = document.getElementById('schedule-playoff-section');
            const btnMatches = document.getElementById('sched-sub-btn-matches');
            const btnPlayoff = document.getElementById('sched-sub-btn-playoff');
            if (type === 'playoff') {
                matchesSection?.classList.add('hidden');
                playoffSection?.classList.remove('hidden');
                btnMatches?.classList.remove('bg-valCyan/20', 'text-valCyan');
                btnMatches?.classList.add('text-gray-400');
                btnPlayoff?.classList.add('bg-valCyan/20', 'text-valCyan');
                btnPlayoff?.classList.remove('text-gray-400');
                loadBracket();
            } else {
                playoffSection?.classList.add('hidden');
                matchesSection?.classList.remove('hidden');
                btnPlayoff?.classList.remove('bg-valCyan/20', 'text-valCyan');
                btnPlayoff?.classList.add('text-gray-400');
                btnMatches?.classList.add('bg-valCyan/20', 'text-valCyan');
                btnMatches?.classList.remove('text-gray-400');
            }
        }
        function renderSchedule() {
            const controls = document.getElementById('admin-schedule-controls');
            if (apiToken && controls) {
                controls.innerHTML = `<div class="mb-6 bg-valBg/50 p-4 rounded-xl border border-gray-800">
                    <h4 class="text-sm font-bold text-valCyan mb-3 uppercase">Tạo lịch thi đấu tự động</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Danh sách đội (cách xuống dòng)</label>
                        <textarea id="sched-teams" rows="3" placeholder="Đội A" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></textarea></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Ngày bắt đầu</label>
                        <input type="date" id="sched-date" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Phút/trận</label>
                        <input type="number" id="sched-duration" value="60" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
<div><label class="text-[10px] text-gray-400 uppercase block mb-1">Định dạng</label>
<select id="sched-format" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">
<option value="round-robin">Vòng tròn</option>
<option value="swiss">Swiss</option>
</select></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
                        <button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
                        <i class="fa-solid fa-gear mr-1"></i>Tạo lịch thi đấu</button>
<button onclick="generateSwissRound()" class="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition mt-1">
<i class="fa-solid fa-shuffle mr-1"></i>Vòng Swiss</button></div>
                    </div>
                </div>`;
            }
            loadSchedule();
        }

        function toggleScheduleFullscreen() {
            const c = document.getElementById('schedule-container');
            const expand = document.getElementById('btn-schedule-expand');
            const collapse = document.getElementById('btn-schedule-collapse');
            c.classList.toggle('schedule-expanded');
            expand.classList.toggle('hidden');
            collapse.classList.toggle('hidden');
        }

        let countdownTimer = null;
        function updateAllCountdowns() {
            if (countdownTimer) clearInterval(countdownTimer);
            countdownTimer = setInterval(() => {
                document.querySelectorAll('[id^="cd-"]').forEach(el => {
                    const matchId = el.id.replace('cd-', '');
                    const matchEl = el.closest('[data-scheduled]');
                    if (!matchEl) { el.textContent = ''; return; }
                    const t = new Date(matchEl.dataset.scheduled);
                    const diff = t - Date.now();
                    if (diff <= 0) { el.textContent = '🔴 Đang diễn ra'; return; }
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    el.textContent = h > 0 ? h + 'g ' + m + 'p' : m + 'p ' + s + 's';
                });
            }, 1000);
        }
        async function loadSchedule() {
            const container = document.getElementById('schedule-list');
            showLoading('Đang tải lịch đấu...');
            try {
                const matches = await api('/api/matches');
                hideLoading();
                if (matches.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i><p>Chưa có trận đấu nào.</p></div>';
                    return;
                }

                const now = new Date();
                const pending = matches.filter(m => m.status === 'pending');
                const completed = matches.filter(m => m.status === 'completed');

                let html = '';
                const isAdmin = !!apiToken;
                if (pending.length > 0) {
                    html += '<h4 class="text-sm font-bold text-yellow-400 mb-3 uppercase"><i class="fa-solid fa-clock mr-1"></i>Sắp diễn ra</h4>';
                    pending.forEach(m => {
                        const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD';
                        const countdownId = 'cd-' + m.id;
                        const timeId = 'time-panel-' + m.id;
                        const checkinId = 'checkin-panel-' + m.id;
                        html += `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl" data-scheduled="${m.scheduledAt || ''}">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team1Name.replace(/'/g, "\\'")}')">${m.team1Name}</span>
                                    <span class="text-gray-500 text-xs">vs</span>
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team2Name.replace(/'/g, "\\'")}')">${m.team2Name}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-gray-400 font-mono">${time}</span>
                                    <span id="${countdownId}" class="text-[10px] font-mono text-yellow-400/80 min-w-[60px] text-right"></span>
                                    <button onclick="document.getElementById('${checkinId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition">
                                        <i class="fa-solid fa-check"></i> Check-in
                                    </button>
                                    ${isAdmin ? `<button onclick="document.getElementById('${timeId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-clock"></i> Giờ</button>` : ''}
                                    <button onclick="openMatchDetail('${m.id}')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-eye"></i> Chi tiết</button>
                                    <button onclick="openScoreReport('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-400/10 transition"><i class="fa-solid fa-flag"></i> Báo KQ</button>
                                    ${isAdmin ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-400/10 transition"><i class="fa-solid fa-pen"></i> Nhập KQ</button>` : ''}
                                    <button onclick="openVetoForMatch('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-purple-400 border border-purple-400/30 px-2 py-1 rounded-lg hover:bg-purple-400/10 transition"><i class="fa-solid fa-map-location-dot"></i> VETO</button>
                                </div>
                            </div>
                            <div id="${timeId}" class="hidden mt-3 pt-3 border-t border-gray-800">
                                <div class="flex gap-2 items-center">
                                    <input type="datetime-local" id="resched-time-${m.id}" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white">
                                    <button onclick="reschedule('${m.id}')" class="bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-save"></i> Đặt</button>
                                </div>
                            </div>
                            <div id="${checkinId}" class="hidden mt-3 pt-3 border-t border-gray-800">
                                <div class="flex gap-2">
                                    <input type="text" id="checkin-discord-${m.id}" placeholder="Discord ID của bạn" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white" value="${discordUser ? discordUser.discordId : ''}">
                                    <input type="text" id="checkin-name-${m.id}" placeholder="Tên" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white" value="${discordUser ? discordUser.discordUsername : ''}">
                                    <button onclick="toggleCheckin('${m.id}', document.getElementById('checkin-discord-${m.id}').value, document.getElementById('checkin-name-${m.id}').value)" class="bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-1 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
                                        <i class="fa-solid fa-check-double"></i> Xác nhận
                                    </button>
                                </div>
                                <div id="checkin-status-${m.id}" class="mt-2 text-[10px] text-gray-500"></div>
                            </div>
                        </div>`;
                    });
                }

                if (completed.length > 0) {
                    html += '<h4 class="text-sm font-bold text-emerald-400 mb-3 mt-4 uppercase"><i class="fa-solid fa-check-circle mr-1"></i>Đã kết thúc</h4>';
                    completed.forEach(m => {
                        const winner = m.winner === m.team1Name ? 'text-emerald-400' : (m.winner === m.team2Name ? 'text-emerald-400' : '');
                        const mvpStr = m.mvpPlayerName ? `<span class="text-[10px] text-yellow-400"><i class="fa-solid fa-star"></i> MVP: ${m.mvpPlayerName}</span>` : '';
                        const streamStr = m.streamUrl ? getStreamEmbed(m.streamUrl) : '';
                        html += `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team1Name.replace(/'/g, "\\'")}')">${m.team1Name}</span>
                                    <span class="font-black text-lg font-mono ${winner}">${m.score1} - ${m.score2}</span>
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team2Name.replace(/'/g, "\\'")}')">${m.team2Name}</span>
                                    ${mvpStr}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-gray-500">${m.map || ''}</span>
                                    <button onclick="openMatchDetail('${m.id}')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-eye"></i></button>
                                    <button onclick="openDisputeModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-orange-400 border border-orange-400/30 px-2 py-1 rounded-lg hover:bg-orange-400/10 transition"><i class="fa-solid fa-scale-balanced"></i></button>
                                    ${isAdmin ? `<button onclick="openMvpModal('${m.id}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-star"></i> MVP</button>` : ''}
                                    ${isAdmin ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pencil"></i> Sửa</button>` : ''}
                                </div>
                            </div>
                            ${streamStr}
                        </div>`;
                    });
                }

                hideLoading();
                container.innerHTML = html;
                updateAllCountdowns();
            } catch(e) {
                hideLoading();
                container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải lịch đấu</div>';
            }
        }

        async function generateSwissRound() {
  const teamsText = document.getElementById('sched-teams').value.trim();
  const teams = teamsText.split('\n').map(t => t.trim()).filter(t => t);
  if (teams.length < 2) return showToast('Nhập ít nhất 2 đội!', 'error');
  const startDate = document.getElementById('sched-date').value;
  const duration = parseInt(document.getElementById('sched-duration').value) || 60;
  const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';
  try {
    await api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: 'swiss' } });
    showToast('Đã tạo vòng Swiss!', 'success');
    loadSchedule();
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function generateSchedule() {
            const teamsText = document.getElementById('sched-teams').value.trim();
            const teams = teamsText.split('\n').map(t => t.trim()).filter(t => t);
            if (teams.length < 2) return showToast('Nhập ít nhất 2 đội (mỗi dòng 1 tên)!', 'error');

            const startDate = document.getElementById('sched-date').value;
            const duration = parseInt(document.getElementById('sched-duration').value) || 60;
  const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';

            try {
                await api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: fmt } });
                showToast('Đã tạo lịch thi đấu!', 'success');
                loadSchedule();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Leaderboard Tab ===
        async function loadLeaderboard() {
            showLoading('Đang tải bảng xếp hạng...');
            try {
                const players = await api('/api/matches/leaderboard');
                hideLoading();
                const tbody = document.getElementById('leaderboard-body');
                tbody.innerHTML = players.map(p =>
                    `<tr class="${p.rank === 1 ? 'top1-border' : ''} border-b border-gray-800/50 cursor-pointer hover:bg-valBg/50 transition" onclick="openProfile('${p.discordId}')" data-player-discord="${p.discordId}" data-player-name="${p.displayName}">
                        <td class="py-2.5 px-3 text-center font-bold ${p.rank <= 3 ? 'text-yellow-400 text-sm' : 'text-gray-400'}">${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : '#' + p.rank}</td>
                        <td class="py-2.5 px-3 font-bold text-valCyan hover:text-white transition flex items-center gap-2">
                            ${p.discordAvatar ? `<img src="https://cdn.discordapp.com/avatars/${p.discordId}/${p.discordAvatar}.png?size=24" class="w-5 h-5 rounded-full border border-gray-700 inline-block hover:ring-2 hover:ring-valCyan transition" onerror="this.style.display='none'">` : ''}
                            ${p.displayName}
                        </td>
                        <td class="py-2.5 px-3 text-center text-yellow-400 font-bold font-mono">${p.elo}</td>
                        <td class="py-2.5 px-3 text-center text-gray-300 relative group cursor-help">
                            ${p.rankName || '—'}
                            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-gray-900 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-lg border border-gray-700">Elo: ${p.elo} | W/L: ${p.wins}/${p.losses}</span>
                        </td>
                        <td class="py-2.5 px-3 text-center text-emerald-400 font-bold">${p.wins}</td>
                        <td class="py-2.5 px-3 text-center text-red-400">${p.losses}</td>
                        <td class="py-2.5 px-3 text-center text-yellow-400">${p.mvps}</td>
                        <td class="py-2.5 px-3 text-center">${p.teamId ? `<span class="team-link text-[10px] text-valCyan cursor-pointer hover:text-white" title="Click xem chi tiết đội" onclick="event.stopPropagation();openTeamDetail('${p.teamId.replace(/'/g, "\\'")}')">${p.teamId}</span>` : '<span class="text-[10px] text-gray-600">-</span>'}</td>
                    </tr>`
                ).join('');
                document.getElementById('leaderboard-updated').textContent = 'Cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN');
            } catch(e) {
                hideLoading();
                document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gray-500"><i class="fa-solid fa-trophy text-2xl mb-2 block"></i>Chưa có dữ liệu</td></tr>';
            }
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
                            <td class="py-1.5 px-2 font-bold text-white team-link cursor-pointer hover:text-valCyan" onclick="openTeamDetail('${t.name.replace(/'/g, "\\'")}')">${t.name}${i < 2 ? ' ⭐' : ''}</td>
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
        async function loadCaptainDashboard() {
            const section = document.getElementById('captain-dashboard');
            const info = document.getElementById('captain-info');
            if (!discordUser) { section.classList.add('hidden'); return; }
            section.classList.remove('hidden');
            const dashInput = document.getElementById('dashboard-discord-id');
            if (dashInput && !dashInput.value) dashInput.value = discordUser.discordId;
            showLoading('Đang tải thông tin cá nhân...');
            try {
                const player = await api('/api/players/lookup/' + discordUser.discordId);
                hideLoading();
                if (!player) {
                    info.innerHTML = '<p class="text-gray-400">Bạn chưa đăng ký tham gia giải đấu.</p>';
                    return;
                }
                const avaUrl = discordUser.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png?size=64' : '';
                let html = `<div class="flex items-center gap-4 mb-4 pb-3 border-b border-gray-800">
                    ${avaUrl ? `<img src="${avaUrl}" class="w-10 h-10 rounded-full border-2 border-valCyan/50">` : ''}
                    <div>
                        <p class="text-sm font-bold text-white">${discordUser.discordUsername}</p>
                        <p class="text-[10px] text-gray-500">${discordUser.discordId}</p>
                    </div>
                    <button onclick="switchTab('profile-tab')" class="ml-auto text-[10px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-1.5 rounded-lg font-bold hover:bg-valCyan/30 transition flex items-center gap-1">
                        <i class="fa-solid fa-user"></i> Xem Hồ Sơ
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-1">
                            Tên
                            <span class="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-700 text-gray-400 text-[7px] font-bold cursor-help" title="Tên hiển thị trong giải">?</span>
                        </p>
                        <p class="text-sm font-bold text-white">${player.displayName}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-1">
                            Đội
                            <span class="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-700 text-gray-400 text-[7px] font-bold cursor-help" title="Đội bạn đang thi đấu">?</span>
                        </p>
                        <p class="text-sm font-bold text-valCyan">${player.teamId || 'Chưa có'}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-1">
                            Elo
                            <span class="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-700 text-gray-400 text-[7px] font-bold cursor-help" title="Điểm xếp hạng — thay đổi sau mỗi trận">?</span>
                        </p>
                        <p class="text-lg font-black text-yellow-400 font-mono">${player.elo}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-1">
                            W/L
                            <span class="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-700 text-gray-400 text-[7px] font-bold cursor-help" title="Số trận thắng / thua">?</span>
                        </p>
                        <p class="text-lg font-black font-mono"><span class="text-emerald-400">${player.wins}W</span> <span class="text-gray-500">-</span> <span class="text-red-400">${player.losses}L</span></p>
                    </div>
                </div>`;
                if (player.teamId) {
                    try {
                        const matches = await api('/api/matches/team/' + encodeURIComponent(player.teamId));
                        const upcoming = matches.filter(m => m.status !== 'completed' && new Date(m.scheduledAt) > new Date());
                        if (upcoming.length > 0) {
                            html += '<div class="border-t border-gray-800 pt-3 mt-3"><p class="text-[10px] text-gray-400 uppercase mb-2">Trận sắp tới</p>';
                            upcoming.slice(0, 3).forEach(m => {
                                const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD';
                                html += `<div class="text-xs text-gray-300 bg-valBg/40 p-2 rounded-lg mb-1">⚔️ ${m.team1Name} vs ${m.team2Name} — ${time}</div>`;
                            });
                            html += '</div>';
                        }
                    } catch(e) {}
                }
                info.innerHTML = html;
            } catch(e) {
                hideLoading();
                info.innerHTML = '<p class="text-gray-400">Không thể tải thông tin.</p>';
            }
        }
        function populateRankSelect(selId, selected) {
            const ranks = ["Iron (Sắt)","Bronze (Đồng)","Silver (Bạc)","Gold (Vàng)","Platinum (Bạch Kim)","Diamond (Kim Cương)","Ascendant (Thượng Nhân)","Immortal (Bất Tử)"];
            const sel = document.getElementById(selId);
            if (!sel) return;
            sel.innerHTML = ranks.map(r => `<option value="${r}"${r===selected?' selected':''}>${r}</option>`).join('');
        }
        async function loadPlayerProfile() {
            const container = document.getElementById('profile-container');
            const notReg = document.getElementById('profile-not-registered');
            const loaded = document.getElementById('profile-loaded');
            notReg.classList.add('hidden'); loaded.classList.add('hidden');
            if (!discordUser) return;
            showLoading('Đang tải hồ sơ...');
            try {
                const data = await api('/api/players/me');
                hideLoading();
                loaded.classList.remove('hidden');
                const p = data.player;
                if (!p) { hideLoading(); loaded.classList.add('hidden'); notReg.classList.remove('hidden'); showToast('Bạn chưa đăng ký tham gia giải', 'info'); return; }
                // Discord header
                document.getElementById('profile-username').textContent = discordUser.discordUsername;
                document.getElementById('profile-discord-id').textContent = 'Discord: ' + discordUser.discordId;
                if (discordUser.discordAvatar) {
                    document.getElementById('profile-avatar').src = 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png';
                }
                // Player info
                document.getElementById('p-display-name').textContent = p.displayName || '-';
                document.getElementById('p-riot-id').textContent = p.riotId || '-';
                document.getElementById('p-rank').textContent = p.rank || '-';
                document.getElementById('p-role').textContent = p.role || '-';
                document.getElementById('p-type').textContent = p.type || '-';
                const teamEl = document.getElementById('p-team');
                if (p.teamId) { teamEl.innerHTML = `<span class="team-link cursor-pointer hover:text-white" onclick="openTeamDetail('${p.teamId.replace(/'/g, "\\'")}')">${p.teamId}</span>`; }
                else { teamEl.textContent = 'Chưa có đội'; }
                // Stats
                document.getElementById('p-elo').textContent = p.elo;
                document.getElementById('p-wins').textContent = p.wins;
                document.getElementById('p-losses').textContent = p.losses;
                document.getElementById('p-mvps').textContent = p.mvps || 0;
                document.getElementById('p-kda').textContent = (data.kda.kills || 0) + ' / ' + (data.kda.deaths || 0) + ' / ' + (data.kda.assists || 0);
                // Team section
                const teamSection = document.getElementById('profile-team-section');
                if (data.team) {
                    teamSection.classList.remove('hidden');
                    const t = data.team;
                    document.getElementById('p-team-name').textContent = t.name;
                    document.getElementById('p-team-status').textContent = t.status === 'approved' ? '✅ Đã duyệt' : '⏳ Chờ duyệt';
                    const rosterEl = document.getElementById('p-team-roster');
                    try {
                        const roster = await api('/api/players/by-team/' + encodeURIComponent(t.name));
                        rosterEl.innerHTML = roster.map(r => `<div class="bg-valBg/60 border border-gray-800 p-2 rounded-lg text-center"><p class="text-[10px] text-white font-bold truncate">${r.displayName}</p><p class="text-[9px] text-gray-500">${r.role || ''}</p></div>`).join('');
                    } catch(e) { rosterEl.innerHTML = ''; }
                    // Captain actions
                    const cm = document.getElementById('profile-captain-actions');
                    const mm = document.getElementById('profile-member-actions');
                    if (cm) {
                        const isCaptain = t.captainDiscordId === discordUser.discordId;
                        cm.classList.toggle('hidden', !isCaptain);
                        if (isCaptain) {
                            cm.querySelector('.p-captain-kick').onclick = async function() {
                                const pid = prompt('Nhập Discord ID thành viên muốn kick:');
                                if (!pid) return;
                                if (!confirm('Xác nhận kick thành viên này?')) return;
                                try {
                                    await api('/api/teams/' + encodeURIComponent(t.name) + '/players/' + pid, { method: 'DELETE' });
                                    showToast('Đã xóa thành viên!', 'success');
                                    loadPlayerProfile();
                                } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
                            };
                        }
                    }
                    if (mm) {
                        const isCaptain = t.captainDiscordId === discordUser.discordId;
                        mm.classList.toggle('hidden', isCaptain);
                        if (!isCaptain) {
                            mm.querySelector('.p-member-leave').onclick = async function() {
                                if (!confirm('Xác nhận rời đội?')) return;
                                try {
                                    await api('/api/teams/' + encodeURIComponent(t.name) + '/leave', { method: 'POST' });
                                    showToast('Đã rời đội!', 'success');
                                    loadPlayerProfile();
                                } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
                            };
                        }
                    }
                } else {
                    teamSection.classList.add('hidden');
                }
                // Match history
                const historyEl = document.getElementById('profile-match-history');
                if (data.matchHistory && data.matchHistory.length > 0) {
                    historyEl.innerHTML = data.matchHistory.map(m => {
                        const isWin = m.result === 'win';
                        const isLoss = m.result === 'loss';
                        const badge = isWin ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30' : isLoss ? 'text-red-400 bg-red-500/10 border-red-400/30' : 'text-gray-400 bg-gray-500/10 border-gray-400/30';
                        const label = isWin ? 'THẮNG' : isLoss ? 'THUA' : 'CHỜ';
                        const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : '';
                        return `<div class="bg-valBg/40 border border-gray-800 p-3 rounded-xl flex items-center gap-3 text-xs">
                            <span class="font-bold text-white">${m.team1Name}</span>
                            <span class="font-mono font-black ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-500'}">${m.score1} - ${m.score2}</span>
                            <span class="font-bold text-white">${m.team2Name}</span>
                            <span class="ml-auto ${badge} border px-2 py-0.5 rounded text-[9px] font-bold">${label}</span>
                            ${time ? `<span class="text-[9px] text-gray-500">${time}</span>` : ''}
                        </div>`;
                    }).join('');
                } else {
                    historyEl.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Chưa có trận nào</p>';
                }
            } catch(e) {
                hideLoading();
                if (e.message.includes('chưa đăng ký')) {
                    notReg.classList.remove('hidden');
                } else {
                    showToast('Lỗi tải hồ sơ: ' + e.message, 'error');
                }
            }
        }
        function openProfileEdit() {
            document.getElementById('pe-display-name').value = document.getElementById('p-display-name').textContent;
            document.getElementById('pe-riot-id').value = document.getElementById('p-riot-id').textContent;
            populateRankSelect('pe-rank', document.getElementById('p-rank').textContent);
            const currentRole = document.getElementById('p-role').textContent;
            const roleSel = document.getElementById('pe-role');
            if (currentRole && currentRole !== '-') roleSel.value = currentRole;
            const rankSelect = document.getElementById('pe-rank');
            const currentRank = document.getElementById('p-rank').textContent;
            const hasRank = currentRank && currentRank !== '-' && currentRank !== 'Chưa có' && currentRank !== 'Unranked';
            if (hasRank) {
                rankSelect.disabled = true;
                rankSelect.classList.add('opacity-50', 'cursor-not-allowed');
                document.getElementById('pe-rank-lock-notice').classList.remove('hidden');
            } else {
                rankSelect.disabled = false;
                rankSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                document.getElementById('pe-rank-lock-notice').classList.add('hidden');
            }
            document.getElementById('profile-edit-modal').classList.remove('hidden');
        }
        function closeProfileEdit() {
            document.getElementById('profile-edit-modal').classList.add('hidden');
        }
        async function saveProfileEdit() {
            const body = {};
            const displayName = document.getElementById('pe-display-name').value.trim();
            const riotId = document.getElementById('pe-riot-id').value.trim();
            const rankSelect = document.getElementById('pe-rank');
            const role = document.getElementById('pe-role').value;
            if (displayName) body.displayName = displayName;
            if (riotId) body.riotId = riotId;
            if (!rankSelect.disabled) body.rank = rankSelect.value;
            if (role) body.role = role;
            if (Object.keys(body).length === 0) return showToast('Không có thay đổi', 'info');
            try {
                await api('/api/players/me', { method: 'PUT', body });
                showToast('Đã cập nhật hồ sơ!', 'success');
                closeProfileEdit();
                loadPlayerProfile();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        // === Team Detail Modal ===
        async function openTeamDetail(teamName) {
            if (!teamName || teamName === 'Chưa có' || teamName === '-') return;
            showLoading('Đang tải thông tin đội...');
            try {
                const data = await api('/api/teams/detail/' + encodeURIComponent(teamName));
                hideLoading();
                document.getElementById('team-modal-title').textContent = data.team.name;
                document.getElementById('team-modal-status').textContent = data.team.status === 'approved' ? '✅ Đã duyệt' : '⏳ Chờ duyệt';
                document.getElementById('team-modal-captain').textContent = data.captain ? data.captain.displayName + ' (' + data.team.captainDiscordId + ')' : (data.team.captainDiscordId || 'Không có');
                document.getElementById('team-modal-wins').textContent = data.wins;
                document.getElementById('team-modal-losses').textContent = data.losses;
                const total = data.wins + data.losses;
                document.getElementById('team-modal-wr').textContent = total > 0 ? Math.round(data.wins / total * 100) + '%' : '-';
                const rosterEl = document.getElementById('team-modal-roster');
                if (data.roster && data.roster.length > 0) {
                    const isCaptain = discordUser && data.team.captainDiscordId === discordUser.discordId;
                    rosterEl.innerHTML = data.roster.map(r => {
                        const avatarUrl = r.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + r.discordId + '/' + r.discordAvatar + '.png?size=64' : '';
                        const canKick = isCaptain && r.discordId !== data.team.captainDiscordId;
                        return `<div class="bg-valBg/60 border border-gray-800 p-2 rounded-lg text-center" data-player-discord="${r.discordId}" data-player-name="${r.displayName}">
                            <div class="flex justify-center mb-1">
                                ${avatarUrl ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full border-2 border-gray-700 cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="openProfile('${r.discordId}')" title="Xem hồ sơ" onerror="this.style.display='none'">` : `<div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="openProfile('${r.discordId}')" title="Xem hồ sơ"><i class="fa-solid fa-user text-gray-600 text-sm"></i></div>`}
                            </div>
                            <p class="text-[10px] text-white font-bold truncate cursor-pointer hover:text-valCyan" onclick="openProfile('${r.discordId}')" title="Xem hồ sơ">${r.displayName}</p>
                            <p class="text-[9px] text-gray-500">${r.rank || ''}</p>
                            <p class="text-[9px] text-gray-500">${r.role || ''}</p>
                            <p class="text-[10px] text-yellow-400 font-mono font-bold">${r.elo}</p>
                            ${canKick ? `<button onclick="confirmKickMember('${data.team.name}', '${r.discordId}', '${r.displayName.replace(/'/g, "\\'")}')" class="mt-1 text-[9px] bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-200 px-2 py-0.5 rounded transition"><i class="fa-solid fa-user-minus mr-0.5"></i>Đá</button>` : ''}
                            ${r.discordId === data.team.captainDiscordId ? `<p class="text-[8px] text-emerald-400 mt-1"><i class="fa-solid fa-crown"></i> Đội trưởng</p>` : ''}
                        </div>`;
                    }).join('');
                } else { rosterEl.innerHTML = '<p class="text-gray-500 text-xs col-span-5 text-center py-4">Chưa có thành viên</p>'; }
                const matchEl = document.getElementById('team-modal-matches');
                if (data.matchHistory && data.matchHistory.length > 0) {
                    matchEl.innerHTML = data.matchHistory.slice(0, 10).map(m => {
                        const isWin = m.result === 'win', isLoss = m.result === 'loss';
                        const badge = isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-500';
                        const label = isWin ? 'THẮNG' : isLoss ? 'THUA' : 'CHỜ';
                        const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : '';
                        return `<div class="bg-valBg/40 border border-gray-800 p-2 rounded-xl flex items-center gap-2 text-xs">
                            <span class="font-bold text-white">${m.team1Name}</span>
                            <span class="font-mono font-black ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-500'}">${m.score1} - ${m.score2}</span>
                            <span class="font-bold text-white">${m.team2Name}</span>
                            <span class="ml-auto ${badge} border ${badge.replace('text','border')}/30 px-2 py-0.5 rounded text-[9px] font-bold">${label}</span>
                            ${time ? `<span class="text-[9px] text-gray-500">${time}</span>` : ''}
                        </div>`;
                    }).join('');
                } else { matchEl.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Chưa có trận nào</p>'; }
                document.getElementById('team-modal').classList.remove('hidden');
            } catch(e) {
                hideLoading();
                showToast('Lỗi tải thông tin đội: ' + e.message, 'error');
            }
        }
        function closeTeamDetail() {
            document.getElementById('team-modal').classList.add('hidden');
        }
        function openCreateTeamModal() {
            document.getElementById('create-team-modal').classList.remove('hidden');
        }
        function closeCreateTeamModal() {
            document.getElementById('create-team-modal').classList.add('hidden');
        }
        async function submitCreateTeam() {
            const name = document.getElementById('create-team-name').value.trim();
            if (!name) return showToast('Nhập tên đội!', 'error');
            if (name.length < 3) return showToast('Tên đội tối thiểu 3 ký tự!', 'error');
            const type = document.getElementById('create-team-type').value;
            try {
                const team = await api('/api/teams/create-from-registration', {
                    method: 'POST',
                    body: { name, type, discordId: discordUser.discordId, displayName: discordUser.discordUsername }
                });
                showToast('Đã tạo đội ' + team.name + '!', 'success');
                closeCreateTeamModal();
                loadTeamsBrowser();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }
        async function confirmKickMember(teamName, targetDiscordId, targetName) {
            if (!confirm('Bạn có chắc chắn muốn đá "' + targetName + '" ra khỏi đội ' + teamName + ' không?')) return;
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + targetDiscordId, { method: 'DELETE' });
                showToast('Đã đá ' + targetName + ' khỏi đội!', 'success');
                closeTeamDetail();
                openTeamDetail(teamName);
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        // Make team names clickable — call this after rendering any team name
        function wireTeamClicks() {
            document.querySelectorAll('.team-link').forEach(el => {
                el.addEventListener('click', function(e) { e.stopPropagation(); openTeamDetail(this.dataset.team); });
            });
        }
        async function lookupPlayer() {
            let discordId = document.getElementById('dashboard-discord-id').value.trim();
            if (!discordId && discordUser) { discordId = discordUser.discordId; document.getElementById('dashboard-discord-id').value = discordId; }
            if (!discordId) return showToast('Nhập Discord ID!', 'error');
            const resultDiv = document.getElementById('dashboard-result');
            resultDiv.classList.add('hidden');
            showLoading('Đang tra cứu...');
            try {
                // Find player in leaderboard
                const leaderboard = await api('/api/matches/leaderboard');
                const player = leaderboard.find(p => p.discordId === discordId);
                const playerDetail = await api('/api/matches/player/' + discordId).catch(() => null);
                if (player) {
                    document.getElementById('dashboard-player-name').textContent = player.displayName + ' 👤';
                    document.getElementById('d-elo').textContent = player.elo;
                    document.getElementById('d-rank').textContent = player.rankName;
                    document.getElementById('d-wins').textContent = player.wins;
                    document.getElementById('d-losses').textContent = player.losses;
                } else {
                    document.getElementById('dashboard-player-name').textContent = discordId + ' (not found in LB)';
                    document.getElementById('d-elo').textContent = '-';
                    document.getElementById('d-rank').textContent = '-';
                    document.getElementById('d-wins').textContent = '-';
                    document.getElementById('d-losses').textContent = '-';
                }
                // Upcoming matches
                const upcomingDiv = document.getElementById('dashboard-upcoming');
                if (playerDetail && Array.isArray(playerDetail)) {
                    const upcoming = playerDetail.filter(m => m.status === 'pending');
                    if (upcoming.length === 0) {
                        upcomingDiv.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-calendar-day text-2xl mb-2 block"></i>Không có trận sắp tới</div>';
                    } else {
                        upcomingDiv.innerHTML = upcoming.map(m => `
                            <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                    <span class="font-bold text-white text-sm">${m.team1Name}</span>
                                    <span class="text-gray-500 text-xs">vs</span>
                                    <span class="font-bold text-white text-sm">${m.team2Name}</span>
                                </div>
                                <span class="text-[10px] text-gray-400 font-mono">${m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD'}</span>
                            </div>
                        `).join('');
                    }
                } else {
                    upcomingDiv.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Không có dữ liệu trận đấu</p>';
                }
                // Match history
                const historyDiv = document.getElementById('dashboard-history');
                if (playerDetail && Array.isArray(playerDetail)) {
                    const history = playerDetail.filter(m => m.status === 'completed');
                    if (history.length === 0) {
                        historyDiv.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-clock-rotate-left text-2xl mb-2 block"></i>Chưa có trận nào</div>';
                    } else {
                        historyDiv.innerHTML = history.map(m => {
                            const rClass = m.result === 'win' ? 'text-emerald-400' : m.result === 'loss' ? 'text-red-400' : 'text-gray-400';
                            return `
                            <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-white text-sm">${m.team1Name}</span>
                                    <span class="font-black text-lg font-mono ${rClass}">${m.score1} - ${m.score2}</span>
                                    <span class="font-bold text-white text-sm">${m.team2Name}</span>
                                    <span class="text-[10px] ${rClass} font-bold uppercase">${m.result}</span>
                                </div>
                                <span class="text-[10px] text-gray-500">${m.map || ''}</span>
                            </div>`;
                        }).join('');
                    }
                } else {
                    historyDiv.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Không có dữ liệu trận đấu</p>';
                }
                hideLoading();
                resultDiv.classList.remove('hidden');
            } catch(e) {
                hideLoading();
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Team Lookup ===
        async function lookupTeam() {
            const teamName = document.getElementById('dashboard-team-name').value.trim();
            if (!teamName) return showToast('Nhập tên đội!', 'error');
            const resultDiv = document.getElementById('dashboard-result');
            resultDiv.classList.add('hidden');
            showLoading('Đang tra cứu đội...');
            try {
                const matches = await api('/api/matches/team/' + encodeURIComponent(teamName));
                hideLoading();
                document.getElementById('dashboard-player-name').textContent = teamName + ' 🏆';
                const stats = { wins: 0, losses: 0 };
                matches.forEach(m => { if (m.result === 'win') stats.wins++; else if (m.result === 'loss') stats.losses++; });
                document.getElementById('d-elo').textContent = stats.wins;
                document.getElementById('d-rank').textContent = 'W';
                document.getElementById('d-wins').textContent = stats.wins;
                document.getElementById('d-losses').textContent = stats.losses;
                const upcomingDiv = document.getElementById('dashboard-upcoming');
                const upcoming = matches.filter(m => m.status === 'pending');
                upcomingDiv.innerHTML = upcoming.length > 0
                    ? upcoming.map(m => `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex justify-between"><span class="font-bold text-white text-sm">${m.team1Name} vs ${m.team2Name}</span><span class="text-[10px] text-gray-400">${m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD'}</span></div>`).join('')
                    : '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-calendar-day text-2xl mb-2 block"></i>Không có trận sắp tới</div>';
                const historyDiv = document.getElementById('dashboard-history');
                const history = matches.filter(m => m.status === 'completed');
                historyDiv.innerHTML = history.length > 0
                    ? history.map(m => {
                        const rClass = m.result === 'win' ? 'text-emerald-400' : 'text-red-400';
                        return `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex justify-between"><div class="flex items-center gap-2"><span class="font-bold text-white text-sm">${m.team1Name}</span><span class="font-black text-lg font-mono ${rClass}">${m.score1} - ${m.score2}</span><span class="font-bold text-white text-sm">${m.team2Name}</span><span class="text-[10px] ${rClass} font-bold uppercase">${m.result}</span></div><span class="text-[10px] text-gray-500">${m.map || ''}</span></div>`;
                    }).join('')
                    : '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-clock-rotate-left text-2xl mb-2 block"></i>Chưa có trận nào</div>';
                resultDiv.classList.remove('hidden');
            } catch(e) {
                hideLoading();
                showToast('Lỗi: ' + e.message, 'error');
            }
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

        // === Discord Auth Functions ===
        let discordUser = null;

        let _userMenuInitialized = false;
        function initUserMenu() {
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
        }

        async function checkDiscordAuth() {
            initUserMenu();
            try {
                // Auto-extend session before checking
                await fetch('/api/discord/refresh', { method: 'POST', credentials: 'include' }).catch(() => {});
                const res = await fetch('/api/discord/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    discordUser = data.user;
                    document.getElementById('discord-login-btn').classList.add('hidden');
                    const info = document.getElementById('discord-user-info');
                    info.classList.remove('hidden');
                    const avatar = document.getElementById('discord-avatar');
                    const username = document.getElementById('discord-username');
                    username.textContent = discordUser.discordUsername;
                    document.getElementById('dropdown-username').textContent = discordUser.discordUsername;
                    document.getElementById('dropdown-discord-id').textContent = discordUser.discordId;
                    if (discordUser.discordAvatar) {
                        const src = 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png';
                        avatar.src = src;
                    }
                    // Auto-fill Discord ID in dashboard input
                    const dashInput = document.getElementById('dashboard-discord-id');
                    if (dashInput) { dashInput.value = discordUser.discordId; }
                    // Check if registered
                    try {
                        const player = await api('/api/players/lookup/' + discordUser.discordId);
                        if (player) showToast('Chào mừng ' + player.displayName + '!', 'success');
                    } catch(e) {}
                }
            } catch(e) {}
        }

        async function loginDiscord() {
            try {
                const data = await api('/api/discord/auth-url');
                if (data.url) window.location.href = data.url;
                else showToast('Không thể lấy link đăng nhập Discord', 'error');
            } catch(e) {
                showToast('Không thể kết nối Discord: ' + e.message, 'error');
            }
        }

        async function logoutDiscord() {
            try {
                await fetch('/api/discord/logout', { method: 'POST', credentials: 'include' });
            } catch(e) {}
            discordUser = null;
            document.getElementById('discord-login-btn').classList.remove('hidden');
            document.getElementById('discord-user-info').classList.add('hidden');
            showToast('Đã đăng xuất Discord', 'info');
        }

        // === Match Detail Modal ===
        async function openMatchDetail(matchId) {
            showLoading('Đang tải thông tin trận...');
            try {
                const data = await api('/api/matches/' + matchId + '/detail');
                hideLoading();
                const m = data.match;
                document.getElementById('md-title').textContent = m.team1Name + ' vs ' + m.team2Name;
                document.getElementById('md-status').textContent = m.status === 'completed' ? '✅ Hoàn tất' : '⏳ Chờ đấu';
                document.getElementById('md-team1').textContent = m.team1Name;
                document.getElementById('md-team2').textContent = m.team2Name;
                document.getElementById('md-team1').onclick = function(){ openTeamDetail(m.team1Name); };
                document.getElementById('md-team2').onclick = function(){ openTeamDetail(m.team2Name); };
                document.getElementById('md-score').textContent = m.score1 + ' - ' + m.score2;
                document.getElementById('md-map').textContent = m.map || 'Chưa chọn map';
                document.getElementById('md-time').textContent = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD';
                const roundMap = { group: 'Bảng', semifinal: 'Bán Kết', final: 'Chung Kết' };
                document.getElementById('md-round').textContent = roundMap[m.round] || m.round;
                document.getElementById('md-mvp').textContent = m.mvpPlayerName || (m.mvpDiscordId ? m.mvpDiscordId : 'Chưa có');
                document.getElementById('md-vod').innerHTML = m.streamUrl ? `<a href="${m.streamUrl}" target="_blank" class="hover:text-white">${m.streamUrl}</a>` : 'Không có';
                // KDA
                const team1Stats = data.playerStats.filter(s => s.teamNumber === 1);
                const team2Stats = data.playerStats.filter(s => s.teamNumber === 2);
                document.getElementById('md-t1-label').textContent = m.team1Name;
                document.getElementById('md-t2-label').textContent = m.team2Name;
                const renderKDA = (stats, elId) => {
                    const el = document.getElementById(elId);
                    if (stats.length === 0) { el.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Chưa có KDA</p>'; return; }
                    el.innerHTML = stats.map(s => `<div class="bg-valBg/40 border border-gray-800 p-2 rounded-lg flex justify-between text-xs"><span class="text-white font-bold">${s.playerName}</span><span class="font-mono text-gray-300">${s.kills} / ${s.deaths} / ${s.assists}</span></div>`).join('');
                };
                renderKDA(team1Stats, 'md-t1-kda');
                renderKDA(team2Stats, 'md-t2-kda');
                document.getElementById('match-detail-modal').classList.remove('hidden');
            } catch(e) {
                hideLoading();
                showToast('Lỗi tải thông tin trận: ' + e.message, 'error');
            }
        }
        function closeMatchDetail() {
            document.getElementById('match-detail-modal').classList.add('hidden');
        }
        // === Captain Score Reporting ===
        function openScoreReport(matchId, team1Name, team2Name) {
            if (!discordUser) return showToast('Đăng nhập Discord để báo kết quả!', 'error');
            document.getElementById('sr-match-id').value = matchId;
            const sel = document.getElementById('sr-team');
            sel.innerHTML = '<option value="">-- Chọn đội của bạn --</option>';
            [team1Name, team2Name].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
            document.getElementById('sr-score1').value = '';
            document.getElementById('sr-score2').value = '';
            document.getElementById('sr-map').value = '';
            document.getElementById('score-report-modal').classList.remove('hidden');
        }
        function closeScoreReport() {
            document.getElementById('score-report-modal').classList.add('hidden');
        }
        async function submitScoreReport() {
            const matchId = document.getElementById('sr-match-id').value;
            const teamName = document.getElementById('sr-team').value;
            const score1 = parseInt(document.getElementById('sr-score1').value);
            const score2 = parseInt(document.getElementById('sr-score2').value);
            const map = document.getElementById('sr-map').value;
            if (!teamName) return showToast('Chọn đội của bạn!', 'error');
            if (isNaN(score1) || isNaN(score2)) return showToast('Nhập tỉ số!', 'error');
            try {
                await api('/api/matches/' + matchId + '/report-score', { method: 'POST', body: { teamName, score1, score2, map: map || undefined } });
                showToast('Đã gửi báo cáo, chờ admin xác nhận!', 'success');
                closeScoreReport();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function loadScoreReports() {
            if (!requireAdminAuth()) return;
            try {
                const reports = await api('/api/matches/score-reports');
                const container = document.getElementById('score-reports-list');
                const pending = reports.filter(r => r.status === 'pending');
                if (pending.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fa-solid fa-circle-check text-2xl mb-2 block"></i>Không có báo cáo chờ duyệt</div>'; return; }
                container.innerHTML = pending.map(r => {
                    const m = r.match || {};
                    return `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-white">${m.team1Name || '???'} vs ${m.team2Name || '???'}</p>
                                <p class="text-[10px] text-gray-400">Báo bởi: ${r.reportedByName} (${r.teamName})</p>
                                <p class="text-sm font-mono font-bold text-white mt-1">${r.score1} - ${r.score2} ${r.map ? '| ' + r.map : ''}</p>
                                <p class="text-[9px] text-gray-500">${new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                            <div class="flex gap-1 shrink-0">
                                <button onclick="approveScoreReport('${r.id}')" class="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-500/30 transition">Duyệt</button>
                                <button onclick="rejectScoreReport('${r.id}')" class="bg-red-500/20 text-red-400 border border-red-400/30 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition">Từ chối</button>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            } catch(e) { document.getElementById('score-reports-list').innerHTML = '<p class="text-gray-500 text-center py-4">Lỗi tải</p>'; }
        }
        async function approveScoreReport(id) {
            try { await api('/api/matches/score-reports/' + id + '/approve', { method: 'PUT' }); showToast('Đã duyệt báo cáo!', 'success'); loadScoreReports(); loadSchedule(); } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function rejectScoreReport(id) {
            try { await api('/api/matches/score-reports/' + id + '/reject', { method: 'PUT' }); showToast('Đã từ chối!', 'success'); loadScoreReports(); } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
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
        function openResultModal(matchId, team1, team2, score1, score2, map) {
            document.getElementById('result-match-id').value = matchId;
            document.getElementById('result-team1-name').textContent = team1;
            document.getElementById('result-team2-name').textContent = team2;
            document.getElementById('result-score1').value = score1 || '';
            document.getElementById('result-score2').value = score2 || '';
            document.getElementById('result-map').value = map || '';
            document.getElementById('result-stream').value = '';
            document.getElementById('result-forfeit').value = '';
            // Auto-populate KDA player fields from roster
            (async () => {
                try {
                    const [roster1, roster2] = await Promise.all([
                        api('/api/players/by-team/' + encodeURIComponent(team1)),
                        api('/api/players/by-team/' + encodeURIComponent(team2))
                    ]);
                    if (Array.isArray(roster1)) document.getElementById('kda-t1-players').value = roster1.map(p => p.discordId).join(', ');
                    if (Array.isArray(roster2)) document.getElementById('kda-t2-players').value = roster2.map(p => p.discordId).join(', ');
                } catch(e) {}
            })();
            document.getElementById('result-modal').classList.remove('hidden');
        }
        function closeResultModal() {
            document.getElementById('result-modal').classList.add('hidden');
        }
        async function submitMatchResult() {
            const id = document.getElementById('result-match-id').value;
            const score1 = parseInt(document.getElementById('result-score1').value);
            const score2 = parseInt(document.getElementById('result-score2').value);
            const map = document.getElementById('result-map').value;
            const streamUrl = document.getElementById('result-stream').value.trim() || undefined;
            const forfeitVal = document.getElementById('result-forfeit').value;
            let forfeit = undefined;
            const team1Name = document.getElementById('result-team1-name').textContent;
            const team2Name = document.getElementById('result-team2-name').textContent;
            if (forfeitVal === 'team1') forfeit = team1Name;
            else if (forfeitVal === 'team2') forfeit = team2Name;
            if (!forfeit && (isNaN(score1) || isNaN(score2))) return showToast('Nhập tỉ số hoặc chọn forfeit!', 'error');
            try {
                await api('/api/matches/' + id, { method: 'PUT', body: { score1, score2, map, streamUrl, status: 'completed', forfeit } });
                // Save KDA if entered
                const k1 = parseInt(document.getElementById('kda-t1-k').value);
                const d1 = parseInt(document.getElementById('kda-t1-d').value);
                const a1 = parseInt(document.getElementById('kda-t1-a').value);
                const k2 = parseInt(document.getElementById('kda-t2-k').value);
                const d2 = parseInt(document.getElementById('kda-t2-d').value);
                const a2 = parseInt(document.getElementById('kda-t2-a').value);
                if (!isNaN(k1) || !isNaN(k2)) {
                    const t1players = document.getElementById('kda-t1-players').value.split(',').map(s=>s.trim()).filter(Boolean);
                    const t2players = document.getElementById('kda-t2-players').value.split(',').map(s=>s.trim()).filter(Boolean);
                    try { await api('/api/teams/kda/' + id, { method: 'PUT', body: { team1Kills: k1||0, team1Deaths: d1||0, team1Assists: a1||0, team2Kills: k2||0, team2Deaths: d2||0, team2Assists: a2||0, team1Players: t1players, team2Players: t2players, matchId: id } }); } catch(e2) {}
                }
                showToast('Đã cập nhật kết quả!', 'success');
                closeResultModal();
                loadSchedule();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }
        // === MVP Modal ===
        function openMvpModal(matchId) {
            document.getElementById('mvp-match-id').value = matchId;
            document.getElementById('mvp-discord-id').value = '';
            document.getElementById('mvp-player-name').value = '';
            document.getElementById('mvp-modal').classList.remove('hidden');
        }
        function closeMvpModal() {
            document.getElementById('mvp-modal').classList.add('hidden');
        }
        async function submitMvp() {
            const id = document.getElementById('mvp-match-id').value;
            const discordId = document.getElementById('mvp-discord-id').value.trim();
            const playerName = document.getElementById('mvp-player-name').value.trim();
            if (!discordId) return showToast('Nhập Discord ID của MVP!', 'error');
            try {
                await api('/api/matches/' + id + '/mvp', { method: 'PUT', body: { discordId, playerName } });
                showToast('Đã gán MVP!', 'success');
                closeMvpModal();
                loadSchedule();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Dispute Functions ===
        function openDisputeModal(matchId, team1, team2) {
            document.getElementById('dispute-match-id').value = matchId;
            const sel = document.getElementById('dispute-team');
            sel.innerHTML = '';
            [team1, team2].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
            const filedByInput = document.getElementById('dispute-filed-by');
            if (discordUser) filedByInput.value = discordUser.discordId;
            document.getElementById('dispute-modal').classList.remove('hidden');
        }
        function closeDisputeModal() {
            document.getElementById('dispute-modal').classList.add('hidden');
        }
        async function submitDispute() {
            if (!discordUser) return showToast('Đăng nhập Discord trước khi gửi khiếu nại!', 'error');
            const matchId = document.getElementById('dispute-match-id').value;
            const teamName = document.getElementById('dispute-team').value;
            const filedBy = discordUser.discordId;
            const reason = document.getElementById('dispute-reason').value;
            const detail = document.getElementById('dispute-detail').value.trim();
            if (!teamName) return showToast('Chọn đội!', 'error');
            try {
                await api('/api/disputes', { method: 'POST', body: { matchId, teamName, reason, detail, filedBy } });
                showToast('Đã gửi khiếu nại!', 'success');
                closeDisputeModal();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function loadDisputes() {
            if (!requireAdminAuth()) return;
            try {
                const list = await api('/api/disputes');
                const pending = list.filter(d => d.status === 'open');
                const container = document.getElementById('dispute-list');
                if (pending.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 py-6"><i class="fa-solid fa-scale-balanced text-xl mb-2 block"></i>Không có khiếu nại</div>'; return; }
                container.innerHTML = pending.map(d => `<div class="bg-valBg/60 border border-orange-400/20 p-2.5 rounded-xl text-xs">
                    <div class="flex justify-between items-center">
                        <div><span class="text-white font-bold">${d.teamName}</span> <span class="text-gray-400">vs</span> <span class="text-orange-400">${d.reason}</span></div>
                        <div class="flex gap-1">
                            <button onclick="resolveDispute('${d.id}','resolved')" class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px]">Chấp nhận</button>
                            <button onclick="resolveDispute('${d.id}','rejected')" class="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px]">Từ chối</button>
                        </div>
                    </div>
                    <div class="text-gray-500 mt-1">${d.detail || ''} — <span class="text-gray-400">${d.filedBy}</span></div>
                </div>`).join('');
            } catch(e) {}
        }
        async function resolveDispute(id, status) {
            const resolution = status === 'resolved' ? 'Chấp nhận khiếu nại' : 'Từ chối khiếu nại';
            try {
                await api('/api/disputes/' + id, { method: 'PUT', body: { status, resolution } });
                showToast('Đã xử lý khiếu nại!', 'success');
                loadDisputes();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

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
                    const avatar = p.discordAvatar ? '<img src="https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=64" class="w-10 h-10 rounded-full border border-gray-700">' : '<div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600"><i class="fa-solid fa-user"></i></div>';
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

        // === Penalty Functions ===
        async function loadPenalties() {
            if (!requireAdminAuth()) return;
            try {
                const list = await api('/api/penalties');
                const container = document.getElementById('penalty-list');
                if (list.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-2">Chưa có vi phạm</p>'; return; }
                container.innerHTML = list.map(p => `<div class="flex justify-between items-center bg-valBg/60 border border-gray-800 p-2 rounded-lg">
                    <span class="${p.severity === 'dq' ? 'text-red-400' : p.severity === 'penalty' ? 'text-yellow-400' : 'text-gray-300'}">${p.playerName} - ${p.reason}</span>
                    <span class="text-[10px] text-gray-500">${p.severity} ${new Date(p.createdAt).toLocaleString('vi-VN')}</span>
                </div>`).join('');
            } catch(e) {}
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
        async function loadPendingTeams() {
            if (!requireAdminAuth()) return;
            try {
                const teams = await api('/api/teams/all');
                const container = document.getElementById('pending-teams-list');
                const pending = teams.filter(t => t.status === 'pending');
                if (pending.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-2">Không có đội chờ duyệt</p>'; return; }
                container.innerHTML = pending.map(t => {
                    const roster = JSON.parse(t.rosterJson || '[]');
                    return '<div class="bg-valBg border border-yellow-400/20 p-3 rounded-xl">' +
                        '<div class="flex justify-between items-center">' +
                        '<div><span class="text-white font-bold">' + t.name + '</span>' +
                        '<span class="text-gray-500 ml-2">Captain: ' + t.captainDiscordId + '</span></div>' +
                        '<div class="flex gap-1">' +
                        '<button onclick="approveTeam(\'' + t.id + '\')" class="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded text-[10px] font-bold">Duyệt</button>' +
                        '<button onclick="rejectTeam(\'' + t.id + '\')" class="bg-red-500/20 text-red-400 border border-red-400/30 px-2 py-1 rounded text-[10px] font-bold">Từ chối</button>' +
                        '<button onclick="disbandTeam(\'' + t.id + '\')" class="bg-gray-500/20 text-gray-400 border border-gray-400/30 px-2 py-1 rounded text-[10px] font-bold">Xoá</button>' +
                        '</div></div>' +
                        '<div class="text-[10px] text-gray-500 mt-1">' + roster.join(', ') + '</div></div>';
                }).join('');
            } catch(e) {
                document.getElementById('pending-teams-list').innerHTML = '<p class="text-gray-500 text-center py-2">Lỗi tải</p>';
            }
        }

        async function approveTeam(id) {
            try {
                await api('/api/teams/' + id + '/approve', { method: 'PUT' });
                showToast('Đã duyệt đội!', 'success');
                loadPendingTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function rejectTeam(id) {
            try {
                await api('/api/teams/' + id + '/reject', { method: 'PUT' });
                showToast('Đã từ chối đội!', 'success');
                loadPendingTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

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

        async function addPenalty() {
            const playerId = document.getElementById('penalty-player-id').value.trim();
            const playerName = document.getElementById('penalty-player-name').value.trim();
            const reason = document.getElementById('penalty-reason').value.trim();
            const severity = document.getElementById('penalty-severity').value;
            if (!playerName || !reason) return showToast('Nhập tên và lý do!', 'error');
            try {
                await api('/api/penalties', { method: 'POST', body: { playerId, playerName, reason, severity } });
                showToast('Đã thêm vi phạm!', 'success');
                document.getElementById('penalty-player-id').value = '';
                document.getElementById('penalty-player-name').value = '';
                document.getElementById('penalty-reason').value = '';
                loadPenalties();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
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
        function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

        // === Teams browser ===
        let allTeams = [];
        let currentPlayerTeam = null;
        let pendingRequestsMap = {};

        async function loadTeams() {
            return loadTeamsBrowser();
        }

        async function loadTeamsBrowser() {
            const container = document.getElementById('teams-list');
            const faContainer = document.getElementById('free-agents-list');
            const mySection = document.getElementById('my-team-section');
            const myContent = document.getElementById('my-team-content');
            if (!container) return;

            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Đang tải...</div>';
            if (faContainer) faContainer.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Đang tải...</div>';

            try {
                let myPlayer = null;
                let myTeamName = null;
                if (discordUser) {
                    myPlayer = await api('/api/players/lookup/' + discordUser.discordId).catch(() => null);
                    myTeamName = myPlayer?.teamId || null;
                }
                currentPlayerTeam = myTeamName;

                const teams = await api('/api/teams/all');
                allTeams = teams;
                const countEl = document.getElementById('teams-count');
                if (countEl) countEl.textContent = teams.length + ' đội';

                // === My Team Section ===
                if (mySection && myContent) {
                    if (myTeamName) {
                        mySection.classList.remove('hidden');
                        const team = teams.find(t => t.name === myTeamName);
                        if (team) {
                            const roster = JSON.parse(team.rosterJson || '[]');
                            const isCaptain = discordUser && team.captainDiscordId === discordUser.discordId;
                            const size = roster.length;
                            let html = '';

                            if (isCaptain) {
                                html += '<div class="flex items-center gap-2">';
                                html += '<input type="text" id="my-team-name-input" value="' + escHtml(team.name) + '" class="bg-valBg border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold outline-none focus:border-valCyan flex-1">';
                                html += '<button onclick="renameTeam()" class="text-[10px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-2 py-1.5 rounded-lg font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-pen"></i></button>';
                                html += '</div>';
                            } else {
                                const safeName = team.name.replace(/'/g, "\\'");
                                html += '<h4 class="text-white font-bold text-lg cursor-pointer hover:text-valCyan transition" onclick="openTeamDetail(\'' + safeName + '\')">' + escHtml(team.name) + ' <i class="fa-solid fa-up-right-from-square text-[10px] text-gray-500 ml-1"></i></h4>';
                            }

                            const statusLabel = size === 5 ? '✅ HOÀN CHỈNH' : 'Đang tuyển';
                            const statusColor = size === 5 ? 'text-emerald-400' : 'text-amber-400';
                            html += '<div class="flex items-center gap-3"><span class="text-[10px] ' + statusColor + ' font-bold uppercase">' + statusLabel + '</span>';
                            html += '<span class="text-[10px] text-gray-500">' + size + '/5 thành viên</span>';
                            html += '<span class="text-[10px] text-yellow-400 font-mono font-bold">' + (team.pts || 0) + 'đ</span></div>';

                            html += '<div class="space-y-2">';
                            const rosterPlayers = team.rosterPlayers || [];
                            const rosterMap = {};
                            for (const rp of rosterPlayers) rosterMap[rp.discordId] = rp;
                            for (const rid of roster) {
                                const p = rosterMap[rid] || null;
                                const name = p ? p.displayName : rid;
                                const isCap = rid === team.captainDiscordId;
                                const avatarUrl = p?.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + rid + '/' + p.discordAvatar + '.png?size=32' : '';
                                html += '<div class="flex items-center justify-between bg-valBg/60 border border-gray-800 p-3 rounded-xl hover:border-valCyan/30 transition">';
                                html += '<div class="flex items-center gap-2">';
                                html += avatarUrl ? '<img src="' + avatarUrl + '" class="w-7 h-7 rounded-full border border-gray-700 cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="openProfile(\'' + rid + '\')" title="Xem hồ sơ" onerror="this.style.display=\'none\'">' : '<div class="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="openProfile(\'' + rid + '\')" title="Xem hồ sơ"><i class="fa-solid fa-user text-gray-600 text-[10px]"></i></div>';
                                html += '<span class="text-white text-sm font-bold cursor-pointer hover:text-valCyan" onclick="openProfile(\'' + rid + '\')">' + escHtml(name) + '</span>';
                                if (isCap) html += '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold border border-yellow-400/30"><i class="fa-solid fa-crown mr-0.5"></i>Đội Trưởng</span>';
                                html += '</div>';
                                if (isCaptain && !isCap) {
                                    html += '<button onclick="confirmKickMember(\'' + team.name + '\',\'' + rid + '\',\'' + escHtml(name).replace(/'/g, "\\'") + '\')" class="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/30 p-1 rounded transition" title="Đá thành viên"><i class="fa-solid fa-user-minus"></i></button>';
                                }
                                html += '</div>';
                            }
                            html += '</div>';

                            if (isCaptain) {
                                try {
                                    const requests = await api('/api/teams/' + encodeURIComponent(team.name) + '/requests');
                                    const pending = requests.filter(r => r.status === 'pending');
                                    html += '<div class="border-t border-gray-800 pt-3 mt-3">';
                                    html += '<h5 class="text-xs font-bold text-amber-400 uppercase mb-2"><i class="fa-solid fa-envelope mr-1"></i>Đơn Xin Vào (' + pending.length + ')</h5>';
                                    if (pending.length === 0) {
                                        html += '<p class="text-xs text-gray-500">Chưa có đơn xin vào đội</p>';
                                    } else {
                                        for (const r of pending) {
                                            html += '<div class="flex items-center justify-between bg-valBg/40 border border-gray-800 p-3 rounded-lg mb-2">';
                                            html += '<div><p class="text-sm text-white font-bold">' + escHtml(r.playerName) + '</p><p class="text-[10px] text-gray-500 font-mono">' + r.playerDiscordId + '</p></div>';
                                            html += '<div class="flex gap-2">';
                                            html += '<button onclick="approveJoinRequest(\'' + team.name + '\',\'' + r.id + '\')" class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500/30"><i class="fa-solid fa-check"></i> Duyệt</button>';
                                            html += '<button onclick="rejectJoinRequest(\'' + team.name + '\',\'' + r.id + '\')" class="text-[10px] bg-red-500/20 text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500/30"><i class="fa-solid fa-xmark"></i> Từ chối</button>';
                                            html += '</div></div>';
                                        }
                                    }
                                    html += '</div>';
                                } catch(e) {}
                            }

                            html += '<div class="flex gap-3 pt-3 border-t border-gray-800">';
                            if (isCaptain) {
                                html += '<button onclick="if(confirm(\'Xác nhận GIẢI TÁN đội? Hành động này không thể hoàn tác!\'))disbandMyTeam()" class="flex-1 text-[11px] bg-red-500/20 text-red-400 border border-red-400/30 px-3 py-2 rounded-lg font-bold hover:bg-red-500/30 transition"><i class="fa-solid fa-trash mr-1"></i>Giải Tán Đội</button>';
                            } else {
                                html += '<button onclick="leaveTeam()" class="flex-1 text-[11px] bg-red-500/20 text-red-400 border border-red-400/30 px-3 py-2 rounded-lg font-bold hover:bg-red-500/30 transition"><i class="fa-solid fa-sign-out-alt mr-1"></i>Rời Đội</button>';
                            }
                            html += '</div>';

                            myContent.innerHTML = html;
                        } else {
                            mySection.classList.add('hidden');
                        }
                    } else {
                        if (discordUser && myPlayer) {
                            mySection.classList.remove('hidden');
                            myContent.innerHTML = '<div class="text-center py-8">' +
                                '<div class="text-4xl text-gray-600 mb-3"><i class="fa-solid fa-people-arrows"></i></div>' +
                                '<p class="text-gray-400 text-sm mb-4">Bạn chưa có đội. Hãy tạo đội mới hoặc tham gia đội có sẵn!</p>' +
                                '<button onclick="openCreateTeamModal()" class="bg-valCyan/20 text-valCyan border border-valCyan/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-plus mr-1"></i>Tạo Đội Mới</button>' +
                            '</div>';
                        } else {
                            mySection.classList.add('hidden');
                        }
                    }
                }

                // === All Teams Section ===
                if (teams.length === 0) {
                    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">Chưa có đội nào được tạo</div>';
                } else {
                    let html = '';
                    for (const team of teams) {
                        const roster = JSON.parse(team.rosterJson || '[]');
                        const size = roster.length;
                        const isComplete = size === 5;
                        const isCaptain = discordUser && team.captainDiscordId === discordUser.discordId;
                        const isMember = myTeamName === team.name;
                        const canJoin = discordUser && myPlayer && !myTeamName && team.status === 'approved' && size < 5 && !isCaptain;
                        const hasPendingRequest = pendingRequestsMap[team.name];

                        let borderColor, badgeColor, badgeText;
                        if (isComplete) {
                            borderColor = 'border-blue-500/50';
                            badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-400/30';
                            badgeText = '✅ HOÀN CHỈNH';
                        } else if (size === 3) {
                            borderColor = 'border-orange-500/50';
                            badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-400/30';
                            badgeText = '3 người';
                        } else if (size === 2) {
                            borderColor = 'border-yellow-500/50';
                            badgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
                            badgeText = '2 người';
                        } else {
                            borderColor = 'border-gray-600/50';
                            badgeColor = 'bg-gray-500/20 text-gray-400 border-gray-400/30';
                            badgeText = '1 người';
                        }

                        const rosterPlayers = team.rosterPlayers || [];
                        const rosterMap = {};
                        for (const rp of rosterPlayers) rosterMap[rp.discordId] = rp;
                        const captainP = rosterMap[team.captainDiscordId] || null;
                        const captainName = captainP ? captainP.displayName : team.captainDiscordId;

                        html += '<div class="bg-valCard border ' + borderColor + ' rounded-2xl p-5 hover:shadow-lg transition">';
                        html += '<div class="flex items-center justify-between mb-3">';
                        html += '<div><h4 class="text-white font-bold text-base">' + escHtml(team.name) + '</h4>';
                        html += '<p class="text-[10px] text-gray-500 mt-0.5">Bởi: ' + escHtml(captainName) + '</p></div>';
                        html += '<span class="text-[10px] font-mono ' + badgeColor + ' border px-2 py-0.5 rounded-full font-bold whitespace-nowrap">' + badgeText + '</span>';
                        html += '</div>';

                        html += '<div class="space-y-1.5 mb-3">';
                        for (const rid of roster) {
                            const p = rosterMap[rid] || null;
                            const name = p ? p.displayName : rid;
                            const isCap = rid === team.captainDiscordId;
                            html += '<div class="flex items-center gap-2 bg-valBg/60 p-2 rounded-lg text-xs">';
                            html += '<i class="fa-solid fa-user text-gray-500"></i><span class="text-gray-300">' + escHtml(name) + '</span>';
                            if (isCap) html += '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded font-bold">ĐT</span>';
                            html += '</div>';
                        }
                        if (size < 5) {
                            for (let i = size; i < 5; i++) {
                                html += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-800 p-2 rounded-lg text-xs text-gray-600"><i class="fa-solid fa-plus"></i><span>Trống</span></div>';
                            }
                        }
                        html += '</div>';

                        html += '<div class="text-[10px] text-yellow-400 font-mono font-bold mb-3"><i class="fa-solid fa-star mr-1"></i>' + (team.pts || 0) + 'đ tổng</div>';

                        html += '<div class="flex gap-2">';
                        if (isComplete) {
                            html += '<span class="flex-1 text-center text-[11px] bg-blue-500/10 text-blue-400 border border-blue-400/30 px-3 py-2 rounded-lg font-bold">✅ Đã hoàn chỉnh</span>';
                        } else if (hasPendingRequest) {
                            html += '<button onclick="cancelJoinRequest(\'' + team.name + '\')" class="flex-1 text-[11px] bg-yellow-500/20 text-yellow-400 border border-yellow-400/30 px-3 py-2 rounded-lg font-bold hover:bg-yellow-500/30 transition"><i class="fa-solid fa-clock mr-1"></i>Đã Gửi Đơn (Hủy)</button>';
                        } else if (canJoin) {
                            html += '<button onclick="requestJoinTeam(\'' + team.name + '\')" class="flex-1 text-[11px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-hand mr-1"></i>Xin Vào</button>';
                        } else if (isMember) {
                            html += '<span class="flex-1 text-center text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-bold"><i class="fa-solid fa-check mr-1"></i>Đã Trong Đội</span>';
                        } else if (!discordUser) {
                            html += '<span class="flex-1 text-center text-[11px] text-gray-500 border border-gray-700 px-3 py-2 rounded-lg font-bold">Đăng nhập để xin vào</span>';
                        }
                        html += '</div></div>';
                    }
                    container.innerHTML = html;
                }

                // === Free Agents Section ===
                if (faContainer) {
                    const faBadge = document.getElementById('fa-count-badge');
                    try {
                        const agents = await api('/api/players/free-agents');
                        if (faBadge) faBadge.textContent = (agents || []).length;
                        if (!agents || agents.length === 0) {
                            faContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-user-slash text-2xl mb-2"></i><p>Không có tuyển thủ tự do</p></div>';
                        } else {
                            faContainer.innerHTML = agents.map(p => {
                                const initial = (p.displayName || '?').charAt(0).toUpperCase();
                                return '<div class="bg-valCard/60 border border-gray-800 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-valBg/60 transition" onclick="openProfile(\'' + p.discordId + '\')">' +
                                    '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-bold shrink-0">' + initial + '</div>' +
                                    '<div class="min-w-0 flex-1"><p class="text-xs text-white font-bold truncate">' + escHtml(p.displayName) + '</p>' +
                                    '<p class="text-[9px] text-gray-400">' + (p.rank || '') + ' · ' + (p.role || '') + ' · ' + (p.elo || 0) + ' Elo</p></div>' +
                                    '<span class="text-[10px] text-yellow-400 font-mono font-bold shrink-0">' + (p.pts || 0) + 'đ</span></div>';
                            }).join('');
                        }
                    } catch(e) {
                        if (faBadge) faBadge.textContent = '!';
                        faContainer.innerHTML = '<div class="text-center py-8 text-red-400">Lỗi tải danh sách</div>';
                    }
                }

            } catch(e) {
                container.innerHTML = '<div class="col-span-full text-center py-12 text-red-400">Lỗi tải danh sách đội: ' + e.message + '</div>';
            }
        }

        async function requestJoinTeam(teamName) {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            try {
                const result = await api('/api/teams/' + encodeURIComponent(teamName) + '/join', { method: 'POST' });
                pendingRequestsMap[teamName] = result.id || true;
                showToast('Đã gửi đơn xin vào đội ' + teamName + '! Chờ đội trưởng duyệt.', 'success');
                loadTeamsBrowser();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function cancelJoinRequest(teamName) {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            if (!pendingRequestsMap[teamName]) return showToast('Không tìm thấy đơn xin vào đội này', 'error');
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/requests/cancel', { method: 'POST', body: { discordId: discordUser.discordId } });
                delete pendingRequestsMap[teamName];
                showToast('Đã hủy đơn xin vào đội', 'info');
                loadTeamsBrowser();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function approveJoinRequest(teamName, requestId) {
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/approve', { method: 'PUT' });
                showToast('Đã duyệt thành viên!', 'success');
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function rejectJoinRequest(teamName, requestId) {
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/reject', { method: 'PUT' });
                showToast('Đã từ chối', 'info');
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function renameTeam() {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            if (!currentPlayerTeam) return showToast('Bạn chưa có đội!', 'error');
            const newName = document.getElementById('my-team-name-input')?.value.trim();
            if (!newName) return showToast('Nhập tên đội mới!', 'error');
            if (newName === currentPlayerTeam) return;
            try {
                await api('/api/teams/' + encodeURIComponent(currentPlayerTeam) + '/rename', { method: 'PUT', body: { newName, discordId: discordUser.discordId } });
                showToast('Đã đổi tên đội thành ' + newName + '!', 'success');
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function leaveTeam() {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            if (!currentPlayerTeam) return showToast('Bạn chưa có đội!', 'error');
            if (!confirm('Xác nhận rời khỏi đội?')) return;
            try {
                await api('/api/teams/' + encodeURIComponent(currentPlayerTeam) + '/leave', { method: 'POST' });
                showToast('Đã rời khỏi đội!', 'success');
                currentPlayerTeam = null;
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function removeMember(teamName, discordId) {
            if (!confirm('Xác nhận xóa thành viên này khỏi đội?')) return;
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + discordId, { method: 'DELETE' });
                showToast('Đã xóa thành viên!', 'success');
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function disbandMyTeam() {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            if (!currentPlayerTeam) return showToast('Bạn chưa có đội!', 'error');
            try {
                const team = allTeams.find(t => t.name === currentPlayerTeam);
                if (!team) return showToast('Không tìm thấy đội!', 'error');
                await api('/api/teams/' + encodeURIComponent(team.name) + '/disband', { method: 'DELETE', body: { discordId: discordUser.discordId } });
                showToast('Đã giải tán đội!', 'success');
                currentPlayerTeam = null;
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function adminDraftTeams() {
            if (!requireAdminAuth()) return;
            try {
                const res = await api('/api/teams/admin/draft', { method: 'POST' });
                showToast(`Đã gom ${res.drafted} đội!`, 'success');
                loadCompleteTeams();
                loadTeamsBrowser();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function loadCompleteTeams() {
            const container = document.getElementById('complete-teams-list');
            if (!container) return;
            try {
                const teams = await api('/api/teams/all');
                const players = await api('/api/players').catch(() => []);
                const complete = teams.filter(t => t.status === 'complete' || t.status === 'approved');
                const recruiting = teams.filter(t => t.status === 'recruiting');
                if (complete.length === 0) {
                    container.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">Chưa có đội hoàn chỉnh. Bấm "Gom Đội" để tạo.</div>';
                } else {
                    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
                    for (const team of complete) {
                        const roster = JSON.parse(team.rosterJson || '[]');
                        const memberCount = roster.length;
                        const safeName = team.name.replace(/'/g, "\\'");
                        html += `<div class="bg-valBg/60 border border-blue-500/30 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <h5 class="text-sm font-bold text-white truncate cursor-pointer hover:text-valCyan" onclick="openTeamDetail('${safeName}')" title="Xem chi tiết">${team.name}</h5>
                                    <button onclick="adminRenameTeam('${safeName}')" class="text-gray-500 hover:text-valCyan text-[10px]" title="Đổi tên"><i class="fa-solid fa-pen"></i></button>
                                    <button onclick="if(confirm('Xoá đội ${team.name}?'))deleteTeam('${safeName}')" class="text-gray-500 hover:text-valRed text-[10px]" title="Xoá đội"><i class="fa-solid fa-trash"></i></button>
                                </div>
                                <span class="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">✅ ${memberCount} NGƯỜI</span>
                            </div>
                            <div class="text-[10px] text-gray-400 space-y-1">`;
                        for (const discordId of roster) {
                            const p = players.find(pl => pl.discordId === discordId);
                            const pName = p ? p.displayName : discordId;
                            html += `<div class="flex justify-between items-center">
                                <span class="truncate">${pName}</span>
                                <button onclick="adminKickMember('${safeName}','${discordId}')" class="text-gray-600 hover:text-valRed text-[9px] ml-2 shrink-0" title="Đá khỏi đội"><i class="fa-solid fa-user-minus"></i></button>
                            </div>`;
                        }
                        html += `</div>
                            <div class="mt-2 text-[10px] text-gray-500">Tổng: ${team.pts || 0}đ · Đội trưởng: ${team.captainDiscordId || 'N/A'}</div>
                            <div class="mt-2 flex gap-2">
                                <button onclick="adminAddToTeam('${safeName}')" class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition"><i class="fa-solid fa-plus mr-0.5"></i>Thêm</button>
                            </div>
                        </div>`;
                    }
                    html += '</div>';
                    container.innerHTML = html;
                }
                // Recruiting teams
                const recContainer = document.getElementById('admin-recruiting-teams');
                if (recContainer) {
                    if (recruiting.length === 0) {
                        recContainer.innerHTML = '<div class="col-span-full text-center py-4 text-gray-500 text-xs">Không có đội nào đang tuyển</div>';
                    } else {
                        recContainer.innerHTML = recruiting.map(t => {
                            const roster = JSON.parse(t.rosterJson || '[]');
                            const colors = { 1: '#6B7280', 2: '#EAB308', 3: '#F97316' };
                            const color = colors[roster.length] || '#6B7280';
                            const safeName = t.name.replace(/'/g, "\\'");
                            return `<div class="bg-valBg/60 border border-gray-800 rounded-xl p-3" style="border-left: 3px solid ${color}">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-xs font-bold text-white">${t.name}</div>
                                        <div class="text-[10px] text-gray-400">${roster.length} người · ${t.pts || 0}đ</div>
                                    </div>
                                    <div class="flex gap-1">
                                        <button onclick="adminAddToTeam('${safeName}')" class="text-gray-500 hover:text-emerald-400 text-[10px]" title="Thêm người"><i class="fa-solid fa-user-plus"></i></button>
                                        <button onclick="if(confirm('Xoá đội ${t.name}?'))deleteTeam('${safeName}')" class="text-gray-500 hover:text-valRed text-[10px]" title="Xoá đội"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            </div>`;
                        }).join('');
                    }
                }
            } catch(e) { container.innerHTML = '<div class="text-center py-4 text-gray-500 text-xs">Lỗi tải dữ liệu</div>'; }
        }
        async function adminAddToTeam(teamName) {
            const id = prompt('Nhập Discord ID của người chơi để thêm vào đội ' + teamName + ':');
            if (!id) return;
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/admin-add-player', { method: 'POST', body: { discordId: id } });
                showToast('Đã thêm vào đội!', 'success');
                loadCompleteTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function adminKickMember(teamName, discordId) {
            if (!confirm('Đá người chơi này khỏi đội?')) return;
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + encodeURIComponent(discordId), { method: 'DELETE' });
                showToast('Đã đá khỏi đội!', 'success');
                loadCompleteTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function adminRenameTeam(teamName) {
            const newName = prompt('Nhập tên mới cho đội ' + teamName + ':');
            if (!newName || newName === teamName) return;
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/rename', { method: 'PUT', body: { newName } });
                showToast('Đã đổi tên thành ' + newName, 'success');
                loadCompleteTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function deleteTeam(teamName) {
            try {
                await api('/api/teams/' + encodeURIComponent(teamName), { method: 'DELETE' });
                showToast('Đã xoá đội!', 'success');
                loadCompleteTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
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

        async function disbandTeam(id) {
            if (!requireAdminAuth()) return;
            if (!confirm('Xác nhận giải tán đội này?')) return;
            try {
                await api('/api/teams/' + id, { method: 'DELETE' });
                showToast('Đã giải tán đội!', 'success');
                loadPendingTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        // === WebSocket real-time ===
        let socket = null;
        if (typeof io !== 'undefined') {
            socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
            // socket connected
            socket.on('match:result', (data) => {
                showToast('Kết quả: ' + (data.winner || 'Hòa') + ' (' + (data.score1 || 0) + '-' + (data.score2 || 0) + ')', 'success');
                renderSchedule(); loadLeaderboard(); pulseTab('leaderboard-tab');
                if (data.round === 'semifinal' || data.round === 'final') {
                    if (!document.getElementById('bracket-tab')?.classList.contains('hidden')) loadBracket(); else pulseTab('bracket-tab');
                }
            });
            socket.on('match:created', (data) => {
                showToast('Trận mới: ' + data.team1Name + ' vs ' + data.team2Name, 'info');
                renderSchedule(); pulseTab('schedule-tab');
            });
            socket.on('matches:generated', (data) => {
                showToast('Đã tạo ' + data.count + ' trận!', 'success');
                renderSchedule();
            });
            socket.on('mvp:assigned', (data) => {
                showToast('MVP: ' + (data.playerName || data.discordId), 'success');
                loadLeaderboard(); pulseTab('leaderboard-tab');
            });
            socket.on('player:created', (data) => {
                showToast('Đăng ký mới: ' + data.displayName, 'info');
                loadLeaderboard(); loadAdminStats(); renderAdmin(); pulseTab('leaderboard-tab');
            });
            socket.on('checkin:updated', (data) => {
                showToast('Check-in: ' + data.count + ' người', 'info');
                renderSchedule(); pulseTab('schedule-tab');
            });
            socket.on('bracket:generated', () => {
                showToast('Đã tạo playoff!', 'success');
                if (document.getElementById('bracket-tab')?.classList.contains('hidden') === false) loadBracket();
            });
            socket.on('penalty:added', (data) => {
                showToast('Vi phạm: ' + (data.playerName || data.playerId), 'warning');
                if (apiToken && document.getElementById('admin-tab')?.classList.contains('hidden') === false) loadPenalties();
            });
            socket.on('score:report', (data) => {
                showToast('Có báo cáo kết quả mới!', 'info');
                if (apiToken && document.getElementById('admin-tab')?.classList.contains('hidden') === false) loadScoreReports();
            });
            socket.on('veto:update', (data) => {
                if (data.matchId === document.getElementById('veto-match-select')?.value) {
                    window.currentVetoData = data;
                    renderVetoBoard(data);
                }
            });
            socket.on('veto:reset', (data) => {
                if (data.matchId === document.getElementById('veto-match-select')?.value) {
                    window.currentVetoData = { phase: 0, maps: Object.fromEntries(MAP_LIST.map(m => [m, 'active'])), matchId: data.matchId, active: false };
                    renderVetoBoard(window.currentVetoData);
                    document.getElementById('veto-start-btn').classList.remove('hidden');
                    showToast('VETO đã được reset', 'info');
                }
            });
            socket.on('team:created', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
            });
            socket.on('team:approved', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
            });
            socket.on('joinRequest:created', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
            });
            socket.on('joinRequest:resolved', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
            });
            socket.on('dispute:created', () => {
                showToast('Có khiếu nại mới!', 'warning');
                if (apiToken) loadDisputes();
            });
            socket.on('dispute:updated', () => {
                if (apiToken) loadDisputes();
            });
            socket.on('kda:updated', (data) => {
                if (data.matchId && document.getElementById('match-detail-modal')?.classList.contains('hidden') === false) {
                    openMatchDetail(data.matchId);
                }
            });
            socket.on('score:report-resolved', (data) => {
                showToast(data?.status === 'approved' ? 'Báo cáo đã duyệt' : 'Báo cáo đã từ chối', 'info');
                renderSchedule(); loadLeaderboard(); pulseTab('leaderboard-tab');
                if (apiToken) loadScoreReports();
            });
            socket.on('teams:reload', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
                loadLeaderboard(); pulseTab('leaderboard-tab');
            });
            socket.on('team:deleted', () => {
                showToast('Một đội đã bị xoá', 'warning');
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) loadTeamsBrowser(); else pulseTab('teams-tab');
                loadLeaderboard(); pulseTab('leaderboard-tab');
            });
            socket.on('stream:casters', () => {
                if (!document.getElementById('stream-tab')?.classList.contains('hidden')) renderCasters();
            });
        }

        // === Stream Archive Functions ===
        async function loadStreamArchive() {
            try {
                const archive = await api('/api/stream/archive');
                const container = document.getElementById('stream-archive-list');
                const section = document.getElementById('stream-archive-section');
                if (!archive || archive.length === 0) {
                    if (section) section.classList.add('hidden');
                    return;
                }
                if (section) section.classList.remove('hidden');
                container.innerHTML = archive.map(m => `
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-video text-gray-500"></i>
                            <span class="text-xs text-white font-bold">${m.team1Name} vs ${m.team2Name}</span>
                            <span class="text-[10px] text-gray-400">${m.map || ''}</span>
                            <span class="text-[10px] text-gray-500">${m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('vi-VN') : ''}</span>
                        </div>
                        <a href="${m.streamUrl}" target="_blank" class="text-[10px] text-valCyan hover:text-white transition">
                            <i class="fa-solid fa-external-link"></i> Xem lại
                        </a>
                    </div>
                `).join('');
            } catch(e) {}
        }

        // === Stream Booth Functions ===
        let currentStreamSession = null;
        let currentStreamMatch = null;
        let streamCasters = [];

        async function loadStreamBooth() {
            showLoading('Đang tải stream...');
            try {
                const data = await api('/api/stream/current');
                hideLoading();
                if (data.live && data.match) {
                    currentStreamSession = data.session;
                    currentStreamMatch = data.match;
                    streamCasters = data.casters || [];
                    renderStreamLive();
                } else {
                    renderStreamIdle();
                }
                renderCasters();
                if (apiToken) {
                    document.getElementById('stream-admin-panel').classList.remove('hidden');
                    document.getElementById('stream-caster-admin').classList.remove('hidden');
                    document.getElementById('obs-widget-card')?.classList.remove('hidden');
                    document.getElementById('stream-embed-admin')?.classList.remove('hidden');
                    await loadStreamMatchSelect();
                    updateObsWidgetUrl();
                } else {
                    document.getElementById('obs-widget-card')?.classList.add('hidden');
                    document.getElementById('stream-embed-admin')?.classList.add('hidden');
                }
            } catch(e) {
                hideLoading();
                console.error('Stream load error:', e);
            }
        }

        function renderStreamIdle() {
            document.getElementById('stream-idle-state').classList.remove('hidden');
            document.getElementById('stream-live-state').classList.add('hidden');
            document.getElementById('stream-live-badge').textContent = 'LIVESTREAM CHƯA KÍCH HOẠT';
            document.getElementById('stream-live-badge').className = 'text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] font-mono';
            document.getElementById('stream-embed-placeholder').classList.remove('hidden');
            document.getElementById('stream-embed-active').classList.add('hidden');
            document.getElementById('stream-kda-container').innerHTML = '<div class="text-center text-gray-500 text-sm py-4"><i class="fa-solid fa-chart-line text-3xl mb-2"></i><p>Bắt đầu trận đấu để theo dõi KDA</p></div>';
        }

        function renderStreamLive() {
            const m = currentStreamMatch;
            if (!m) return;
            document.getElementById('stream-idle-state').classList.add('hidden');
            document.getElementById('stream-live-state').classList.remove('hidden');
            document.getElementById('stream-live-badge').textContent = '🔴 LIVE - ĐANG PHÁT SÓNG';
            document.getElementById('stream-live-badge').className = 'text-[10px] font-bold text-valCyan uppercase tracking-[0.2em] font-mono';
            document.getElementById('stream-team1-name').textContent = m.team1Name;
            document.getElementById('stream-team2-name').textContent = m.team2Name;
            document.getElementById('stream-score1').textContent = m.score1 || 0;
            document.getElementById('stream-score2').textContent = m.score2 || 0;
            document.getElementById('stream-match-map').innerHTML = '<i class="fa-solid fa-map mr-1"></i> ' + (m.map || 'Chưa chọn map');
            document.getElementById('stream-match-round').innerHTML = '<i class="fa-solid fa-layer-group mr-1"></i> ' + (m.round === 'semifinal' ? 'Bán Kết' : m.round === 'final' ? 'Chung Kết' : 'Vòng bảng');
            document.getElementById('stream-match-status').innerHTML = '<i class="fa-solid fa-circle text-emerald-400 mr-1"></i> Đang thi đấu';

            // Update control labels
            document.getElementById('stream-ctrl-team1-label').textContent = m.team1Name;
            document.getElementById('stream-ctrl-team2-label').textContent = m.team2Name;
            document.getElementById('stream-ctrl-score1').value = m.score1 || 0;
            document.getElementById('stream-ctrl-score2').value = m.score2 || 0;

            // OBS overlay
            document.getElementById('obs-team1').textContent = m.team1Name;
            document.getElementById('obs-team2').textContent = m.team2Name;
            document.getElementById('obs-score1').textContent = m.score1 || 0;
            document.getElementById('obs-score2').textContent = m.score2 || 0;
            document.getElementById('obs-map').textContent = 'MAP: ' + (m.map || 'TBD');
            document.getElementById('obs-round').textContent = 'VÒNG: ' + (m.round === 'semifinal' ? 'Bán Kết' : m.round === 'final' ? 'Chung Kết' : 'Bảng');
            updateObsCasters();

            // Show embed
            if (m.streamUrl) {
                embedStreamUrl(m.streamUrl);
            }

            // Load KDA
            loadStreamKDA();
        }

        function updateObsCasters() {
            const casterNames = streamCasters.map(c => c.name || '???').join(', ');
            document.getElementById('obs-casters').textContent = 'BLV: ' + (casterNames || '—');
        }

        function updateObsWidgetUrl() {
            const url = window.location.origin + '/?obs-widget=1';
            document.getElementById('obs-widget-url').textContent = url;
        }

        function copyObsWidgetUrl() {
            const el = document.createElement('textarea');
            el.value = document.getElementById('obs-widget-url').textContent;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast('Đã sao chép OBS Widget URL!', 'success');
        }

        function embedStreamUrl(url) {
            url = url || document.getElementById('stream-embed-url').value.trim();
            if (!url) return showToast('Nhập URL stream!', 'error');
            const placeholder = document.getElementById('stream-embed-placeholder');
            const active = document.getElementById('stream-embed-active');
            placeholder.classList.add('hidden');
            active.classList.remove('hidden');

            let embedHtml = '';
            let match;
            if ((match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)) || (match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/))) {
                embedHtml = `<iframe class="w-full aspect-video" src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe>`;
            } else if ((match = url.match(/twitch\.tv\/(\w+)/))) {
                embedHtml = `<iframe class="w-full aspect-video" src="https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}" allowfullscreen></iframe>`;
            } else {
                embedHtml = `<a href="${url}" target="_blank" class="text-valCyan hover:underline"><i class="fa-solid fa-video"></i> Mở Stream</a>`;
            }
            active.innerHTML = embedHtml;
            document.getElementById('stream-embed-url').value = url;
        }

        async function loadStreamMatchSelect() {
            try {
                const matches = await api('/api/matches');
                const pending = matches.filter(m => m.status === 'pending');
                const select = document.getElementById('stream-match-select');
                select.innerHTML = '<option value="">-- Chọn trận --</option>' +
                    pending.map(m => `<option value="${m.id}" ${currentStreamMatch?.id === m.id ? 'selected' : ''}>${m.team1Name} vs ${m.team2Name} ${m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('vi-VN') : ''}</option>`).join('');
            } catch(e) {}
        }

        async function startStream() {
            const matchId = document.getElementById('stream-match-select').value;
            if (!matchId) return showToast('Chọn trận đấu!', 'error');
            try {
                const data = await api('/api/stream/current', { method: 'PUT', body: { matchId } });
                currentStreamSession = data.session;
                currentStreamMatch = data.match;
                showToast('Đã bắt đầu stream: ' + data.match.team1Name + ' vs ' + data.match.team2Name, 'success');
                renderStreamLive();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function stopStream() {
            if (!currentStreamSession) return showToast('Không có stream nào!', 'error');
            try {
                await api('/api/stream/' + currentStreamSession.id + '/stop', { method: 'POST' });
                currentStreamSession = null;
                currentStreamMatch = null;
                showToast('Đã kết thúc stream!', 'success');
                renderStreamIdle();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function updateStreamScore() {
            if (!currentStreamMatch) return showToast('Không có trận đấu trực tiếp!', 'error');
            const score1 = parseInt(document.getElementById('stream-ctrl-score1').value) || 0;
            const score2 = parseInt(document.getElementById('stream-ctrl-score2').value) || 0;
            try {
                const updated = await api('/api/stream/current/score', {
                    method: 'PUT',
                    body: { matchId: currentStreamMatch.id, score1, score2 }
                });
                currentStreamMatch = updated;
                renderStreamLive();
                showToast('Đã cập nhật tỉ số: ' + updated.score1 + ' - ' + updated.score2, 'success');
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function loadStreamKDA() {
            if (!currentStreamMatch) return;
            try {
                const stats = await api('/api/teams/kda/' + currentStreamMatch.id);
                if (stats && stats.players && stats.players.length > 0) {
                    let html = '<div class="space-y-3">';
                    const team1players = stats.players.filter(p => p.teamNumber === 1);
                    const team2players = stats.players.filter(p => p.teamNumber === 2);

                    if (team1players.length > 0) {
                        html += '<h4 class="text-[10px] text-valCyan font-bold uppercase">' + (currentStreamMatch.team1Name || 'Đội 1') + '</h4>';
                        team1players.forEach(p => {
                            html += '<div class="flex items-center justify-between bg-valBg/60 border border-valCyan/20 p-2 rounded-lg text-xs"><span class="text-white">' + (p.playerName || '???') + '</span><span class="font-mono text-valCyan">' + (p.kills||0) + ' / ' + (p.deaths||0) + ' / ' + (p.assists||0) + '</span></div>';
                        });
                    }
                    if (team2players.length > 0) {
                        html += '<h4 class="text-[10px] text-valRed font-bold uppercase mt-2">' + (currentStreamMatch.team2Name || 'Đội 2') + '</h4>';
                        team2players.forEach(p => {
                            html += '<div class="flex items-center justify-between bg-valBg/60 border border-valRed/20 p-2 rounded-lg text-xs"><span class="text-white">' + (p.playerName || '???') + '</span><span class="font-mono text-valRed">' + (p.kills||0) + ' / ' + (p.deaths||0) + ' / ' + (p.assists||0) + '</span></div>';
                        });
                    }
                    html += '</div>';
                    document.getElementById('stream-kda-container').innerHTML = html;
                }
            } catch(e) {
                // No KDA data yet
            }
        }

        async function addCaster() {
            const name = document.getElementById('caster-name-input').value.trim();
            const discordId = document.getElementById('caster-discord-input').value.trim();
            const role = document.getElementById('caster-role-select').value;
            if (!name) return showToast('Nhập tên BLV!', 'error');
            try {
                const caster = await api('/api/stream/casters', { method: 'POST', body: { name, discordId, role } });
                document.getElementById('caster-name-input').value = '';
                document.getElementById('caster-discord-input').value = '';
                showToast('Đã thêm BLV: ' + name, 'success');
                renderCasters();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function deleteCaster(id) {
            try {
                await api('/api/stream/casters/' + id, { method: 'DELETE' });
                showToast('Đã xóa BLV!', 'success');
                renderCasters();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function renderCasters() {
            try {
                const casters = await api('/api/stream/casters');
                streamCasters = casters;

                // Main list
                const list = document.getElementById('stream-casters-list');
                if (casters.length === 0) {
                    list.innerHTML = '<div class="text-center text-gray-500 text-xs py-3"><i class="fa-solid fa-user-plus text-xl mb-2"></i><p>Chưa có BLV</p></div>';
                } else {
                    list.innerHTML = casters.map(c => {
                        const roleIcon = c.role === 'analyst' ? 'fa-chart-bar' : c.role === 'host' ? 'fa-star' : c.role === 'interviewer' ? 'fa-question' : 'fa-microphone';
                        const roleColors = { caster: 'text-purple-400', analyst: 'text-blue-400', host: 'text-yellow-400', interviewer: 'text-emerald-400' };
                        return '<div class="flex items-center gap-3 bg-valBg/60 border border-gray-800 p-3 rounded-xl">' +
                            '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">' + (c.name.charAt(0).toUpperCase()) + '</div>' +
                            '<div class="flex-1"><span class="text-white font-bold text-xs block">' + c.name + '</span><span class="text-[10px] ' + (roleColors[c.role] || 'text-gray-400') + '"><i class="fa-solid ' + roleIcon + ' mr-1"></i>' + (c.role === 'analyst' ? 'Chuyên Gia' : c.role === 'host' ? 'MC' : c.role === 'interviewer' ? 'Phóng Viên' : 'BLV Chính') + '</span></div>' +
                            (apiToken ? '<button onclick="deleteCaster(\'' + c.id + '\')" class="text-gray-500 hover:text-valRed text-xs"><i class="fa-solid fa-trash"></i></button>' : '') +
                            '</div>';
                    }).join('');
                }

                // Admin caster management list
                if (apiToken) {
                    const adminList = document.getElementById('caster-list-admin');
                    adminList.innerHTML = casters.map(c => '<div class="flex items-center justify-between bg-valBg/40 border border-gray-800 p-2 rounded-lg text-xs"><span class="text-white">' + c.name + '</span><button onclick="deleteCaster(\'' + c.id + '\')" class="text-gray-500 hover:text-valRed"><i class="fa-solid fa-xmark"></i></button></div>').join('');
                }

                updateObsCasters();
            } catch(e) {}
        }

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
            if (id === 'stream-tab') {
                await loadStreamBooth();
                loadStreamArchive();
                if (socket && currentStreamSession) {
                    socket.emit('stream:join', currentStreamSession.id);
                }
            }
            if (id === 'admin-tab') {
                if (!apiToken) { _adminModalAllowed = true; openAdminLoginModal(); return; }
                loadPendingTeams(); renderAdmin();
                loadScoreReports();
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
                if (el.textContent.includes('21') && el.textContent.includes('TRẦN')) {
                    el.style.cursor = 'pointer';
                    el.title = 'Giới hạn 21 điểm cho 5 người — bấm để xem luật';
                    el.addEventListener('click', function() {
                        showToast('🏆 Luật trần điểm: Tổng điểm 5 thành viên không được vượt quá 21 điểm!', 'info', 5000);
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

        document.addEventListener('DOMContentLoaded', function() {
            checkDiscordAuth();
            const params = new URLSearchParams(window.location.search);
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
        async function initNotifications() {
            const bell = document.getElementById('notif-bell');
            if (!bell) return;
            bell.classList.remove('hidden');
            try {
                notifs = await api('/api/notify/in-app');
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
        function updateNotifBadge() {
            const badge = document.getElementById('notif-badge');
            if (!badge) return;
            if (notifCount > 0) {
                badge.classList.remove('hidden');
                badge.textContent = notifCount > 99 ? '99+' : notifCount;
            } else { badge.classList.add('hidden'); }
        }
        function toggleNotifPanel() {
            const panel = document.getElementById('notif-panel');
            if (panel.classList.contains('hidden')) {
                renderNotifList();
                panel.classList.remove('hidden');
            } else { panel.classList.add('hidden'); }
        }
        function renderNotifList() {
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
        function markAllNotifRead() {
            if (notifs.length > 0) {
                localStorage.setItem('evan_last_notif_id', notifs[0].id);
                notifCount = 0;
                updateNotifBadge();
            }
            document.getElementById('notif-panel').classList.add('hidden');
        }
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

        // Guide schedule detail popup
        const guideSteps = [
            { title: 'Mở Đăng Ký Giải', time: 'Đến 23:59 ngày 07/07', icon: 'fa-pen-to-square', color: 'valRed',
              desc: 'Tuyển thủ điền thông tin tại tab Form Đăng Ký. Yêu cầu đăng nhập Discord + Riot ID hợp lệ.',
              details: ['Đăng nhập Discord để bắt đầu', 'Điền Riot ID + rank hiện tại', 'Đăng ký theo hình thức Solo/Duo/Trio', 'Admin kiểm duyệt thông tin', 'Nhận Role Thi Đấu trên Discord'],
              action: { label: 'Đăng Ký Ngay', tab: 'register-tab' } },
            { title: 'Chốt Danh Sách Đội', time: '20h ngày 08/07', icon: 'fa-shuffle', color: 'valCyan',
              desc: 'Ban tổ chức chốt danh sách đội dựa trên rank và vị trí. Hệ thống tự động cân bằng để đảm bảo công bằng.',
              details: ['Draft ngẫu nhiên có kiểm soát', 'Cân bằng rank giữa các đội', 'Công bố danh sách trên Discord', 'Đội trưởng nhận quyền quản lý đội', 'Thời hạn đăng ký kết thúc'],
              action: null },
            { title: 'Khởi Tranh Vòng Bảng', time: '11-12/07 · 14:00', icon: 'fa-gamepad', color: 'gray-700',
              desc: 'Các đội thi đấu vòng tròn BO1. Hai đội có điểm số cao nhất mỗi bảng giành vé vào Bán Kết.',
              details: ['Thi đấu theo thể thức BO1', 'Tính điểm theo kết quả thắng/thua', 'Top 2 đội mỗi bảng đi tiếp', 'Có ban pick map trước trận', 'Trọng tài giám sát trực tiếp'],
              action: { label: 'Xem Lịch Đấu', tab: 'schedule-tab' } },
            { title: 'Bán Kết & Chung Kết', time: null, icon: 'fa-trophy', color: 'yellow-500',
              desc: 'Vòng loại trực tiếp. Trận chung kết BO3 phát sóng trực tiếp kèm BLV trên kênh Discord.',
              details: ['Bán Kết: BO3 loại trực tiếp', 'Tranh giải Ba: BO3', 'Chung Kết: BO3', 'Phát sóng trực tiếp với BLV', 'Công bố kết quả và trao thưởng'],
              action: null }
        ];
        function openGuidePopup(step) {
            const s = guideSteps[step - 1];
            if (!s) return;
            const popup = document.getElementById('guide-detail-modal');
            document.getElementById('gd-icon').className = 'fa-solid ' + s.icon + ' text-3xl text-' + s.color;
            document.getElementById('gd-title').textContent = s.title;
            document.getElementById('gd-time').textContent = s.time || 'Đang cập nhật';
            document.getElementById('gd-desc').textContent = s.desc;
            document.getElementById('gd-list').innerHTML = s.details.map(d => '<li class="flex items-center gap-2 text-sm text-gray-400"><i class="fa-solid fa-check text-valCyan text-[10px]"></i>' + d + '</li>').join('');
            const actionDiv = document.getElementById('gd-action');
            if (s.action) {
                actionDiv.innerHTML = '<button onclick="closeGuidePopup();switchTab(\'' + s.action.tab + '\')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition bg-valRed text-white hover:bg-red-600">' + s.action.label + '</button>';
                actionDiv.classList.remove('hidden');
            } else {
                actionDiv.classList.add('hidden');
            }
            popup.classList.remove('hidden');
        }
        function closeGuidePopup() {
            document.getElementById('guide-detail-modal').classList.add('hidden');
        }
