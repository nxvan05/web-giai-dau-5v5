window.destroyProfileCharts = function() {
            Object.values(profileChartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
            profileChartInstances = {};
        }
window.closeProfile = function() {
            destroyProfileCharts();
            document.getElementById('profile-modal').classList.add('hidden');
        }
window.refreshPlayerRank = async function(discordId, btn) {
            if (!window.discordUser || window.discordUser.discordId !== discordId) return window.showToast('Chỉ chủ tài khoản mới refresh được!', 'error');
            if (!btn) btn = document.querySelector('button[onclick*="refreshPlayerRank"]');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>'; }
            try {
                const res = await window.api('/api/players/refresh-rank', { method: 'POST' });
                window.showToast('Đã cập nhật rank: ' + res.rank, 'success');
                openProfile(discordId);
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i>Đồng bộ Rank'; }
            }
        }
window.openProfile = async function(discordId) {
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
                const data = await window.api('/api/players/profile/' + discordId);
                const p = data.player;
                lastProfileDiscordId = discordId;
                document.getElementById('profile-name').textContent = p.displayName + ' — Hồ Sơ';
            const avatarEl = document.getElementById('profile-modal-avatar');
            avatarEl.src = getAvatarUrl(p.discordId, p.discordAvatar, 64);
            avatarEl.setAttribute('data-discord-id', p.discordId || '');
            avatarEl.setAttribute('data-name', p.displayName || '');
            avatarEl.onerror = function(){ this.src = window.getFallbackAvatar(p.discordId, p.displayName || p.discordId, 64); };
            avatarEl.classList.remove('hidden');

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
                    '<div><span class="text-[10px] text-gray-500">Rank Hiện Tại</span><p class="text-white font-bold flex items-center gap-1">' + (p.rankIconUrl ? '<img src="' + p.rankIconUrl + '" class="w-4 h-4 inline-block">' : '') + (p.rank || '—') + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Peak Rank</span><p class="text-yellow-400 font-bold">' + (p.peakRank || p.rank || '—') + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Vai Trò</span><p class="text-white font-bold">' + (p.role || '—') + '</p></div>' +
                    '</div></div>' +
                    '<div class="col-span-2 bg-valBg/60 border border-gray-800 p-3 rounded-xl"><div class="flex items-center gap-2"><i class="fa-solid fa-chart-simple text-emerald-400"></i><span class="text-gray-500 text-[10px] uppercase tracking-wider">Chỉ Số Thi Đấu</span></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">K / D / A</span><span class="text-white font-mono font-bold text-sm">' + k + ' / ' + d + ' / ' + a + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">W / L</span><span class="text-emerald-400 font-mono font-bold text-sm">' + p.wins + '</span><span class="text-gray-500 mx-0.5">/</span><span class="text-red-400 font-mono font-bold text-sm">' + p.losses + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">MVP</span><span class="text-yellow-400 font-mono font-bold text-sm">' + (p.mvps || 0) + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">K/D</span><span class="text-white font-mono font-bold text-sm">' + (d > 0 ? (k/d).toFixed(2) : k.toFixed(2)) + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center" title="Headshot %"><span class="text-[9px] text-gray-500 uppercase block">HS%</span><span class="font-mono font-bold text-sm ' + (p.headshotPct != null ? (p.headshotPct >= 30 ? 'text-emerald-400' : p.headshotPct >= 20 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500') + '">' + (p.headshotPct != null ? p.headshotPct + '%' : '--') + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">Số Trận</span><span class="text-white font-mono font-bold text-sm">' + totalGames + '</span></div>' +
                    '<div class="bg-valBg/80 border border-gray-800/80 p-2 rounded-lg text-center"><span class="text-[9px] text-gray-500 uppercase block">Đội</span><span class="text-valCyan font-mono font-bold text-sm truncate block">' + teamName + '</span></div>' +
                    '</div></div>' +
                    '<div class="col-span-2 bg-valBg/60 border border-gray-800 p-3 rounded-xl"><div class="flex items-center gap-2"><i class="fa-solid fa-shield text-indigo-400"></i><span class="text-gray-500 text-[10px] uppercase tracking-wider">Discord</span></div><div class="flex items-center gap-2 mt-2"><span class="text-[10px] text-gray-500">ID:</span><span class="text-white font-mono text-xs">' + (p.discordId || '—') + '</span></div>' +
                '<div class="mt-2 flex gap-2"><button onclick="refreshPlayerRank(\'' + p.discordId + '\',this)" class="text-[10px] bg-valCyan/10 text-valCyan border border-valCyan/30 px-2.5 py-1 rounded-lg hover:bg-valCyan/20 transition"><i class="fa-solid fa-rotate mr-1"></i>Đồng bộ Rank</button><button onclick="refreshPlayerStats(\'' + p.discordId + '\',this)" class="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-400/30 px-2.5 py-1 rounded-lg hover:bg-purple-500/20 transition"><i class="fa-solid fa-crosshairs mr-1"></i>Đồng bộ HS%</button></div></div>';

                // Achievements
                const achievementsDef = {
                    'first_blood': { name: 'First Blood', icon: 'fa-solid fa-droplet', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
                    'ace_machine': { name: 'Ace Machine', icon: 'fa-solid fa-crosshairs', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
                    'unbreakable': { name: 'Unbreakable', icon: 'fa-solid fa-shield-halved', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
                    'champion': { name: 'Champion', icon: 'fa-solid fa-crown', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' }
                };
                
                let achvArr = [];
                try { achvArr = JSON.parse(p.achievements || '[]'); } catch (e) {}
                const achvContainer = document.getElementById('profile-achievements');
                if (achvArr.length > 0) {
                    achvContainer.innerHTML = achvArr.map(id => {
                        const def = achievementsDef[id];
                        if (!def) return '';
                        return '<div class="flex items-center gap-2 border px-3 py-1.5 rounded-lg ' + def.color + ' tooltip-trigger cursor-help">' +
                               '<i class="' + def.icon + '"></i>' +
                               '<span class="font-bold text-[11px] uppercase">' + def.name + '</span>' +
                               '</div>';
                    }).join('');
                } else {
                    achvContainer.innerHTML = '<div class="text-gray-500 text-[10px] italic w-full text-center py-2 bg-valBg/50 rounded-lg">Chưa có huy hiệu nào</div>';
                }

                // Charts
                destroyProfileCharts();
window.showEmpty = function(container) {
                    const cvs = container.querySelector('canvas');
                    if (cvs) cvs.style.display = 'none';
                    let e = container.querySelector('.chart-empty');
                    if (!e) { e = document.createElement('p'); e.className = 'chart-empty text-gray-500 text-center py-4'; container.appendChild(e); }
                    return e;
                }
window.hideEmpty = function(container) {
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
window.openDiscordIdGuide = function() {
            document.getElementById('discord-guide-modal').classList.remove('hidden');
        }
window.updateFormPoints = function() {
            const pts = rankPointsMap[document.getElementById('reg-rank').value] || 0;
            document.getElementById('form-points-badge').innerText = pts;
            const bar = document.getElementById('energy-bar-fill');
            if (bar) {
                const pct = Math.min(100, (pts / currentRegMaxPts) * 100);
                bar.style.width = pct + '%';
                bar.style.background = pct > 80 ? '#ff4655' : pct > 50 ? '#eab308' : '#22c55e';
            }
        }
window.selectRegType = function(type) {
            document.getElementById('reg-type').value = type;
            document.querySelectorAll('.reg-type-btn').forEach(b => {
                b.classList.toggle('border-valCyan', b.dataset.value === type);
                b.classList.toggle('bg-valCyan/10', b.dataset.value === type);
                b.classList.toggle('border-gray-700', b.dataset.value !== type);
            });
            const field = document.getElementById('reg-team-name-field');
            const input = document.getElementById('reg-team-name');
            const hint = document.getElementById('reg-slots-hint');
            const maxMembersField = document.getElementById('reg-max-members-field');
            const warningEl = document.getElementById('form-points-warning');
            if (type === 'solo') {
                field.classList.add('hidden');
                input.required = false;
                input.value = '';
                if (maxMembersField) maxMembersField.classList.add('hidden');
            } else {
                field.classList.remove('hidden');
                input.required = true;
                if (maxMembersField) maxMembersField.classList.toggle('hidden', type !== 'team5');
                if (hint) hint.textContent = type === 'duo' ? '(2 slot cố định)' : type === 'trio' ? '(3 slot cố định)' : '(5-7 slot linh hoạt)';
            }
            
            let maxPts = 26;
            let ruleText = 'Giới hạn 5 người ≤26đ';
            if (type === 'duo') {
                maxPts = 11;
                ruleText = 'Giới hạn Duo (2 người) ≤11đ';
            } else if (type === 'trio') {
                maxPts = 16;
                ruleText = 'Giới hạn Trio (3 người) ≤16đ';
            } else if (type === 'team5') {
                maxPts = 29;
                ruleText = 'Giới hạn Team 5 (5-7 người) ≤29đ';
            }
            currentRegMaxPts = maxPts;
            if (warningEl) warningEl.classList.toggle('hidden', type !== 'team5');
            
            const maxEl = document.getElementById('form-points-max');
            if(maxEl) maxEl.innerText = '/' + maxPts;
            const rulesEl = document.getElementById('form-points-rules');
            if(rulesEl) rulesEl.innerText = ruleText;
            updateFormPoints();
        }
window.toggleTeamNameInput = function() { selectRegType('solo'); }
window.autoFillRegisterForm = async function() {
            const status = document.getElementById('register-discord-status');
            const discordInput = document.getElementById('reg-discord');
            const discordIdInput = document.getElementById('reg-discord-id');
            const submitBtn = document.getElementById('reg-submit-btn');

            status.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class=\"fa-solid fa-paper-plane mr-2\"></i>Gửi Đơn';

            if (!window.discordUser) {
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

            discordInput.value = window.discordUser.discordUsername;
            discordIdInput.value = window.discordUser.discordId;

            const ava = document.getElementById('reg-discord-avatar');
            if (ava) {
                ava.src = getAvatarUrl(window.discordUser.discordId, window.discordUser.discordAvatar, 64);
                ava.setAttribute('data-discord-id', window.discordUser.discordId || '');
                ava.setAttribute('data-name', window.discordUser.discordUsername || '');
                ava.onerror = function(){ this.src = window.getFallbackAvatar(window.discordUser.discordId, window.discordUser.discordUsername, 64); };
            }

            try {
                const existing = await window.api('/api/players/lookup/' + window.discordUser.discordId);
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
window.lookupRiotIdForRegister = async function() {
            const riotId = document.getElementById('reg-riotid').value.trim();
            const resultEl = document.getElementById('reg-riot-lookup-result');
            if (!riotId) { resultEl.classList.add('hidden'); return; }
            resultEl.className = 'mt-1 text-[10px] p-2 bg-valBg/50 border border-gray-800 rounded-lg';
            resultEl.innerHTML = '<span class="text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Đang tra cứu...</span>';
            resultEl.classList.remove('hidden');
            try {
                const data = await window.api('/api/valorant/lookup', { method: 'POST', body: { riotId, region: 'ap' } });
                lastRiotLookup = data;
                const rankSelect = document.getElementById('reg-rank');
                for (let opt of rankSelect.options) {
                    if (opt.value === data.rank) { rankSelect.value = data.rank; break; }
                }
                rankSelect.disabled = true;
                rankSelect.classList.add('opacity-60', 'cursor-not-allowed');
                updateFormPoints();
                document.getElementById('form-points-badge').innerText = data.pts;
                resultEl.innerHTML = `<span class="text-emerald-400"><i class="fa-solid fa-lock mr-1"></i>${data.rank} · ${data.elo} elo · ${data.pts}đ <span class="text-gray-500">(Peak: ${data.peakRank || data.rank} → ${data.pts}đ)</span>${data.rankIconUrl ? `<img src="${data.rankIconUrl}" class="w-4 h-4 inline-block ml-1 align-middle">` : ''}</span>`;
            } catch(e) {
                resultEl.innerHTML = `<span class="text-valRed"><i class="fa-solid fa-circle-exclamation mr-1"></i>${e.message}</span>`;
            }
        }
window.handleRegistration = async function(e) {
            e.preventDefault();
            if (!window.discordUser) { window.showToast('Vui lòng đăng nhập Discord trước!', 'error'); return; }
            const regType = document.getElementById('reg-type').value;
            const teamName = document.getElementById('reg-team-name').value.trim();
            if (regType !== 'solo' && !teamName) { window.showToast('Vui lòng nhập tên đội!', 'error'); return; }
            const maxMembers = parseInt(document.getElementById('reg-max-members')?.value) || 0;
            const playerPts = parseInt(document.getElementById('form-points-badge').innerText) || 3;
            const body = {
                displayName: window.discordUser.discordUsername,
                discordId: window.discordUser.discordId,
                riotId: document.getElementById('reg-riotid').value.trim(),
                rank: document.getElementById('reg-rank').value,
                role: document.getElementById('reg-role').value,
                type: regType.charAt(0).toUpperCase() + regType.slice(1),
                pts: playerPts,
                peakRank: lastRiotLookup?.peakRank || null,
                discordAvatar: window.discordUser.discordAvatar || '',
                rankIconUrl: lastRiotLookup?.rankIconUrl || ''
            };
            try {
                const player = await window.api('/api/players', { method: 'POST', body });
                if (regType !== 'solo' && teamName) {
                    await window.api('/api/teams/create-from-registration', { method: 'POST', body: {
                        name: teamName,
                        discordId: window.discordUser.discordId,
                        displayName: window.discordUser.discordUsername,
                        pts: playerPts,
                        type: regType,
                        maxMembers: maxMembers || undefined
                    }});
                }
                window.showToast('Đăng ký thành công!', 'success');
                document.getElementById('registration-form').reset();
                document.getElementById('form-points-badge').innerText = '3';
                selectRegType('solo');
                document.getElementById('reg-type').value = 'solo';
                autoFillRegisterForm();
                loadTeamsBrowser();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.loadCaptainDashboard = async function() {
            const section = document.getElementById('captain-dashboard');
            const info = document.getElementById('captain-info');
            if (!window.discordUser) { section.classList.add('hidden'); return; }
            section.classList.remove('hidden');
            const dashInput = document.getElementById('dashboard-discord-id');
            if (dashInput && !dashInput.value) dashInput.value = window.discordUser.discordId;
            window.showLoading('Đang tải thông tin cá nhân...');
            try {
                const player = await window.api('/api/players/lookup/' + window.discordUser.discordId);
                window.hideLoading();
                if (!player) {
                    info.innerHTML = '<p class="text-gray-400">Bạn chưa đăng ký tham gia giải đấu.</p>';
                    return;
                }
                let html = `<div class="flex items-center gap-4 mb-4 pb-3 border-b border-gray-800">
                    <img src="${getAvatarUrl(window.discordUser.discordId, window.discordUser.discordAvatar, 64)}" class="w-10 h-10 rounded-full border-2 border-valCyan/50" data-discord-id="${window.discordUser.discordId || ''}" data-name="${(window.discordUser.discordUsername || '?').replace(/"/g,'&quot;')}" onerror="this.src=window.getFallbackAvatar('${window.discordUser.discordId || ''}','${(window.discordUser.discordUsername || '?').replace(/'/g,"\\'")}',64)">
                    <div>
                        <p class="text-sm font-bold text-white">${window.discordUser.discordUsername}</p>
                        <p class="text-[10px] text-gray-500">${window.discordUser.discordId}</p>
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
                        const matches = await window.api('/api/matches/team/' + encodeURIComponent(player.teamId));
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
                window.hideLoading();
                info.innerHTML = '<p class="text-gray-400">Không thể tải thông tin.</p>';
            }
        }
window.refreshPlayerStats = async function(discordId, btn) {
  if (!window.discordUser || window.discordUser.discordId !== discordId) return window.showToast('Chỉ tài khoản của bạn mới refresh được!', 'error');
  if (!btn) btn = document.querySelector('button[onclick*="refreshPlayerStats"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    const res = await window.api('/api/players/refresh-stats', { method: 'POST' });
    window.showToast('Đã đồng bộ Headshot: ' + (res.headshotPct || '?') + '%', 'success');
    if (typeof openProfile === 'function') openProfile(discordId);
  } catch(e) {
    window.showToast('Lỗi: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-crosshairs mr-1"></i>Đồng bộ HS%'; }
  }
};
window.populateRankSelect = function(selId, selected) {
            const ranks = ["Iron (Sắt)","Bronze (Đồng)","Silver (Bạc)","Gold (Vàng)","Platinum (Bạch Kim)","Diamond (Kim Cương)","Ascendant (Thượng Nhân)","Immortal (Bất Tử)"];
            const sel = document.getElementById(selId);
            if (!sel) return;
            sel.innerHTML = ranks.map(r => `<option value="${r}"${r===selected?' selected':''}>${r}</option>`).join('');
        }
window.loadPlayerProfile = async function() {
            const container = document.getElementById('profile-container');
            const notReg = document.getElementById('profile-not-registered');
            const loaded = document.getElementById('profile-loaded');
            notReg.classList.add('hidden'); loaded.classList.add('hidden');
            if (!window.discordUser) return;
            window.showLoading('Đang tải hồ sơ...');
            try {
                const qs = window.apiToken && !document.cookie.includes('discord_token') ? '?discordId=' + window.discordUser.discordId : '';
                const data = await window.api('/api/players/me' + qs);
                window.hideLoading();
                loaded.classList.remove('hidden');
                const p = data.player;
                if (!p) { window.hideLoading(); loaded.classList.add('hidden'); notReg.classList.remove('hidden'); window.showToast('Bạn chưa đăng ký tham gia giải', 'info'); return; }
                // Discord header
                document.getElementById('profile-username').textContent = window.discordUser.discordUsername;
                document.getElementById('profile-discord-id').textContent = 'Discord: ' + window.discordUser.discordId;
                const pa = document.getElementById('profile-avatar');
                pa.src = getAvatarUrl(window.discordUser.discordId, window.discordUser.discordAvatar, 64);
                pa.setAttribute('data-discord-id', window.discordUser.discordId || '');
                pa.setAttribute('data-name', window.discordUser.discordUsername || '');
                pa.onerror = function(){ this.src = window.getFallbackAvatar(window.discordUser.discordId, window.discordUser.discordUsername, 64); };
                // Banner + Level from DB
                const bannerEl = document.getElementById('profile-banner');
                if (p.cardUrl) { bannerEl.style.display = 'block'; bannerEl.style.backgroundImage = 'url(' + p.cardUrl + ')'; }
                else { bannerEl.style.display = 'none'; }
                const lvBadge = document.getElementById('profile-lv-badge');
                if (p.accountLevel) { lvBadge.textContent = 'Lv' + p.accountLevel; lvBadge.classList.remove('hidden'); }
                else { lvBadge.classList.add('hidden'); }
                // Player info
        document.getElementById('p-display-name').textContent = p.displayName || '-';
        document.getElementById('p-riot-id').textContent = p.riotId || '-';
        document.getElementById('p-rank').textContent = p.rank || '-';
        document.getElementById('p-peak').textContent = p.peakRank || p.rank || '-';
        document.getElementById('p-role').textContent = p.role || '-';
        document.getElementById('p-type').textContent = p.type || '-';
        document.getElementById('p-pts').textContent = (p.pts != null ? p.pts : 0) + 'đ';
        document.getElementById('p-created').textContent = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '-';
        if (data.seasonStats && data.seasonStats.playerRank) {
            document.getElementById('p-server-rank').textContent = '#' + data.seasonStats.playerRank + '/' + data.seasonStats.totalPlayers;
        } else {
            document.getElementById('p-server-rank').textContent = '-';
        }
        
        const teamEl = document.getElementById('p-team');
        if (p.teamId) { teamEl.innerHTML = `<span class="team-link cursor-pointer hover:text-white" onclick="openTeamDetail('${p.teamId.replace(/'/g, "\\'")}')">${p.teamId}</span>`; }
        else { teamEl.textContent = 'Chưa có đội'; }
                // Stats
                // Rank icon
                const rankIconEl = document.getElementById('p-rank-icon');
                const rankNameEl = document.getElementById('p-rank-name');
                if (p.rankIconUrl && rankIconEl) {
                    rankIconEl.innerHTML = '<img src="' + p.rankIconUrl + '" class="w-4 h-4 inline-block mr-1">';
                } else if (rankIconEl) {
                    rankIconEl.innerHTML = '';
                }
                if (rankNameEl) rankNameEl.textContent = p.rank || '-';
                // Headshot %
                const hsEl = document.getElementById('p-headshot');
                if (hsEl) {
                    hsEl.textContent = p.headshotPct != null ? p.headshotPct + '%' : '--';
                    if (p.headshotPct != null) {
                        hsEl.className = 'text-lg font-black font-mono ' + (p.headshotPct >= 30 ? 'text-emerald-400' : p.headshotPct >= 20 ? 'text-yellow-400' : 'text-red-400');
                    } else {
                        hsEl.className = 'text-lg font-black text-white font-mono';
                    }
                }
                document.getElementById('p-elo').textContent = p.elo;
                document.getElementById('p-wins').textContent = p.wins;
                document.getElementById('p-losses').textContent = p.losses;
                document.getElementById('p-mvps').textContent = p.mvps || 0;
                const kills = data.kda?.kills || 0;
                const deaths = data.kda?.deaths || 0;
                const assists = data.kda?.assists || 0;
                document.getElementById('p-kills').textContent = kills;
                document.getElementById('p-deaths').textContent = deaths;
                document.getElementById('p-assists').textContent = assists;
                const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : '0.00';
                document.getElementById('p-kd').textContent = kd;
                const total = (p.wins || 0) + (p.losses || 0);
                const wr = total > 0 ? ((p.wins / total) * 100).toFixed(1) + '%' : '-';
                document.getElementById('p-winrate').textContent = wr;
                // Elo chart
                window.loadProfileEloChart(data.eloHistory || []);
                // Achievements
                window.loadProfileAchievements(p, data);
                // Main Agents
                document.getElementById('p-agents').textContent = p.mainAgents || '';
                window.loadProfileAgents(p);
                // Team section
                const teamSection = document.getElementById('profile-team-section');
                if (data.team) {
                    teamSection.classList.remove('hidden');
                    const t = data.team;
                    document.getElementById('p-team-name').textContent = t.name;
                    const modalStatusLabels = {approved:'✅ Đã duyệt',ready:'⏳ Sẵn sàng · Chờ duyệt',pending:'⏳ Chờ duyệt',recruiting:'📢 Tuyển TV',complete:'✅ Hoàn chỉnh',rejected:'❌ Từ chối'};
                    document.getElementById('p-team-status').textContent = modalStatusLabels[t.status] || '⏳ Chờ duyệt';
                    const rosterEl = document.getElementById('p-team-roster');
                    try {
                        const roster = await window.api('/api/players/by-team/' + encodeURIComponent(t.name));
                        rosterEl.innerHTML = roster.map(r => `<div class="bg-valBg/60 border border-gray-800 p-2 rounded-lg text-center cursor-pointer" onclick="openProfile('${r.discordId}')"><p class="text-[10px] text-white font-bold truncate">${r.displayName}</p><p class="text-[9px] text-gray-500">${r.role || ''}</p></div>`).join('');
                    } catch(e) { rosterEl.innerHTML = ''; }
                    // Captain actions
                    const cm = document.getElementById('profile-captain-actions');
                    const mm = document.getElementById('profile-member-actions');
                    if (cm) {
                        const isCaptain = (t.captainDiscordId || t.captainId) === window.discordUser.discordId;
                        cm.classList.toggle('hidden', !isCaptain);
                        if (isCaptain) {
                            cm.querySelector('.p-captain-kick').onclick = async function() {
                                const pid = prompt('Nhập Discord ID thành viên muốn kick:');
                                if (!pid) return;
                                if (!confirm('Xác nhận kick thành viên này?')) return;
                                try {
                                    await window.api('/api/teams/' + encodeURIComponent(t.name) + '/players/' + pid, { method: 'DELETE' });
                                    window.showToast('Đã xóa thành viên!', 'success');
                                    loadPlayerProfile();
                                } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
                            };
                        }
                    }
                    if (mm) {
                        const isCaptain = (t.captainDiscordId || t.captainId) === window.discordUser.discordId;
                        mm.classList.toggle('hidden', isCaptain);
                        if (!isCaptain) {
                            mm.querySelector('.p-member-leave').onclick = async function() {
                                if (!confirm('Xác nhận rời đội?')) return;
                                try {
                                    await window.api('/api/teams/' + encodeURIComponent(t.name) + '/leave', { method: 'POST' });
                                    window.showToast('Đã rời đội!', 'success');
                                    loadPlayerProfile();
                                } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
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
                        const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('vi-VN') : '';
                        const mapName = m.map ? m.map.charAt(0).toUpperCase() + m.map.slice(1) : '';
                        const opponent = m.isTeam1 ? m.team2Name : m.team1Name;
                        return `<div class="bg-valBg/40 border border-gray-800 p-3 rounded-xl flex items-center gap-3 text-xs">
                            <div class="w-8 h-8 ${badge} border rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">${label}</div>
                            <div class="flex-1 min-w-0">
                                <div class="text-white font-bold truncate">vs ${opponent}</div>
                                <div class="text-[9px] text-gray-500">${m.team1Name} ${m.score1}-${m.score2} ${m.team2Name}${mapName ? ' · ' + mapName : ''}</div>
                            </div>
                            ${time ? `<span class="text-[9px] text-gray-500 shrink-0">${time}</span>` : ''}
                        </div>`;
                    }).join('');
                } else {
                    historyEl.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Chưa có trận nào</p>';
                }
            } catch(e) {
                window.hideLoading();
                if (e.message.includes('chưa đăng ký')) {
                    notReg.classList.remove('hidden');
                } else {
                    window.showToast('Lỗi tải hồ sơ: ' + e.message, 'error');
                }
            }
        }
window.loadProfileEloChart = function(eloHistory) {
            const canvas = document.getElementById('profile-elo-chart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (window.profileEloChartInstance) { window.profileEloChartInstance.destroy(); }
            if (!eloHistory || eloHistory.length < 2) {
                window.profileEloChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: { labels: ['Hiện tại'], datasets: [{ label: 'Elo', data: [0], borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', fill: true, tension: 0.3 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7280', font: { size: 9 } } }, y: { ticks: { color: '#6b7280', font: { size: 9 } } } } }
                });
                return;
            }
            window.profileEloChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: eloHistory.map((e,i) => '#' + (i+1)),
                    datasets: [{
                        label: 'Elo',
                        data: eloHistory.map(e => typeof e === 'object' ? (e.elo || e.value || 0) : e),
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251,191,36,0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#fbbf24'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#6b7280', font: { size: 9 } } },
                        y: { ticks: { color: '#6b7280', font: { size: 9 } } }
                    }
                }
            });
        }
window.loadProfileAchievements = function(p, data) {
            const section = document.getElementById('profile-achievements');
            const container = document.getElementById('profile-badges');
            if (!section || !container) return;
            const badges = [];
            const wins = p.wins || 0;
            const mvps = p.mvps || 0;
            const kda = data.kda || {};
            const kills = kda.kills || 0;
            const deaths = kda.deaths || 0;
            if (wins >= 10) badges.push({ icon: 'fa-solid fa-trophy', label: '10+ Chiến Thắng', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' });
            if (wins >= 5) badges.push({ icon: 'fa-solid fa-medal', label: '5+ Chiến Thắng', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' });
            if (mvps >= 3) badges.push({ icon: 'fa-solid fa-star', label: '3+ MVP', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' });
            if (deaths > 0 && kills / deaths >= 2) badges.push({ icon: 'fa-solid fa-crosshairs', label: 'K/D ≥ 2.0', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' });
            if (deaths > 0 && kills / deaths >= 1.5) badges.push({ icon: 'fa-solid fa-crosshairs', label: 'K/D ≥ 1.5', color: 'text-green-400 bg-green-500/10 border-green-500/30' });
            if (p.peakRank && p.peakRank !== p.rank) badges.push({ icon: 'fa-solid fa-arrow-up', label: 'Peak: ' + p.peakRank, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' });
            if (badges.length === 0) { section.classList.add('hidden'); return; }
            section.classList.remove('hidden');
            container.innerHTML = badges.map(b => `<span class="${b.color} border text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i class="${b.icon}"></i>${b.label}</span>`).join('');
        }
window.openProfileEdit = function() {
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
            document.getElementById('pe-agents').value = document.getElementById('p-agents')?.textContent || '';
            document.getElementById('profile-edit-modal').classList.remove('hidden');
        }
window.closeProfileEdit = function() {
            document.getElementById('profile-edit-modal').classList.add('hidden');
        }
window.saveProfileEdit = async function() {
            const body = {};
            const displayName = document.getElementById('pe-display-name').value.trim();
            const riotId = document.getElementById('pe-riot-id').value.trim();
            const rankSelect = document.getElementById('pe-rank');
            const role = document.getElementById('pe-role').value;
            const agents = document.getElementById('pe-agents').value.trim();
            if (displayName) body.displayName = displayName;
            if (riotId) body.riotId = riotId;
            if (!rankSelect.disabled) body.rank = rankSelect.value;
            if (role) body.role = role;
            if (agents) body.mainAgents = agents;
            if (Object.keys(body).length === 0) return window.showToast('Không có thay đổi', 'info');
            try {
                await window.api('/api/players/me', { method: 'PUT', body });
                window.showToast('Đã cập nhật hồ sơ!', 'success');
                closeProfileEdit();
                loadPlayerProfile();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.loadProfileAgents = function(p) {
            const section = document.getElementById('profile-agents');
            const container = document.getElementById('profile-agent-list');
            if (!section || !container) return;
            const agentsStr = p.mainAgents || '';
            const agents = agentsStr.split(',').map(a => a.trim()).filter(a => a);
            if (agents.length === 0) { section.classList.add('hidden'); return; }
            section.classList.remove('hidden');
            const roleColors = { 'Duelist': 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-300', 'Sentinel': 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-300', 'Controller': 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300', 'Initiator': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-300' };
            const agentRoles = { 'Jett':'Duelist','Phoenix':'Duelist','Reyna':'Duelist','Raze':'Duelist','Neon':'Duelist','Iso':'Duelist','Waylay':'Duelist','Sova':'Initiator','Breach':'Initiator','Fade':'Initiator','Gekko':'Initiator','Kayo':'Initiator','Skye':'Initiator','Sage':'Sentinel','Cypher':'Sentinel','Killjoy':'Sentinel','Chamber':'Sentinel','Deadlock':'Sentinel','Vyse':'Sentinel','Omen':'Controller','Brimstone':'Controller','Viper':'Controller','Astra':'Controller','Harbor':'Controller','Clove':'Controller','Tejo':'Initiator' };
            container.innerHTML = agents.map(a => {
                const role = agentRoles[a] || '';
                const colors = roleColors[role] || 'from-gray-500/20 to-gray-500/5 border-gray-500/30 text-gray-300';
                return `<div class="bg-gradient-to-b ${colors} border rounded-xl p-2.5 text-center min-w-[72px]">
                    <span class="text-[11px] font-bold">${a}</span>
                    ${role ? `<p class="text-[8px] text-gray-500 uppercase">${role}</p>` : ''}
                </div>`;
            }).join('');
        }

