        const API = window.location.origin;
        let apiToken = localStorage.getItem('evan_api_token');
        let apiPlayerCache = [];

        async function api(endpoint, opts = {}) {
          const headers = { 'Content-Type': 'application/json' };
          if (apiToken) headers['Authorization'] = 'Bearer ' + apiToken;
          if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
          const res = await fetch(API + endpoint, { credentials: 'include', ...opts, headers: { ...headers, ...opts.headers } });
          if (!res.ok) { let err; try { err = await res.json(); } catch(e) { err = { error: 'HTTP ' + res.status }; } throw new Error(err.error || 'Lỗi kết nối'); }
          if (res.status === 204) return null;
          return res.json();
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
            document.getElementById('help-modal').classList.toggle('hidden');
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
        }
        document.addEventListener('DOMContentLoaded', initGuideInteractions);

        function showToast(msg, type='info') {
            const container = document.getElementById('toast-container');
            const el = document.createElement('div');
            el.className = `p-3 rounded-xl border-l-4 ${type==='success'?'border-valCyan bg-valCard':'border-valRed bg-valCard'} shadow-2xl flex items-center gap-3 w-72 text-xs text-white translate-x-10 opacity-0 transition-all duration-300`;
            el.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check text-valCyan':'fa-exclamation-circle text-valRed'}"></i><span>${msg}</span>`;
            container.appendChild(el);
            setTimeout(() => el.classList.remove('translate-x-10', 'opacity-0'), 10);
            setTimeout(() => { el.classList.add('opacity-0'); setTimeout(()=>el.remove(), 300); }, 3000);
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

        async function openProfile(discordId) {
            document.getElementById('profile-modal').classList.remove('hidden');
            document.getElementById('profile-name').textContent = 'Đang tải...';
            try {
                const data = await api('/api/players/' + discordId + '/profile');
                const p = data.player;
                document.getElementById('profile-name').textContent = p.displayName + ' — Hồ Sơ';

                // Info
                document.getElementById('profile-info').innerHTML =
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">Discord ID</span><span class="text-white font-bold">' + (p.discordId || '—') + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">Rank</span><span class="text-white font-bold">' + (p.rank || '—') + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">Elo</span><span class="text-yellow-400 font-bold text-base">' + p.elo + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">Vai trò</span><span class="text-white font-bold">' + (p.role || '—') + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">W / L</span><span class="text-emerald-400 font-bold">' + p.wins + '</span><span class="text-gray-500 mx-1">/</span><span class="text-red-400 font-bold">' + p.losses + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">MVP</span><span class="text-yellow-400 font-bold text-base">' + p.mvps + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">Đội</span><span class="text-valCyan font-bold">' + (p.teamId || 'Tự do') + '</span></div>' +
                    '<div class="bg-valBg border border-gray-800 p-3 rounded-xl"><span class="text-gray-500 block">KDA</span><span class="text-white font-bold">' + data.kda.kills + ' / ' + data.kda.deaths + ' / ' + data.kda.assists + '</span></div>';

                // Charts
                destroyProfileCharts();
                const kdaCanvas = document.getElementById('kda-chart');
                if (typeof Chart !== 'undefined' && kdaCanvas) {
                    profileChartInstances.kda = new Chart(kdaCanvas, {
                        type: 'bar', data: {
                            labels: ['Kills', 'Deaths', 'Assists'],
                            datasets: [{
                                data: [data.kda.kills, data.kda.deaths, data.kda.assists],
                                backgroundColor: ['#00f2fe', '#ff4655', '#eab308'],
                                borderRadius: 4
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } } }
                    });
                }

                const wlCanvas = document.getElementById('wl-chart');
                if (typeof Chart !== 'undefined' && wlCanvas) {
                    profileChartInstances.wl = new Chart(wlCanvas, {
                        type: 'doughnut', data: {
                            labels: ['Thắng', 'Thua'],
                            datasets: [{ data: [p.wins, p.losses], backgroundColor: ['#00f2fe', '#ff4655'], borderWidth: 0 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } } } }
                    });
                }

                const eloCanvas = document.getElementById('elo-chart');
                if (typeof Chart !== 'undefined' && eloCanvas && data.eloHistory.length > 1) {
                    profileChartInstances.elo = new Chart(eloCanvas, {
                        type: 'line', data: {
                            labels: data.eloHistory.map(e => new Date(e.createdAt).toLocaleDateString('vi-VN')),
                            datasets: [{
                                data: data.eloHistory.map(e => e.elo),
                                borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.1)',
                                fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#00f2fe'
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: Math.min(...data.eloHistory.map(e=>e.elo)) - 50 || 0, ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af', maxTicksLimit: 8 } } } }
                    });
                } else if (eloCanvas) {
                    eloCanvas.parentElement.innerHTML = '<p class="text-gray-500 text-center py-4">Chưa có dữ liệu Elo</p>';
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

                // H2H opponent input
                document.getElementById('h2h-opponent').dataset.myDiscord = discordId;

            } catch(e) {
                document.getElementById('profile-name').textContent = 'Lỗi';
                document.getElementById('profile-content').innerHTML = '<p class="text-red-400">' + e.message + '</p>';
            }
        }

        async function loadH2H() {
            const myId = document.getElementById('h2h-opponent').dataset.myDiscord;
            const oppId = document.getElementById('h2h-opponent').value.trim();
            const container = document.getElementById('h2h-result');
            if (!oppId) { container.innerHTML = '<p class="text-gray-500">Nhập Discord ID đối thủ</p>'; return; }
            try {
                const me = await api('/api/players/' + myId + '/profile');
                const opp = await api('/api/players/' + oppId + '/profile');
                const t1 = me.player.teamId, t2 = opp.player.teamId;
                if (!t1 || !t2) { container.innerHTML = '<p class="text-gray-500">Một trong hai không có đội</p>'; return; }
                const data = await api('/api/matches/h2h/' + encodeURIComponent(t1) + '/' + encodeURIComponent(t2));
                container.innerHTML =
                    '<div class="flex items-center justify-around mt-2 text-center">' +
                    '<div><span class="text-valCyan font-bold text-sm">' + data.t1Wins + '</span><span class="text-gray-500 block text-[10px]">' + me.player.displayName + '</span></div>' +
                    '<div><span class="text-gray-500 text-lg font-bold">—</span></div>' +
                    '<div><span class="text-red-400 font-bold text-sm">' + data.t2Wins + '</span><span class="text-gray-500 block text-[10px]">' + opp.player.displayName + '</span></div>' +
                    '</div>' +
                    '<div class="text-center text-gray-500 text-[10px] mt-1">' + data.matches.length + ' trận · ' + data.draws + ' hòa</div>';
            } catch(e) {
                container.innerHTML = '<p class="text-red-400 text-center">' + e.message + '</p>';
            }
        }

        // Bảo mật 2 lớp chống tuyển thủ tự động gọi Tab Admin từ URL hoặc console
        function switchTab(id) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
            
            document.querySelectorAll('.tab-btn').forEach(btn => { 
                btn.classList.remove('bg-valRed', 'text-white', 'glow-red'); 
                btn.classList.add('text-gray-400'); 
            });
            
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.classList.remove('text-gray-400'); 
                btn.classList.add('bg-valRed', 'text-white', 'glow-red');
            }
        }

        // Quản lý Đăng Nhập & Đăng Xuất Admin an toàn
        function openAdminLoginModal() { 
            document.getElementById('admin-password-input').value = "";
            document.getElementById('admin-login-modal').classList.remove('hidden'); 
        }
        
        function closeAdminLoginModal() { 
            document.getElementById('admin-login-modal').classList.add('hidden'); 
        }
        
        async function checkAdminPassword() {
            const pin = document.getElementById('admin-password-input').value;
            try {
                await apiLogin('evan', pin);
                document.getElementById('btn-admin-tab').classList.remove('hidden');
                document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập`;
                closeAdminLoginModal();
                switchTab('admin-tab');
                await syncLocalToAPI();
                await loadPlayers();
                renderAdmin();
                showToast("Đăng nhập quyền Admin thành công!", "success");
            } catch(e) {
                showToast("Sai mật khẩu! Gợi ý: mật khẩu admin được tạo bằng script create-admin.js (mặc định: evankk123)", "error");
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
                if (state === 'ban') { cls += 'map-banned'; overlay = '<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"><i class="fa-solid fa-xmark text-4xl text-red-400 mb-1"></i><span class="text-[9px] bg-red-500/80 text-white px-2 py-0.5 rounded font-black">CẤM</span></div>'; }
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
            const t = document.getElementById('reg-type').value;
            let pts = rankPointsMap[document.getElementById('reg-rank').value] || 0;
            if(t === 'Duo') pts += rankPointsMap[document.getElementById('t1-rank').value] || 0;
            if(t === 'Trio') pts += (rankPointsMap[document.getElementById('t1-rank').value] || 0) + (rankPointsMap[document.getElementById('t2-rank').value] || 0);
            
            const limit = t === 'Duo' ? 9 : t === 'Trio' ? 13 : 8;
            document.getElementById('form-points-badge').innerText = pts + 'đ';
            document.getElementById('form-points-badge').className = `text-2xl font-black font-mono px-4 py-1.5 rounded-lg ${pts > limit ? 'text-valRed bg-valRed/10 border border-valRed/30 animate-pulse' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'}`;
            document.getElementById('form-points-rules').textContent = '(Giới hạn: Solo ≤8đ · Duo ≤9đ · Trio ≤13đ — Cả đội 5 người ≤21đ)';
        }

        function toggleTeamInputs() {
            const t = document.getElementById('reg-type').value;
            const div = document.getElementById('teammate-fields');
            if(t === 'Solo') { div.innerHTML = ''; div.classList.add('hidden'); }
            else {
                div.classList.remove('hidden');
                let h = `<h4 class="text-[11px] font-bold text-valCyan uppercase border-b border-gray-800 pb-2"><i class="fa-solid fa-users"></i> Thông Tin Nhóm</h4>`;
                h += getTeammateHTML(1);
                if(t === 'Trio') h += getTeammateHTML(2);
                div.innerHTML = h;
            }
            updateFormPoints();
        }

        function getTeammateHTML(num) {
            return `<div class="grid grid-cols-2 gap-3 mt-3">
                <div><label class="block text-[10px] text-gray-400 uppercase mb-1">Riot ID Đồng Đội ${num}</label><input type="text" class="w-full bg-valBg border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none"></div>
                <div><label class="block text-[10px] text-gray-400 uppercase mb-1">Rank Đồng Đội ${num}</label><select id="t${num}-rank" onchange="updateFormPoints()" class="w-full bg-valBg border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none"><option value="Iron (Sắt)">Iron (Sắt) — 1đ</option><option value="Bronze (Đồng)">Bronze (Đồng) — 2đ</option><option value="Silver (Bạc)">Silver (Bạc) — 3đ</option><option value="Gold (Vàng)" selected>Gold (Vàng) — 4đ</option><option value="Platinum (Bạch Kim)">Platinum (Bạch Kim) — 5đ</option><option value="Diamond (Kim Cương)">Diamond (Kim Cương) — 6đ</option><option value="Ascendant (Thượng Nhân)">Ascendant (Thượng Nhân) — 7đ</option><option value="Immortal (Bất Tử)">Immortal (Bất Tử) — 8đ</option></select></div>
            </div>`;
        }

        async function autoFillRegisterForm() {
            const status = document.getElementById('register-discord-status');
            const discordInput = document.getElementById('reg-discord');
            const discordIdInput = document.getElementById('reg-discord-id');
            const helpIcon = document.getElementById('reg-discord-id-help');
            const submitBtn = document.getElementById('reg-submit-btn');
            const editSection = document.getElementById('player-edit-section');

            discordInput.disabled = false;
            discordInput.required = true;
            discordInput.classList.remove('opacity-60', 'cursor-not-allowed');
            discordIdInput.disabled = false;
            discordIdInput.required = true;
            discordIdInput.classList.remove('opacity-60', 'cursor-not-allowed');
            if (helpIcon) helpIcon.classList.remove('hidden');
            status.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class=\"fa-solid fa-paper-plane mr-2\"></i>Gửi Đơn Lên Phòng Duyệt';
            if (editSection) {
                editSection.classList.remove('hidden');
                const editNotice = document.getElementById('edit-discord-notice');
                const editForm = document.getElementById('edit-player-form');
                const editSearchRow = editSection.querySelector('.flex.gap-2');
                if (discordUser) {
                    document.getElementById('edit-discord-id').value = discordUser.discordId;
                    document.getElementById('edit-discord-id').disabled = true;
                    if (editNotice) editNotice.classList.add('hidden');
                    if (editSearchRow) editSearchRow.classList.remove('hidden');
                    if (editForm) editForm.classList.remove('hidden');
                } else {
                    document.getElementById('edit-discord-id').value = '';
                    document.getElementById('edit-discord-id').disabled = false;
                    if (editNotice) editNotice.classList.remove('hidden');
                    if (editSearchRow) editSearchRow.classList.add('hidden');
                    if (editForm) editForm.classList.add('hidden');
                }
            }

            if (!discordUser) {
                status.className = 'mb-4 p-4 rounded-xl border text-sm bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
                status.innerHTML = '<div class="flex items-center gap-3"><i class="fa-solid fa-shield-halved text-xl"></i><div><strong class="block">Cần đăng nhập Discord</strong><span class="text-xs text-yellow-400/80">Bấm nút <b class="text-white">Đăng Nhập</b> góc phải trên cùng để xác minh, sau đó mới gửi được đơn.</span></div></div>';
                status.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-brands fa-discord mr-2"></i>Đăng Nhập Discord Trước';
                submitBtn.onclick = function(e) { e.preventDefault(); loginDiscord(); };
                return;
            }
            submitBtn.onclick = null;

            discordInput.value = discordUser.discordUsername;
            discordIdInput.value = discordUser.discordId;
            discordInput.disabled = true;
            discordInput.required = false;
            discordInput.classList.add('opacity-60', 'cursor-not-allowed');
            discordIdInput.disabled = true;
            discordIdInput.required = false;
            discordIdInput.classList.add('opacity-60', 'cursor-not-allowed');
            if (helpIcon) helpIcon.classList.add('hidden');

            // show Discord avatar
            const ava = document.getElementById('reg-discord-avatar');
            if (ava && discordUser.discordAvatar) {
                ava.src = 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png?size=64';
                ava.classList.remove('hidden');
            }

            try {
                const existing = await api('/api/players/lookup/' + discordUser.discordId);
                status.className = 'mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                status.innerHTML = '<i class=\"fa-solid fa-circle-check\"></i> Bạn đã đăng ký với tên <strong>' + existing.displayName + '</strong> (Rank: ' + existing.rank + ') <button onclick="switchTab(\'profile-tab\')" class="ml-2 text-[10px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-2 py-0.5 rounded-lg font-bold hover:bg-valCyan/30 transition">Xem Hồ Sơ</button>';
                status.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class=\"fa-solid fa-check mr-2\"></i>Đã Đăng Ký';
            } catch (e) {
                status.className = 'mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 bg-valCyan/10 border-valCyan/30 text-valCyan';
                status.innerHTML = '<i class=\"fa-solid fa-info-circle\"></i> Thông tin Discord đã được tự động điền';
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
                const rankSelect = document.getElementById('reg-rank');
                for (let opt of rankSelect.options) {
                    if (opt.value === data.rank) { rankSelect.value = data.rank; break; }
                }
                rankSelect.disabled = true;
                rankSelect.classList.add('opacity-60', 'cursor-not-allowed');
                updateFormPoints();
                const peakLabel = data.peakRank ? `Peak: ${data.peakRank} · Current: ${data.currentRank}` : data.currentRank;
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
            const discordName = discordUser ? discordUser.discordUsername : document.getElementById('reg-discord').value;
            const discordId = discordUser ? discordUser.discordId : document.getElementById('reg-discord-id').value;
            const d = { 
                discord: discordName,
                discordId: discordId,
                id: document.getElementById('reg-riotid').value,
                rank: document.getElementById('reg-rank').value,
                role: document.getElementById('reg-role').value,
                type: document.getElementById('reg-type').value,
                pts: parseInt(document.getElementById('form-points-badge').innerText) || 3
            };
            const body = {
                displayName: d.discord,
                discordId: d.discordId,
                riotId: d.id,
                rank: d.rank,
                role: d.role,
                type: d.type,
                pts: d.pts
            };
            try {
                await api('/api/players', { method: 'POST', body });
                showToast('Đăng ký thành công!', 'success');
                document.getElementById('registration-form').reset();
                document.getElementById('form-points-badge').innerText = '3';
                autoFillRegisterForm();
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
            document.getElementById('player-list-count').innerText = filtered.length;
            document.getElementById('player-count-badge').innerText = list.length; if (document.getElementById('admin-player-count-badge')) document.getElementById('admin-player-count-badge').innerText = list.length;
            const c = document.getElementById('player-list-container'); c.innerHTML='';
            
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
                c.innerHTML += `<div class="bg-valBg/80 rounded-lg border border-gray-800 ${drafted?'opacity-50':''}">
                    <div class="flex justify-between items-center p-2.5 cursor-pointer" onclick="document.getElementById('player-detail-${idx}').classList.toggle('hidden')">
                        <div class="flex items-center gap-2">
                            ${avatarUrl ? `<img src="${avatarUrl}" class="w-6 h-6 rounded-full border border-gray-700" onerror="this.style.display='none'">` : `<div class="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-600"><i class="fa-solid fa-user"></i></div>`}
                            <span class="bg-gray-800 text-[10px] px-1.5 rounded text-gray-300 font-bold">${p.pts}đ</span>
                            <span class="text-xs font-bold text-white">${name}</span>
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
                            <span class="flex items-center gap-1"><span class="text-gray-500">Discord:</span> <span class="text-white" title="Discord ID">${p.discordId || 'N/A'}</span></span>
                            <span class="flex items-center gap-1"><span class="text-gray-500">Riot:</span> <span class="text-white">${riotId}</span></span>
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
        function renderSchedule() {
            const controls = document.getElementById('admin-schedule-controls');
            if (apiToken && controls) {
                controls.innerHTML = `<div class="mb-6 bg-valBg/50 p-4 rounded-xl border border-gray-800">
                    <h4 class="text-sm font-bold text-valCyan mb-3 uppercase">Tạo lịch tự động</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Danh sách đội (cách xuống dòng)</label>
                        <textarea id="sched-teams" rows="3" placeholder="Đội A" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></textarea></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Ngày bắt đầu</label>
                        <input type="date" id="sched-date" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Phút/trận</label>
                        <input type="number" id="sched-duration" value="60" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
                        <div><label class="text-[10px] text-gray-400 uppercase block mb-1">&nbsp;</label>
                        <button onclick="generateSchedule()" class="w-full bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
                        <i class="fa-solid fa-gear mr-1"></i>Tạo lịch</button></div>
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
                        const timeId = 'time-panel-' + m.id;
                        const checkinId = 'checkin-panel-' + m.id;
                        html += `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team1Name.replace(/'/g, "\\'")}')">${m.team1Name}</span>
                                    <span class="text-gray-500 text-xs">vs</span>
                                    <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();openTeamDetail('${m.team2Name.replace(/'/g, "\\'")}')">${m.team2Name}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-gray-400 font-mono">${time}</span>
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
  const fmt = document.getElementById('sched-format')?.value || 'round-robin';
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
            const fmt = document.getElementById('sched-format')?.value || 'round-robin';

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
                    `<tr class="border-b border-gray-800/50 cursor-pointer hover:bg-valBg/50" onclick="openProfile(${JSON.stringify(p.discordId)})">
                        <td class="py-2.5 px-3 text-center font-bold ${p.rank <= 3 ? 'text-yellow-400 text-sm' : 'text-gray-400'}">${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : '#' + p.rank}</td>
                        <td class="py-2.5 px-3 font-bold text-valCyan hover:text-white transition">${p.displayName}</td>
                        <td class="py-2.5 px-3 text-center text-yellow-400 font-bold font-mono">${p.elo}</td>
                        <td class="py-2.5 px-3 text-center text-gray-300">${p.rankName}</td>
                        <td class="py-2.5 px-3 text-center text-emerald-400 font-bold">${p.wins}</td>
                        <td class="py-2.5 px-3 text-center text-red-400">${p.losses}</td>
                        <td class="py-2.5 px-3 text-center text-yellow-400">${p.mvps}</td>
                        <td class="py-2.5 px-3 text-center">${p.teamId ? `<span class="team-link text-[10px] text-valCyan cursor-pointer hover:text-white" onclick="event.stopPropagation();openTeamDetail('${p.teamId.replace(/'/g, "\\'")}')">${p.teamId}</span>` : '<span class="text-[10px] text-gray-600">-</span>'}</td>
                    </tr>`
                ).join('');
            } catch(e) {
                hideLoading();
                document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Chưa có dữ liệu</td></tr>';
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
                    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Chưa có kết quả trận đấu</div>';
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
            document.getElementById('profile-edit-modal').classList.remove('hidden');
        }
        function closeProfileEdit() {
            document.getElementById('profile-edit-modal').classList.add('hidden');
        }
        async function saveProfileEdit() {
            const body = {};
            const displayName = document.getElementById('pe-display-name').value.trim();
            const riotId = document.getElementById('pe-riot-id').value.trim();
            const rank = document.getElementById('pe-rank').value;
            const role = document.getElementById('pe-role').value;
            if (displayName) body.displayName = displayName;
            if (riotId) body.riotId = riotId;
            if (rank) body.rank = rank;
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
                    rosterEl.innerHTML = data.roster.map(r => `<div class="bg-valBg/60 border border-gray-800 p-2 rounded-lg text-center">
                        <p class="text-[10px] text-white font-bold truncate" title="${r.displayName}">${r.displayName}</p>
                        <p class="text-[9px] text-gray-500">${r.rank || ''}</p>
                        <p class="text-[9px] text-gray-500">${r.role || ''}</p>
                        <p class="text-[10px] text-yellow-400 font-mono font-bold">${r.elo}</p>
                    </div>`).join('');
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
                        upcomingDiv.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Không có trận sắp tới</p>';
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
                        historyDiv.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Chưa có trận nào</p>';
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
                    : '<p class="text-center text-gray-500 text-sm py-4">Không có trận sắp tới</p>';
                const historyDiv = document.getElementById('dashboard-history');
                const history = matches.filter(m => m.status === 'completed');
                historyDiv.innerHTML = history.length > 0
                    ? history.map(m => {
                        const rClass = m.result === 'win' ? 'text-emerald-400' : 'text-red-400';
                        return `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl flex justify-between"><div class="flex items-center gap-2"><span class="font-bold text-white text-sm">${m.team1Name}</span><span class="font-black text-lg font-mono ${rClass}">${m.score1} - ${m.score2}</span><span class="font-bold text-white text-sm">${m.team2Name}</span><span class="text-[10px] ${rClass} font-bold uppercase">${m.result}</span></div><span class="text-[10px] text-gray-500">${m.map || ''}</span></div>`;
                    }).join('')
                    : '<p class="text-center text-gray-500 text-sm py-4">Chưa có trận nào</p>';
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
                if (pending.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-4">Không có báo cáo chờ duyệt</p>'; return; }
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
                if (pending.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-2">Không có khiếu nại</p>'; return; }
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
                    <div class="flex justify-between items-center bg-valCard/40 p-2 rounded-lg border border-gray-800">
                        <span class="text-gray-200 font-medium">${p.displayName}</span>
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
        async function loadTeamsBrowser() {
            const container = document.getElementById('teams-list');
            if (!container) return;
            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Đang tải...</div>';
            try {
                const teams = await api('/api/teams/all');
                document.getElementById('teams-count').textContent = teams.length + ' đội';
                if (teams.length === 0) {
                    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">Chưa có đội nào được tạo</div>';
                    return;
                }
                const myPlayer = discordUser ? await api('/api/players/lookup/' + discordUser.discordId).catch(() => null) : null;
                const myTeamName = myPlayer?.teamId || null;
                let html = '';
                for (const team of teams) {
                    const roster = JSON.parse(team.rosterJson || '[]');
                    const isCaptain = discordUser && team.captainDiscordId === discordUser.discordId;
                    const isMember = myTeamName === team.name;
                    const canJoin = discordUser && myPlayer && !myTeamName && team.status === 'approved' && roster.length < 5 && !isCaptain;
                    const reqCount = team._reqCount || 0;
                    html += '<div class="bg-valCard border border-gray-800 rounded-2xl p-5 hover-scale">';
                    html += '<div class="flex items-center justify-between mb-3">';
                    html += '<div><h4 class="text-white font-bold text-base">' + escHtml(team.name) + '</h4>';
                    html += '<span class="text-[10px] ' + (team.status === 'approved' ? 'text-emerald-400' : 'text-amber-400') + ' font-mono">' + (team.status === 'approved' ? 'Đã duyệt' : team.status === 'pending' ? 'Chờ duyệt' : 'Từ chối') + '</span></div>';
                    html += '<span class="text-[10px] text-gray-500 font-mono">' + roster.length + '/5 thành viên</span></div>';
                    html += '<div class="space-y-1.5 mb-3">';
                    for (const rid of roster) {
                        const p = await api('/api/players/lookup/' + rid).catch(() => null);
                        const name = p ? p.displayName : rid;
                        const isCap = rid === team.captainDiscordId;
                        html += '<div class="flex items-center gap-2 bg-valBg/60 p-2 rounded-lg text-xs"><i class="fa-solid fa-user text-gray-500"></i><span class="text-gray-300">' + escHtml(name) + '</span>' + (isCap ? '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded font-bold">ĐT</span>' : '') + '</div>';
                    }
                    if (roster.length < 5) {
                        for (let i = roster.length; i < 5; i++) {
                            html += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-800 p-2 rounded-lg text-xs text-gray-600"><i class="fa-solid fa-plus"></i><span>Trống</span></div>';
                        }
                    }
                    html += '</div>';
                    html += '<div class="flex gap-2">';
                    if (canJoin) {
                        html += '<button onclick="sendJoinRequest(\'' + team.name + '\')" class="flex-1 text-[11px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-hand mr-1"></i>Xin Vào Đội</button>';
                    }
                    if (isMember) {
                        html += '<button disabled class="flex-1 text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-bold"><i class="fa-solid fa-check mr-1"></i>Đã Trong Đội</button>';
                    }
                    if (isCaptain) {
                        html += '<button onclick="loadCaptainDashboard()" class="flex-1 text-[11px] bg-amber-500/20 text-amber-400 border border-amber-400/30 px-3 py-2 rounded-lg font-bold hover:bg-amber-500/30 transition"><i class="fa-solid fa-crown mr-1"></i>Quản Lý' + (reqCount > 0 ? ' <span class="bg-red-500 text-white text-[8px] px-1.5 rounded-full">' + reqCount + '</span>' : '') + '</button>';
                    }
                    html += '</div></div>';
                }
                container.innerHTML = html;
            } catch(e) {
                container.innerHTML = '<div class="col-span-full text-center py-12 text-red-400">Lỗi tải danh sách đội: ' + e.message + '</div>';
            }
        }

        async function sendJoinRequest(teamName) {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/join', { method: 'POST' });
                showToast('Đã gửi đơn xin vào đội ' + teamName + '! Chờ đội trưởng duyệt.', 'success');
                loadTeamsBrowser();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        async function loadCaptainDashboard() {
            if (!discordUser) return showToast('Cần đăng nhập Discord!', 'error');
            try {
                const teams = await api('/api/teams/all');
                const myTeams = teams.filter(t => t.captainDiscordId === discordUser.discordId);
                const info = document.getElementById('captain-info');
                if (!info) return;
                info.classList.remove('hidden');
                if (myTeams.length === 0) {
                    info.innerHTML = '<div class="bg-valCard border border-gray-800 p-4 rounded-xl mb-4"><p class="text-sm text-gray-400">Bạn không phải đội trưởng đội nào. <button onclick="switchTab(\'teams-tab\')" class="text-valCyan underline">Xem danh sách đội</button></p></div>';
                    return;
                }
                for (const team of myTeams) {
                    const requests = await api('/api/teams/' + encodeURIComponent(team.name) + '/requests');
                    team._reqCount = requests.filter(r => r.status === 'pending').length;
                    team._requests = requests;
                }
                let html = '';
                for (const team of myTeams) {
                    const pending = (team._requests || []).filter(r => r.status === 'pending');
                    html += '<div class="bg-valCard border border-gray-800 p-4 rounded-xl mb-4">';
                    html += '<h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2"><i class="fa-solid fa-people-arrows text-amber-400"></i> Đơn xin vào <strong>' + escHtml(team.name) + '</strong>';
                    if (pending.length > 0) html += ' <span class="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">' + pending.length + ' đơn</span>';
                    html += '</h4>';
                    if (pending.length === 0) {
                        html += '<p class="text-xs text-gray-500">Chưa có đơn xin vào đội</p>';
                    } else {
                        for (const r of pending) {
                            html += '<div class="flex items-center justify-between bg-valBg/60 p-3 rounded-lg mb-2 border border-gray-800">';
                            html += '<div><p class="text-sm text-white font-bold">' + escHtml(r.playerName) + '</p><p class="text-[10px] text-gray-500 font-mono">' + r.playerDiscordId + '</p></div>';
                            html += '<div class="flex gap-2"><button onclick="approveJoinRequest(\'' + team.name + '\',\'' + r.id + '\')" class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500/30 transition"><i class="fa-solid fa-check"></i> Duyệt</button>';
                            html += '<button onclick="rejectJoinRequest(\'' + team.name + '\',\'' + r.id + '\')" class="text-[10px] bg-red-500/20 text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500/30 transition"><i class="fa-solid fa-xmark"></i> Từ chối</button></div></div>';
                        }
                    }
                    html += '</div>';
                }
                info.innerHTML = html;
                switchTab('dashboard-tab');
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function approveJoinRequest(teamName, requestId) {
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/approve', { method: 'PUT' });
                showToast('Đã duyệt thành viên!', 'success');
                loadCaptainDashboard();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        async function rejectJoinRequest(teamName, requestId) {
            try {
                await api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/reject', { method: 'PUT' });
                showToast('Đã từ chối', 'info');
                loadCaptainDashboard();
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
                renderSchedule(); loadLeaderboard();
            });
            socket.on('match:created', (data) => {
                showToast('Trận mới: ' + data.team1Name + ' vs ' + data.team2Name, 'info');
                renderSchedule();
            });
            socket.on('matches:generated', (data) => {
                showToast('Đã tạo ' + data.count + ' trận!', 'success');
                renderSchedule();
            });
            socket.on('mvp:assigned', (data) => {
                showToast('MVP: ' + (data.playerName || data.discordId), 'success');
                loadLeaderboard();
            });
            socket.on('player:created', (data) => {
                showToast('Đăng ký mới: ' + data.displayName, 'info');
                loadLeaderboard(); loadAdminStats(); renderAdmin();
            });
            socket.on('checkin:updated', (data) => {
                showToast('Check-in: ' + data.count + ' người', 'info');
                renderSchedule();
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
                    await loadStreamMatchSelect();
                }
                updateObsWidgetUrl();
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

        // Override switchTab to load data on tab switch
        const _baseSwitchTab = switchTab;
        switchTab = async function(id) {
            _baseSwitchTab(id);
            if (id === 'register-tab') { autoFillRegisterForm(); }
            if (id === 'dashboard-tab') { loadCaptainDashboard(); }
            if (id === 'profile-tab') { loadPlayerProfile(); }
            if (id === 'schedule-tab') { renderSchedule(); }
            if (id === 'teams-tab') { loadTeamsBrowser(); }
            if (id === 'veto-tab') { loadVetoMatches(); }
            if (id === 'leaderboard-tab') { loadLeaderboard(); loadStandings(); }
            if (id === 'bracket-tab') { loadBracket(); }
            if (id === 'stream-tab') {
                await loadStreamBooth();
                loadStreamArchive();
                if (socket && currentStreamSession) {
                    socket.emit('stream:join', currentStreamSession.id);
                }
            }
            if (id === 'admin-tab') {
                if (!apiToken) { openAdminLoginModal(); return; }
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
