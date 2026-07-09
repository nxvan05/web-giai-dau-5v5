window.vetoLabel = function(m) { return m.charAt(0).toUpperCase() + m.slice(1); }
window.openVetoForMatch = function(matchId, team1, team2) {
            window.switchTab('veto-tab');
            const sel = document.getElementById('veto-match-select');
            if (sel) {
                sel.dataset.selected = matchId;
                loadVetoMatches().then(() => {
                    sel.value = matchId;
                    onSelectVetoMatch();
                });
            }
        }
window.loadVetoMatches = async function() {
            const sel = document.getElementById('veto-match-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Đang tải trận đấu... --</option>';
            try {
                const matches = await window.api('/api/matches');
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
window.onSelectVetoMatch = async function() {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            const board = document.getElementById('veto-board');
            const startBtn = document.getElementById('veto-start-btn');
            if (!matchId) { board.classList.add('hidden'); return; }
            board.classList.remove('hidden');
            sel.dataset.selected = matchId;

            // Join window.socket room
            if (window.socket) window.socket.emit('veto:join', matchId);

            // Load current veto state
            try {
                const veto = await window.api('/api/veto/' + matchId);
                window.window.currentVetoData = veto;
                if (veto.active || veto.phase > 0) {
                    startBtn.classList.add('hidden');
                    renderVetoBoard(veto);
                } else {
                    startBtn.classList.remove('hidden');
                    renderVetoBoard({ phase: 0, maps: Object.fromEntries(window.MAP_LIST.map(m => [m, 'active'])), matchId, team1Name: '', team2Name: '', active: false });
                }
                // Update team labels
                const match = await window.api('/api/matches');
                const m = match.find(x => x.id === matchId);
                if (m) {
                    document.querySelector('#veto-team-labels .team1-label').textContent = '🔵 ' + m.team1Name;
                    document.querySelector('#veto-team-labels .team2-label').textContent = '🔴 ' + m.team2Name;
                    window.window._vetoTeam1Name = m.team1Name;
                    window.window._vetoTeam2Name = m.team2Name;
                }
            } catch(e) {
                startBtn.classList.add('hidden');
                renderVetoBoard({ phase: 0, maps: Object.fromEntries(window.MAP_LIST.map(m => [m, 'active'])), matchId, team1Name: '', team2Name: '', active: false });
            }
        }
window.startVeto = async function() {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            if (!matchId) return;
            try {
                const veto = await window.api('/api/veto/' + matchId + '/init', { method: 'POST' });
                window.window.currentVetoData = veto;
                document.getElementById('veto-start-btn').classList.add('hidden');
                renderVetoBoard(veto);
                window.showToast('VETO bắt đầu!', 'success');
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.renderVetoBoard = function(veto) {
            const grid = document.getElementById('map-veto-grid');
            if (!grid) return;
            const phase = veto.phase || 0;
            const phases = window.VETO_PHASES || [
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
                const teamName = p.team === 1 ? (window.window._vetoTeam1Name || 'Team 1') : p.team === 2 ? (window.window._vetoTeam2Name || 'Team 2') : '';
                const color = p.team === 1 ? 'text-blue-400' : p.team === 2 ? 'text-red-400' : 'text-yellow-400';
                const bg = p.team === 1 ? 'bg-blue-500/20' : p.team === 2 ? 'bg-red-500/20' : 'bg-yellow-400/20';
                const actionLabel = p.action === 'ban' ? 'CẤM' : p.action === 'pick' ? 'CHỌN' : 'DECIDER';
                st.innerHTML = `Lượt <span class="text-purple-400 font-bold">${phase+1}/${phases.length}</span>: ${teamName} <span class="${bg} ${color} px-2 py-0.5 rounded font-bold">${actionLabel}</span> — <span class="text-gray-400">${p.label}</span>`;
            }

            // Map cards
            grid.innerHTML = window.MAP_LIST.map(m => {
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
window.vetoAction = async function(mapName) {
            const sel = document.getElementById('veto-match-select');
            const matchId = sel.value;
            if (!matchId) return;
            try {
                const veto = await window.api('/api/veto/' + matchId + '/action', { method: 'POST', body: { mapName } });
                window.window.currentVetoData = veto;
                renderVetoBoard(veto);
                if (!veto.active && veto.phase >= (window.VETO_PHASES || []).length) {
                    window.showToast('VETO hoàn tất! Map đã được lưu.', 'success');
                }
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }


