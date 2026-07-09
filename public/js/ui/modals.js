window.toggleHelpModal = function() {
            const modal = document.getElementById('help-modal');
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                document.getElementById('help-detailed')?.classList.add('hidden');
                document.getElementById('help-easteregg-hint')?.classList.remove('hidden');
            }
        }
window.toggleHelpDetailed = function() {
            const d = document.getElementById('help-detailed');
            const h = document.getElementById('help-easteregg-hint');
            if (d) { d.classList.toggle('hidden'); }
            if (h) { h.classList.add('hidden'); }
            fireConfetti(30);
            playEasterEggSound();
        }
window.openMatchDetail = async function(matchId) {
            showLoading('Đang tải thông tin trận...');
            try {
                const data = await window.api('/api/matches/' + matchId + '/detail');
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
                window.showToast('Lỗi tải thông tin trận: ' + e.message, 'error');
            }
        }
window.closeMatchDetail = function() {
            document.getElementById('match-detail-modal').classList.add('hidden');
        }
window.openScoreReport = function(matchId, team1Name, team2Name) {
            if (!discordUser) return window.showToast('Đăng nhập Discord để báo kết quả!', 'error');
            document.getElementById('sr-match-id').value = matchId;
            const sel = document.getElementById('sr-team');
            sel.innerHTML = '<option value="">-- Chọn đội của bạn --</option>';
            [team1Name, team2Name].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
            document.getElementById('sr-score1').value = '';
            document.getElementById('sr-score2').value = '';
            document.getElementById('sr-map').value = '';
            document.getElementById('score-report-modal').classList.remove('hidden');
        }
window.closeScoreReport = function() {
            document.getElementById('score-report-modal').classList.add('hidden');
        }
window.submitScoreReport = async function() {
            const matchId = document.getElementById('sr-match-id').value;
            const teamName = document.getElementById('sr-team').value;
            const score1 = parseInt(document.getElementById('sr-score1').value);
            const score2 = parseInt(document.getElementById('sr-score2').value);
            const map = document.getElementById('sr-map').value;
            if (!teamName) return window.showToast('Chọn đội của bạn!', 'error');
            if (isNaN(score1) || isNaN(score2)) return window.showToast('Nhập tỉ số!', 'error');
            try {
                await window.api('/api/matches/' + matchId + '/report-score', { method: 'POST', body: { teamName, score1, score2, map: map || undefined } });
                window.showToast('Đã gửi báo cáo, chờ admin xác nhận!', 'success');
                closeScoreReport();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.openQrModal = function(matchId, matchName) {
            document.getElementById('qr-match-name').innerText = matchName;
            document.getElementById('qr-fs-match-name').innerText = matchName;
            const checkinUrl = window.location.origin + window.location.pathname + '?checkin=' + matchId;
            const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(checkinUrl);
            const qrFsApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=' + encodeURIComponent(checkinUrl);
            document.getElementById('qr-code-img').src = qrApiUrl;
            document.getElementById('qr-fs-img').src = qrFsApiUrl;
            document.getElementById('qr-checkin-modal').classList.remove('hidden');
        }
window.closeQrModal = function() {
            document.getElementById('qr-checkin-modal').classList.add('hidden');
        }
window.openQrFullscreen = function() {
            document.getElementById('qr-checkin-modal').classList.add('hidden');
            document.getElementById('qr-fullscreen-modal').classList.remove('hidden');
        }
window.closeQrFullscreen = function() {
            document.getElementById('qr-fullscreen-modal').classList.add('hidden');
            document.getElementById('qr-checkin-modal').classList.remove('hidden');
        }
window.openResultModal = function(matchId, team1, team2, score1, score2, map) {
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
                        window.api('/api/players/by-team/' + encodeURIComponent(team1)),
                        window.api('/api/players/by-team/' + encodeURIComponent(team2))
                    ]);
                    if (Array.isArray(roster1)) document.getElementById('kda-t1-players').value = roster1.map(p => p.discordId).join(', ');
                    if (Array.isArray(roster2)) document.getElementById('kda-t2-players').value = roster2.map(p => p.discordId).join(', ');
                } catch(e) {}
            })();
            document.getElementById('result-modal').classList.remove('hidden');
        }
window.closeResultModal = function() {
            document.getElementById('result-modal').classList.add('hidden');
        }
window.submitMatchResult = async function() {
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
            if (!forfeit && (isNaN(score1) || isNaN(score2))) return window.showToast('Nhập tỉ số hoặc chọn forfeit!', 'error');
            try {
                await window.api('/api/matches/' + id, { method: 'PUT', body: { score1, score2, map, streamUrl, status: 'completed', forfeit } });
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
                    try { await window.api('/api/teams/kda/' + id, { method: 'PUT', body: { team1Kills: k1||0, team1Deaths: d1||0, team1Assists: a1||0, team2Kills: k2||0, team2Deaths: d2||0, team2Assists: a2||0, team1Players: t1players, team2Players: t2players, matchId: id } }); } catch(e2) {}
                }
                window.showToast('Đã cập nhật kết quả!', 'success');
                closeResultModal();
                loadSchedule();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.openMvpModal = function(matchId) {
            document.getElementById('mvp-match-id').value = matchId;
            document.getElementById('mvp-discord-id').value = '';
            document.getElementById('mvp-player-name').value = '';
            document.getElementById('mvp-modal').classList.remove('hidden');
        }
window.closeMvpModal = function() {
            document.getElementById('mvp-modal').classList.add('hidden');
        }
window.submitMvp = async function() {
            const id = document.getElementById('mvp-match-id').value;
            const discordId = document.getElementById('mvp-discord-id').value.trim();
            const playerName = document.getElementById('mvp-player-name').value.trim();
            if (!discordId) return window.showToast('Nhập Discord ID của MVP!', 'error');
            try {
                await window.api('/api/matches/' + id + '/mvp', { method: 'PUT', body: { discordId, playerName } });
                window.showToast('Đã gán MVP!', 'success');
                closeMvpModal();
                loadSchedule();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.openDisputeModal = function(matchId, team1, team2) {
            document.getElementById('dispute-match-id').value = matchId;
            const sel = document.getElementById('dispute-team');
            sel.innerHTML = '';
            [team1, team2].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
            const filedByInput = document.getElementById('dispute-filed-by');
            if (discordUser) filedByInput.value = discordUser.discordId;
            document.getElementById('dispute-modal').classList.remove('hidden');
        }
window.closeDisputeModal = function() {
            document.getElementById('dispute-modal').classList.add('hidden');
        }
window.submitDispute = async function() {
            if (!discordUser) return window.showToast('Đăng nhập Discord trước khi gửi khiếu nại!', 'error');
            const matchId = document.getElementById('dispute-match-id').value;
            const teamName = document.getElementById('dispute-team').value;
            const filedBy = discordUser.discordId;
            const reason = document.getElementById('dispute-reason').value;
            const detail = document.getElementById('dispute-detail').value.trim();
            if (!teamName) return window.showToast('Chọn đội!', 'error');
            try {
                await window.api('/api/disputes', { method: 'POST', body: { matchId, teamName, reason, detail, filedBy } });
                window.showToast('Đã gửi khiếu nại!', 'success');
                closeDisputeModal();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.showToast = function(msg, type='info', duration) {
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
window.openGuidePopup = function(step) {
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
window.closeGuidePopup = function() {
            document.getElementById('guide-detail-modal').classList.add('hidden');
        }


window.confirmAdminLogin = function() {
  // Thử khôi phục session từ cookie token trước
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  if (m) {
    window.apiToken = m[1];
    const btnAdmin = document.getElementById('btn-admin-tab');
    if (btnAdmin) btnAdmin.classList.remove('hidden');
    
    window.showToast('Đã khôi phục phiên Admin', 'success');
    setTimeout(() => { if (typeof window.switchTab === 'function') window.switchTab('admin-tab'); }, 300);
    return;
  }
  window.openAdminLoginModal();
};
window.openAdminLoginModal = function() {
  const modal = document.getElementById('admin-login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('admin-login-error')?.classList.add('hidden');
    document.getElementById('admin-login-username')?.focus();
  }
};
window.closeAdminLoginModal = function() {
  document.getElementById('admin-login-modal')?.classList.add('hidden');
};

  window.adminLogin = async function() {
    const username = document.getElementById('admin-login-username')?.value.trim();
    const password = document.getElementById('admin-login-password')?.value;
    const errorEl = document.getElementById('admin-login-error');
    const btn = document.getElementById('admin-login-submit-btn');
    if (!username || !password) {
      if (errorEl) { errorEl.textContent = 'Vui lòng nhập username và password'; errorEl.classList.remove('hidden'); }
      return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Đang tải...'; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
      window.apiToken = data.token;
      document.cookie = 'token=' + data.token + ';path=/;max-age=86400';
      if (errorEl) errorEl.classList.add('hidden');
      window.closeAdminLoginModal();
      window.showToast('Đã đăng nhập Admin thành công!', 'success');
      
      const btnAdmin = document.getElementById('btn-admin-tab');
      if (btnAdmin) btnAdmin.classList.remove('hidden');
      setTimeout(() => { if (typeof window.switchTab === 'function') window.switchTab('admin-tab'); }, 300);
    } catch (e) {
      if (errorEl) { errorEl.textContent = e.message; errorEl.classList.remove('hidden'); }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Đăng Nhập'; }
    }
  };
  window.draftState = { teams: [], unassigned: [] };
window.draggedPlayer = null;

window.openDraftPreviewModal = function(data) {
    const m = document.getElementById('draft-preview-modal');
    if (m) m.classList.remove('hidden');
    
    if (data && data.teams) {
        window.draftState.teams = data.teams;
        window.draftState.unassigned = data.unassigned || [];
    }
    window.renderDraftBoard();
};

window.closeDraftPreviewModal = function() {
    const m = document.getElementById('draft-preview-modal');
    if (m) m.classList.add('hidden');
    window.draftState = { teams: [], unassigned: [] };
};

window.addDraftTeamSlot = function() {
    const newName = prompt('Nhập tên đội mới:');
    if (!newName) return;
    window.draftState.teams.push({
        name: newName,
        captainDiscordId: null,
        players: [],
        pts: 0,
        totalElo: 0
    });
    window.renderDraftBoard();
};

window.renderDraftBoard = function() {
    const unassignedList = document.getElementById('draft-unassigned-list');
    const teamsList = document.getElementById('draft-preview-list');
    const statsEl = document.getElementById('draft-preview-stats');
    const countEl = document.getElementById('draft-unassigned-count');
    
    if (!unassignedList || !teamsList) return;
    
    countEl.textContent = window.draftState.unassigned.length;
    
    let totalPlayers = window.draftState.unassigned.length;
    
    // Render unassigned
    unassignedList.innerHTML = window.draftState.unassigned.map(p => {
        const roleColor = p.role === 'Duelist' ? 'text-red-400' : p.role === 'Sentinel' ? 'text-emerald-400' : p.role === 'Controller' ? 'text-blue-400' : p.role === 'Initiator' ? 'text-purple-400' : 'text-gray-400';
        return `<div draggable="true" ondragstart="startDrag(event, '${p.discordId}', 'unassigned')" class="bg-gray-800 p-2 rounded border border-gray-700 cursor-move hover:border-valCyan/50 transition">
            <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-white">${p.displayName}</span>
                <span class="text-[10px] text-valRed font-mono">${p.pts || 0}đ</span>
            </div>
            <div class="text-[10px] ${roleColor}">${p.role || 'Chưa rõ'} - ${p.elo || 1200} ELO</div>
        </div>`;
    }).join('');
    
    // Render teams
    teamsList.innerHTML = window.draftState.teams.map((t, idx) => {
        totalPlayers += t.players.length;
        const avgElo = t.players.length > 0 ? Math.round(t.players.reduce((s, p) => s + (p.elo || 1200), 0) / t.players.length) : 0;
        const isComplete = t.players.length === 5;
        const borderClass = isComplete ? 'border-emerald-500/50' : 'border-gray-800';
        
        return `<div class="bg-valBg/60 border ${borderClass} p-3 rounded-xl flex flex-col h-full" ondrop="dropPlayer(event, ${idx})" ondragover="allowDrop(event)">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-valCyan font-bold text-sm">${t.name}</h4>
                <span class="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">${t.players.length}/5 - ${t.pts || 0}đ - ${avgElo} ELO</span>
            </div>
            <div class="space-y-1 flex-1 min-h-[100px] border border-dashed border-gray-700/50 p-1 rounded">
                ${t.players.map(p => {
                    const roleColor = p.role === 'Duelist' ? 'text-red-400' : p.role === 'Sentinel' ? 'text-emerald-400' : p.role === 'Controller' ? 'text-blue-400' : p.role === 'Initiator' ? 'text-purple-400' : 'text-gray-400';
                    const isCap = p.discordId === t.captainDiscordId;
                    return `<div draggable="true" ondragstart="startDrag(event, '${p.discordId}', ${idx})" class="bg-gray-800 p-2 rounded border border-gray-700 cursor-move hover:border-valCyan/50 transition">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-white flex items-center gap-1">${p.displayName} ${isCap ? '<i class="fa-solid fa-crown text-yellow-400 text-[10px]"></i>' : ''}</span>
                            <span class="text-[10px] text-valRed font-mono">${p.pts || 0}đ</span>
                        </div>
                        <div class="text-[10px] ${roleColor}">${p.role || 'Chưa rõ'} - ${p.elo || 1200} ELO</div>
                    </div>`;
                }).join('')}
            </div>
            ${t.players.length === 0 ? `<button onclick="removeDraftTeam(${idx})" class="w-full mt-2 text-[10px] text-gray-500 hover:text-valRed text-center py-1 border border-gray-800 rounded bg-valBg/50"><i class="fa-solid fa-trash mr-1"></i>Xóa Đội</button>` : ''}
        </div>`;
    }).join('');
    
    statsEl.textContent = 'Tổng số tuyển thủ: ' + totalPlayers;
};

window.removeDraftTeam = function(idx) {
    window.draftState.teams.splice(idx, 1);
    window.renderDraftBoard();
};

window.startDrag = function(event, discordId, sourceIdx) {
    window.draggedPlayer = { discordId, sourceIdx };
    event.dataTransfer.setData('text/plain', discordId);
};

window.allowDrop = function(event) {
    event.preventDefault();
};

window.dropPlayer = function(event, targetIdx) {
    event.preventDefault();
    if (!window.draggedPlayer) return;
    const { discordId, sourceIdx } = window.draggedPlayer;
    if (sourceIdx === targetIdx) return;
    
    // Tìm player
    let player = null;
    if (sourceIdx === 'unassigned') {
        const pIdx = window.draftState.unassigned.findIndex(p => p.discordId === discordId);
        if (pIdx > -1) player = window.draftState.unassigned.splice(pIdx, 1)[0];
    } else {
        const t = window.draftState.teams[sourceIdx];
        const pIdx = t.players.findIndex(p => p.discordId === discordId);
        if (pIdx > -1) {
            player = t.players.splice(pIdx, 1)[0];
            // Nếu là captain rời đi, đổi captain
            if (t.captainDiscordId === discordId) {
                t.captainDiscordId = t.players.length > 0 ? t.players[0].discordId : null;
            }
            t.pts = t.players.reduce((s, p) => s + (p.pts || 0), 0);
        }
    }
    
    if (!player) return;
    
    // Gắn vào target
    if (targetIdx === 'unassigned') {
        window.draftState.unassigned.push(player);
    } else {
        const t = window.draftState.teams[targetIdx];
        if (t.players.length >= 5) {
            // Revert
            if (sourceIdx === 'unassigned') window.draftState.unassigned.push(player);
            else window.draftState.teams[sourceIdx].players.push(player);
            return window.showToast('Đội đã đủ 5 người!', 'error');
        }
        t.players.push(player);
        if (!t.captainDiscordId) t.captainDiscordId = player.discordId;
        t.pts = t.players.reduce((s, p) => s + (p.pts || 0), 0);
    }
    
    window.draggedPlayer = null;
    window.renderDraftBoard();
};
