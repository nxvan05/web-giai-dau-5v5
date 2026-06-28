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
            } else if (localStorage.getItem('admin_verified_evan_cup') === 'true') {
                document.getElementById('btn-admin-tab').classList.remove('hidden');
                document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập`;
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

        function toggleHelpModal() {
            document.getElementById('help-modal').classList.toggle('hidden');
        }

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
            if (id === 'admin-tab' && localStorage.getItem('admin_verified_evan_cup') !== 'true') {
                openAdminLoginModal();
                showToast("Vui lòng đăng nhập mã PIN điều phối để mở kho dữ liệu này!", "error");
                return;
            }

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
            if (id === 'dashboard-tab') loadCaptainDashboard();
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
            // Try backend JWT login
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
                return;
            } catch(e) {
                // Try backup PIN
            }
            if (pin === 'evan123') {
                // Try backend with default admin password
                try { await apiLogin('evan', 'evankk123'); } catch(e2) {}
                localStorage.setItem('admin_verified_evan_cup', 'true');
                document.getElementById('btn-admin-tab').classList.remove('hidden');
                document.getElementById('admin-trigger-btn').innerHTML = `<i class="fa-solid fa-user-shield text-valCyan"></i> Admin Đã Đăng Nhập`;
                closeAdminLoginModal();
                switchTab('admin-tab');
                showToast("Đăng nhập quyền Admin thành công!", "success");
            } else {
                showToast("Mã PIN bảo mật không chính xác!", "error");
            }
        }

        function logoutAdmin() {
            apiLogout();
            localStorage.removeItem('admin_verified_evan_cup');
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
            switchTab('guide-tab');
            document.getElementById('veto-match-label').textContent = 'Trận: ' + team1 + ' vs ' + team2 + ' (' + matchId.slice(0,8) + '...)';
            loadVeto(matchId);
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
            if (vetoMatchId && apiToken) {
                api('/api/veto/' + vetoMatchId, { method: 'PUT', body: { phase: currentVetoPhase, maps: vetoMapsState, log: [], active: true } }).catch(() => {});
            }
        }

        function resetMapVeto() {
            currentVetoPhase = 0;
            MAP_LIST.forEach(m => vetoMapsState[m] = 'active');
            renderVetoUI();
            if (vetoMatchId && apiToken) {
                api('/api/veto/' + vetoMatchId, { method: 'DELETE' }).catch(() => {});
            }
            showToast('Đã làm mới VETO', 'success');
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

        async function handleRegistration(e) {
            e.preventDefault();
            const d = { 
                discord: document.getElementById('reg-discord').value,
                discordId: document.getElementById('reg-discord-id').value,
                id: document.getElementById('reg-riotid').value,
                rank: document.getElementById('reg-rank').value,
                role: document.getElementById('reg-role').value,
                type: document.getElementById('reg-type').value,
                pts: parseInt(document.getElementById('form-points-badge').innerText) || 3
            };
            try {
                await api('/api/players', { method: 'POST', body: {
                    displayName: d.discord,
                    discordId: d.discordId,
                    riotId: d.id,
                    rank: d.rank,
                    role: d.role,
                    type: d.type,
                    pts: d.pts
                }});
                showToast('Đăng ký thành công!', 'success');
                document.getElementById('registration-form').reset();
                document.getElementById('form-points-badge').innerText = '3';
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
                return name.includes(search) || riotId.includes(search) || rank.includes(search) || role.includes(search) || type.includes(search);
            }) : list;
            document.getElementById('player-list-count').innerText = filtered.length;
            document.getElementById('player-count-badge').innerText = list.length;
            const c = document.getElementById('player-list-container'); c.innerHTML='';
            
            filtered.forEach((p, idx) => {
                let drafted = team1.some(t=>t.id===p.id) || team2.some(t=>t.id===p.id);
                const name = p.displayName || p.discord || 'Unknown';
                const rank = p.rank || 'N/A';
                const role = p.role || 'N/A';
                const type = p.type || 'Solo';
                const riotId = p.riotId || 'N/A';
                c.innerHTML += `<div class="bg-valBg/80 rounded-lg border border-gray-800 ${drafted?'opacity-50':''}">
                    <div class="flex justify-between items-center p-2.5 cursor-pointer" onclick="document.getElementById('player-detail-${idx}').classList.toggle('hidden')">
                        <div class="flex items-center gap-2"><span class="bg-gray-800 text-[10px] px-1.5 rounded text-gray-300 font-bold">${p.pts}đ</span>
                        <span class="text-xs font-bold text-white">${name}</span></div>
                        ${!drafted ? `<div class="flex gap-1">
                            <button onclick="event.stopPropagation();team1.push(players.find(x=>x.id===${p.id}));saveTournamentData();renderAdmin();" class="bg-valCyan/20 text-valCyan px-2 py-0.5 rounded text-[10px]">T1</button>
                            <button onclick="event.stopPropagation();team2.push(players.find(x=>x.id===${p.id}));saveTournamentData();renderAdmin();" class="bg-valRed/20 text-valRed px-2 py-0.5 rounded text-[10px]">T2</button>
                            <button onclick="event.stopPropagation();removePlayer(${p.id})" class="text-gray-500 hover:text-valRed px-1"><i class="fa-solid fa-trash"></i></button>
                            <button onclick="event.stopPropagation();document.getElementById('player-detail-${idx}').classList.toggle('hidden')" class="text-gray-500 hover:text-valCyan px-1"><i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                        </div>` : `<span class="text-[9px] text-gray-500">Đã xếp <button onclick="removePlayer(${p.id})" class="text-gray-500 hover:text-valRed px-1"><i class="fa-solid fa-trash"></i></button></span>`}
                    </div>
                    <div id="player-detail-${idx}" class="hidden px-2.5 pb-2.5 border-t border-gray-800/50 pt-2 space-y-1 text-[10px] text-gray-400">
                        <div class="grid grid-cols-2 gap-1">
                            <span><span class="text-gray-500">Discord:</span> <span class="text-white">${p.discordId || p.discord || 'N/A'}</span></span>
                            <span><span class="text-gray-500">Riot ID:</span> <span class="text-white">${riotId}</span></span>
                            <span><span class="text-gray-500">Rank:</span> <span class="text-yellow-400">${rank}</span></span>
                            <span><span class="text-gray-500">Vai trò:</span> <span class="text-valCyan">${role}</span></span>
                            <span><span class="text-gray-500">Loại:</span> <span class="text-white">${type}</span></span>
                            <span><span class="text-gray-500">Elo:</span> <span class="text-white">${p.elo || 1200}</span></span>
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
            if (apiToken) document.getElementById('admin-schedule-controls')?.classList.remove('hidden');
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
            try {
                const matches = await api('/api/matches');
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
                                    <span class="font-bold text-white text-sm">${m.team1Name}</span>
                                    <span class="text-gray-500 text-xs">vs</span>
                                    <span class="font-bold text-white text-sm">${m.team2Name}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-gray-400 font-mono">${time}</span>
                                    <button onclick="document.getElementById('${checkinId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition">
                                        <i class="fa-solid fa-check"></i> Check-in
                                    </button>
                                    ${isAdmin ? `<button onclick="document.getElementById('${timeId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-clock"></i> Giờ</button>` : ''}
                                    ${isAdmin ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-400/10 transition"><i class="fa-solid fa-pen"></i> Kết quả</button>` : ''}
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
                                    <span class="font-bold text-white text-sm">${m.team1Name}</span>
                                    <span class="font-black text-lg font-mono ${winner}">${m.score1} - ${m.score2}</span>
                                    <span class="font-bold text-white text-sm">${m.team2Name}</span>
                                    ${mvpStr}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-gray-500">${m.map || ''}</span>
                                    <button onclick="openDisputeModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-orange-400 border border-orange-400/30 px-2 py-1 rounded-lg hover:bg-orange-400/10 transition"><i class="fa-solid fa-scale-balanced"></i></button>
                                    ${isAdmin ? `<button onclick="openMvpModal('${m.id}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-star"></i> MVP</button>` : ''}
                                    ${isAdmin ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pencil"></i> Sửa</button>` : ''}
                                </div>
                            </div>
                            ${streamStr}
                        </div>`;
                    });
                }

                container.innerHTML = html;
            } catch(e) {
                container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải lịch đấu</div>';
            }
        }

        async function generateSchedule() {
            const teamsText = document.getElementById('sched-teams').value.trim();
            const teams = teamsText.split('\n').map(t => t.trim()).filter(t => t);
            if (teams.length < 2) return showToast('Nhập ít nhất 2 đội (mỗi dòng 1 tên)!', 'error');

            const startDate = document.getElementById('sched-date').value;
            const duration = parseInt(document.getElementById('sched-duration').value) || 60;

            try {
                await api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration } });
                showToast('Đã tạo lịch thi đấu!', 'success');
                loadSchedule();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Leaderboard Tab ===
        async function loadLeaderboard() {
            try {
                const players = await api('/api/matches/leaderboard');
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
                    </tr>`
                ).join('');
            } catch(e) {
                document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Chưa có dữ liệu</td></tr>';
            }
        }

        async function loadStandings() {
            try {
                const standings = await api('/api/matches/standings');
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
                            <td class="py-1.5 px-2 font-bold text-white">${t.name}${i < 2 ? ' ⭐' : ''}</td>
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
                document.getElementById('standings-container').innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Chưa có dữ liệu</div>';
            }
        }

        // === Dashboard Tab ===
        async function loadCaptainDashboard() {
            const section = document.getElementById('captain-dashboard');
            const info = document.getElementById('captain-info');
            if (!discordUser) { section.classList.add('hidden'); return; }
            section.classList.remove('hidden');
            try {
                const player = await api('/api/players/lookup/' + discordUser.discordId);
                if (!player) {
                    info.innerHTML = '<p class="text-gray-400">Bạn chưa đăng ký tham gia giải đấu.</p>';
                    return;
                }
                let html = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase">Tên</p>
                        <p class="text-sm font-bold text-white">${player.displayName}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase">Đội</p>
                        <p class="text-sm font-bold text-valCyan">${player.teamId || 'Chưa có'}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase">Elo</p>
                        <p class="text-lg font-black text-yellow-400 font-mono">${player.elo}</p>
                    </div>
                    <div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase">W/L</p>
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
                info.innerHTML = '<p class="text-gray-400">Không thể tải thông tin.</p>';
            }
        }
        async function lookupPlayer() {
            const discordId = document.getElementById('dashboard-discord-id').value.trim();
            if (!discordId) return showToast('Nhập Discord ID!', 'error');
            const resultDiv = document.getElementById('dashboard-result');
            resultDiv.classList.add('hidden');
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
                resultDiv.classList.remove('hidden');
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // === Team Lookup ===
        async function lookupTeam() {
            const teamName = document.getElementById('dashboard-team-name').value.trim();
            if (!teamName) return showToast('Nhập tên đội!', 'error');
            const resultDiv = document.getElementById('dashboard-result');
            resultDiv.classList.add('hidden');
            try {
                const matches = await api('/api/matches/team/' + encodeURIComponent(teamName));
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

        async function checkDiscordAuth() {
            try {
                const res = await fetch('/api/discord/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    discordUser = data.user;
                    document.getElementById('discord-login-btn').classList.add('hidden');
                    const info = document.getElementById('discord-user-info');
                    info.classList.remove('hidden');
                    document.getElementById('discord-username').textContent = discordUser.discordUsername;
                    if (discordUser.discordAvatar) {
                        document.getElementById('discord-avatar').src = 'https://cdn.discordapp.com/avatars/' + discordUser.discordId + '/' + discordUser.discordAvatar + '.png';
                    }
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
            const matchId = document.getElementById('dispute-match-id').value;
            const teamName = document.getElementById('dispute-team').value;
            const filedBy = document.getElementById('dispute-filed-by').value.trim();
            const reason = document.getElementById('dispute-reason').value;
            const detail = document.getElementById('dispute-detail').value.trim();
            if (!teamName || !filedBy) return showToast('Chọn đội và nhập Discord ID!', 'error');
            try {
                await api('/api/disputes', { method: 'POST', body: { matchId, teamName, reason, detail, filedBy } });
                showToast('Đã gửi khiếu nại!', 'success');
                closeDisputeModal();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }
        async function loadDisputes() {
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
            try {
                const stats = await api('/api/matches/stats');
                document.getElementById('stat-players').textContent = stats.players;
                document.getElementById('stat-matches').textContent = stats.matches;
                document.getElementById('stat-completed').textContent = stats.completed;
                document.getElementById('stat-pending').textContent = stats.pending;
            } catch(e) {}
        }

        async function loadFreeAgents() {
            try {
                const agents = await api('/api/players/free-agents');
                const container = document.getElementById('free-agent-list');
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
            } catch(e) {}
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

        async function importCSV() {
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return showToast('Lỗi xác thực!', 'error'); } }
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
            const discordId = document.getElementById('edit-discord-id').value.trim();
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return showToast('Lỗi xác thực!', 'error'); } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return showToast('Lỗi xác thực!', 'error'); } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) {} }
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
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
            try {
                const settings = await api('/api/settings');
                const wh = settings.find(s => s.key === 'webhook_url');
                if (wh) document.getElementById('webhook-url-input').value = wh.value;
            } catch(e) {}
        }

        // === Bracket Tab ===
        async function loadBracket() {
            const container = document.getElementById('bracket-container');
            const btn = document.getElementById('btn-generate-playoff');
            try {
                const bracket = await api('/api/bracket');
                if (bracket.semis?.length > 0 || bracket.final) {
                    btn.classList.add('hidden');
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
                            ${m ? `<button onclick="openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> KQ</button>` : ''}
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
                                <button onclick="openResultModal('${final.id}','${final.team1Name}','${final.team2Name}','${final.score1}','${final.score2}','${final.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> Nhập KQ</button>
                            </div>
                        </div>`;
                    }
                    container.innerHTML = html;
                } else {
                    btn.classList.remove('hidden');
                    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-diagram-project text-3xl mb-2"></i><p>Chưa có playoff. Dùng nút "Tạo Playoff" để bắt đầu.</p></div>';
                }
            } catch(e) {
                container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải dữ liệu playoff</div>';
            }
        }
        async function generatePlayoff() {
            try {
                await api('/api/bracket/generate', { method: 'POST' });
                showToast('Đã tạo playoff!', 'success');
                loadBracket();
            } catch(e) {
                showToast('Lỗi: ' + e.message, 'error');
            }
        }

        // Override switchTab to load data on tab switch
        async function disbandTeam(id) {
            if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) { return; } }
            if (!confirm('Xác nhận giải tán đội này?')) return;
            try {
                await api('/api/teams/' + id, { method: 'DELETE' });
                showToast('Đã giải tán đội!', 'success');
                loadPendingTeams();
            } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
        }

        const _origSwitchTab = switchTab;
        switchTab = async function(id) {
            _origSwitchTab(id);
            if (id === 'schedule-tab') { renderSchedule(); }
            if (id === 'leaderboard-tab') { loadLeaderboard(); loadStandings(); }
            if (id === 'bracket-tab') { loadBracket(); }
            if (id === 'admin-tab' && (apiToken || localStorage.getItem('admin_verified_evan_cup') === 'true')) {
                if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) {} }
                loadPendingTeams(); renderAdmin();
                switchAdminSubTab(currentAdminSubTab);
            }
        };
        // === WebSocket real-time ===
        let socket = null;
        if (typeof io !== 'undefined') {
            socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
            socket.on('connect', () => console.log('Socket.IO connected'));
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
            try {
                const data = await api('/api/stream/current');
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

        // Override switchTab to also load Stream Booth
        const __origSwitchTab2 = switchTab;
        switchTab = async function(id) {
            __origSwitchTab2(id);
            if (id === 'schedule-tab') { renderSchedule(); }
            if (id === 'leaderboard-tab') { loadLeaderboard(); loadStandings(); }
            if (id === 'bracket-tab') { loadBracket(); }
            if (id === 'stream-tab') {
                await loadStreamBooth();
                loadStreamArchive();
                if (socket && currentStreamSession) {
                    socket.emit('stream:join', currentStreamSession.id);
                }
            }
            if (id === 'admin-tab' && (apiToken || localStorage.getItem('admin_verified_evan_cup') === 'true')) {
                if (!apiToken) { try { await apiLogin('evan', 'evankk123'); } catch(e) {} }
                loadPendingTeams(); renderAdmin();
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
        });
