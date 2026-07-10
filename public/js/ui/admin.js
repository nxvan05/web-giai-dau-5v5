window.adminSelectedPlayers = new Set();
window.adminPlayerList = [];

window.adminRefreshPlayers = async function() {
    if (!window.apiToken) return;
    try {
        window.adminPlayerList = await window.api('/api/players');
        window.apiPlayerCache = window.adminPlayerList;
        adminRenderPlayers();
    } catch(e) {}
};

window.adminRenderPlayers = function() {
    const tbody = document.getElementById('admin-player-table-body');
    const empty = document.getElementById('admin-player-table-empty');
    if (!tbody) return;
    const search = (document.getElementById('admin-player-search')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('admin-filter-role')?.value || '';
    const rankFilter = document.getElementById('admin-filter-rank')?.value || '';
    let list = window.adminPlayerList;
    if (search) {
        list = list.filter(p => {
            const name = (p.displayName || p.discord || '').toLowerCase();
            const riot = (p.riotId || '').toLowerCase();
            const discordId = (p.discordId || '').toLowerCase();
            const team = (p.teamId || '').toLowerCase();
            return name.includes(search) || riot.includes(search) || discordId.includes(search) || team.includes(search);
        });
    }
    if (roleFilter) list = list.filter(p => (p.role || '').toLowerCase().includes(roleFilter.toLowerCase()));
    if (rankFilter) list = list.filter(p => (p.rank || '').toLowerCase().includes(rankFilter.toLowerCase()));
    document.getElementById('admin-player-count').textContent = list.length + ' người chơi';
    if (list.length === 0) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');
    tbody.innerHTML = list.map(p => {
        const id = p.discordId || p.id;
        const checked = window.adminSelectedPlayers.has(id) ? 'checked' : '';
        const name = p.displayName || p.discord || 'Unknown';
        const rank = p.rank || 'N/A';
        const role = p.role || 'N/A';
        const riot = p.riotId || '-';
        const team = p.teamId || '';
        const rankClass = {'Iron':'text-gray-400','Bronze':'text-orange-400','Silver':'text-gray-300','Gold':'text-yellow-400','Platinum':'text-cyan-400','Diamond':'text-blue-400','Ascendant':'text-purple-400','Immortal':'text-red-400','Radiant':'text-yellow-200'}[rank.split(' ')[0]] || 'text-gray-400';
        return `<tr class="border-b border-gray-800/50 hover:bg-valBg/40 transition">
            <td class="py-2 px-2"><input type="checkbox" class="admin-player-cb accent-valCyan" data-id="${id}" ${checked} onchange="adminTogglePlayer('${id}')"></td>
            <td class="py-2 px-2"><span class="text-white font-bold cursor-pointer hover:text-valCyan" onclick="openEditPlayerModal('${id}')" title="Sửa">${name}</span></td>
            <td class="py-2 px-2 text-gray-400 hidden md:table-cell font-mono text-[10px]">${p.discordId || '-'}</td>
            <td class="py-2 px-2 text-gray-500 hidden lg:table-cell font-mono text-[10px]">${riot}</td>
            <td class="py-2 px-2"><span class="${rankClass} font-bold">${rank.split(' (')[0]}</span></td>
            <td class="py-2 px-2 text-valCyan hidden sm:table-cell">${role}</td>
            <td class="py-2 px-2 text-center"><span class="bg-gray-800 text-[10px] px-1.5 py-0.5 rounded font-bold text-white">${getPtsFromRank(p.peakRank||p.rank)}đ</span></td>
            <td class="py-2 px-2 text-center text-gray-400 hidden sm:table-cell">${p.elo || 1200}</td>
            <td class="py-2 px-2 text-center hidden md:table-cell"><span class="text-emerald-400">${p.wins||0}</span><span class="text-gray-600">/</span><span class="text-valRed">${p.losses||0}</span></td>
            <td class="py-2 px-2 text-left hidden xl:table-cell">${team ? '<span class="text-[10px] bg-valCyan/10 text-valCyan border border-valCyan/20 px-1.5 py-0.5 rounded-full">'+team+'</span>' : '<span class="text-gray-500 italic">Tự do</span>'}</td>
            <td class="py-2 px-2 text-left hidden xl:table-cell text-[10px] ${p.adminEvaluation ? 'text-gray-300' : 'text-gray-600'}">${p.adminEvaluation || '-'}</td>
            <td class="py-2 px-2 text-center"><div class="flex gap-1 justify-center">
                <button onclick="openEditPlayerModal('${id}')" class="text-gray-500 hover:text-valCyan px-1" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button onclick="removePlayer('${id}')" class="text-gray-500 hover:text-valRed px-1" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');
    adminUpdateBulkActions();
};

window.adminUpdateBulkActions = function() {
    const el = document.getElementById('admin-bulk-actions');
    if (!el) return;
    el.classList.toggle('hidden', window.adminSelectedPlayers.size === 0);
};

window.adminToggleAll = function() {
    const checked = document.getElementById('admin-select-all').checked;
    document.querySelectorAll('.admin-player-cb').forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.id;
        if (checked) window.adminSelectedPlayers.add(id);
        else window.adminSelectedPlayers.delete(id);
    });
    adminUpdateBulkActions();
};

window.adminTogglePlayer = function(id) {
    if (window.adminSelectedPlayers.has(id)) window.adminSelectedPlayers.delete(id);
    else window.adminSelectedPlayers.add(id);
    adminUpdateBulkActions();
};

window.adminBulkAssignTeam = async function() {
    const ids = [...window.adminSelectedPlayers];
    if (ids.length === 0) return;
    const teamName = prompt('Nhập tên đội để xếp ' + ids.length + ' người chơi:', '');
    if (!teamName) return;
    let count = 0;
    for (const id of ids) {
        try {
            const list = window.adminPlayerList;
            const p = list.find(x => (x.discordId || x.id) === id);
            if (p && p.id) {
                await window.api('/api/players/' + p.id, { method: 'PATCH', body: { teamId: teamName } });
                count++;
            }
        } catch(e) {}
    }
    window.showToast('Đã xếp ' + count + ' người vào đội ' + teamName, 'success');
    window.adminSelectedPlayers.clear();
    await adminRefreshPlayers();
};

window.adminBulkDelete = async function() {
    const ids = [...window.adminSelectedPlayers];
    if (ids.length === 0) return;
    if (!confirm('Xóa ' + ids.length + ' người chơi này?')) return;
    let count = 0;
    for (const id of ids) {
        try {
            const p = window.adminPlayerList.find(x => (x.discordId || x.id) === id);
            if (p && p.id) {
                await window.api('/api/players/' + p.id, { method: 'DELETE' });
                count++;
            }
        } catch(e) {}
    }
    window.showToast('Đã xóa ' + count + ' người chơi', 'success');
    window.adminSelectedPlayers.clear();
    await adminRefreshPlayers();
};

window.adminBulkSyncValtracker = async function() {
    const ids = [...window.adminSelectedPlayers];
    if (ids.length === 0) return;
    if (!confirm('Đồng bộ Valtracker (Rank & Stats) cho ' + ids.length + ' người chơi này? Có thể mất vài phút.')) return;
    
    let count = 0;
    const notifStr = ids.length + ' người chơi';
    window.showToast(`Đang đồng bộ Valtracker cho ${notifStr}...`, 'info');
    
    for (const id of ids) {
        try {
            const p = window.adminPlayerList.find(x => (x.discordId || x.id) === id);
            if (p && p.id) {
                // Sync Rank
                await window.api('/api/players/admin/refresh-rank/' + p.id, { method: 'POST' });
                // Sync Stats (Headshot%)
                await window.api('/api/players/admin/refresh-stats/' + p.id, { method: 'POST' });
                count++;
            }
        } catch(e) {
            console.error('Lỗi khi sync valtracker cho id:', id, e);
        }
    }
    window.adminSelectedPlayers.clear();
    await adminRefreshPlayers();
    window.showToast('Đã đồng bộ xong dữ liệu Valtracker cho ' + count + '/' + ids.length + ' người chơi', 'success');
};

window.removePlayer = async function(id) {
    if (!confirm('Xóa người chơi này?')) return;
    const p = window.adminPlayerList.find(x => (x.discordId || x.id) === id);
    if (p && p.id) {
        try { await window.api('/api/players/' + p.id, { method: 'DELETE' }); } catch(e) {}
    }
    await adminRefreshPlayers();
};

window.openAddPlayerModal = function() {
    const modal = document.getElementById('admin-player-modal');
    if (!modal) return;
    document.getElementById('admin-player-modal-title').textContent = 'Thêm Người Chơi';
    document.getElementById('admin-player-modal-refresh-btn')?.classList.add('hidden');
    document.getElementById('admin-player-modal-name').value = '';
    document.getElementById('admin-player-modal-discord').value = '';
    document.getElementById('admin-player-modal-riot').value = '';
    document.getElementById('admin-player-modal-rank').value = 'Unranked';
    document.getElementById('admin-player-modal-role').value = 'Duelist';
    document.getElementById('admin-player-modal-pts').value = '3';
    document.getElementById('admin-player-modal-elo').value = '1200';
    document.getElementById('admin-player-modal-team').value = '';
    document.getElementById('admin-player-modal-id').value = '';
    modal.classList.remove('hidden');
};

window.closeAddPlayerModal = function() {
    document.getElementById('admin-player-modal')?.classList.add('hidden');
};

window.adminSaveNewPlayer = async function() {
    const name = document.getElementById('admin-player-modal-name').value.trim();
    if (!name) return window.showToast('Nhập tên người chơi!', 'error');
    const body = {
        displayName: name,
        discordId: document.getElementById('admin-player-modal-discord').value.trim(),
        riotId: document.getElementById('admin-player-modal-riot').value.trim(),
        rank: document.getElementById('admin-player-modal-rank').value,
        role: document.getElementById('admin-player-modal-role').value,
        pts: parseInt(document.getElementById('admin-player-modal-pts').value) || 3,
        elo: parseInt(document.getElementById('admin-player-modal-elo').value) || 1200,
        teamId: document.getElementById('admin-player-modal-team').value.trim()
    };
    const editId = document.getElementById('admin-player-modal-id').value;
    try {
        if (editId) {
            await window.api('/api/players/' + editId, { method: 'PATCH', body });
        } else {
            await window.api('/api/players', { method: 'POST', body });
        }
        window.showToast(editId ? 'Đã cập nhật!' : 'Đã thêm!', 'success');
        closeAddPlayerModal();
        await adminRefreshPlayers();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    }
};

window.openEditPlayerModal = function(id) {
    const p = window.adminPlayerList.find(x => (x.discordId || x.id) === id);
    if (!p) return;
    const modal = document.getElementById('admin-player-modal');
    if (!modal) return;
    document.getElementById('admin-player-modal-title').textContent = 'Sửa Người Chơi';
    document.getElementById('admin-player-modal-refresh-btn')?.classList.remove('hidden');
    document.getElementById('admin-player-modal-name').value = p.displayName || p.discord || '';
    document.getElementById('admin-player-modal-discord').value = p.discordId || '';
    document.getElementById('admin-player-modal-riot').value = p.riotId || '';
    document.getElementById('admin-player-modal-rank').value = p.rank || 'Unranked';
    document.getElementById('admin-player-modal-role').value = p.role || 'Duelist';
    document.getElementById('admin-player-modal-pts').value = p.pts || 0;
    document.getElementById('admin-player-modal-elo').value = p.elo || 1200;
    document.getElementById('admin-player-modal-team').value = p.teamId || '';
    document.getElementById('admin-player-modal-id').value = p.id || '';
    modal.classList.remove('hidden');
};

window.adminRefreshRank = async function() {
    const id = document.getElementById('admin-player-modal-id').value;
    if (!id) return;
    
    const btn = document.getElementById('admin-player-modal-refresh-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
    
    try {
        window.showToast('Đang kết nối API Valorant...', 'info');
        const res = await window.api(`/api/players/admin/refresh-rank/${id}`, { method: 'POST' });
        
        // Update modal inputs
        document.getElementById('admin-player-modal-rank').value = res.rank;
        document.getElementById('admin-player-modal-pts').value = res.pts;
        
        window.showToast(`Cập nhật thành công: ${res.rank} (${res.pts} PTS)`, 'success');
        await adminRefreshPlayers();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
    }
};

window.adminEvaluatePlayer = async function() {
    const id = document.getElementById('admin-player-modal-id').value;
    if (!id) return;
    try {
        window.showToast('Đang đánh giá người chơi...', 'info');
        const res = await window.api(`/api/players/admin/evaluate/${id}`, { method: 'POST' });
        window.showToast(`Đã đánh giá: ${res.summary}`, 'success');
        await adminRefreshPlayers();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    }
};

window.adminEvaluateAllPlayers = async function() {
    if (!confirm('Đánh giá tất cả người chơi? Có thể mất thời gian nếu có nhiều người chơi.')) return;
    try {
        window.showToast('Đang đánh giá hàng loạt...', 'info');
        const res = await window.api(`/api/players/admin/evaluate-all`, { method: 'POST' });
        window.showToast(res.message, 'success');
        await adminRefreshPlayers();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    }
};

window.adminTeamData = [];
window.adminTeamModalName = '';

window.adminLoadTeams = async function() {
    if (!window.apiToken) return;
    try {
        const data = await window.api('/api/teams/all');
        window.adminTeamData = data || [];
        document.getElementById('admin-team-count-badge').textContent = data.length;
        adminRenderTeamCards();
    } catch(e) {}
};

// Legacy alias
window.adminRefreshTeams = window.adminLoadTeams;

window.adminRenderTeamCards = function() {
    const container = document.getElementById('admin-team-cards');
    const empty = document.getElementById('admin-team-cards-empty');
    if (!container) return;
    const search = (document.getElementById('admin-team-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('admin-team-filter-status')?.value || '';
    let list = window.adminTeamData;
    if (search) list = list.filter(t => (t.name || '').toLowerCase().includes(search));
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (list.length === 0) {
        container.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');
    const statusColors = { approved: 'text-emerald-400 bg-emerald-500/10', ready: 'text-amber-400 bg-amber-500/10', pending: 'text-gray-400 bg-gray-500/10', recruiting: 'text-blue-400 bg-blue-500/10', complete: 'text-valCyan bg-valCyan/10', rejected: 'text-valRed bg-valRed/10' };
    const statusLabels = { approved: 'Đã duyệt', ready: 'Sẵn sàng · Chờ duyệt', pending: 'Chờ duyệt', recruiting: 'Tuyển TV', complete: 'Hoàn chỉnh', rejected: 'Từ chối' };
    const sortBy = document.getElementById('admin-team-sort')?.value || 'pts';
    let listSorted = [...list].sort((a, b) => {
        const aRoster = a.rosterPlayers || [], bRoster = b.rosterPlayers || [];
        const aPts = aRoster.reduce((s,p) => s+getPtsFromRank(p.peakRank||p.rank), 0);
        const bPts = bRoster.reduce((s,p) => s+getPtsFromRank(p.peakRank||p.rank), 0);
        if (sortBy === 'pts') return bPts - aPts;
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'count') return bRoster.length - aRoster.length;
        if (sortBy === 'elo') {
            const aElo = aRoster.length ? aRoster.reduce((s,p) => s+(p.elo||1200),0)/aRoster.length : 0;
            const bElo = bRoster.length ? bRoster.reduce((s,p) => s+(p.elo||1200),0)/bRoster.length : 0;
            return bElo - aElo;
        }
        return 0;
    });
    container.innerHTML = listSorted.map(t => {
        const roster = t.rosterPlayers || [];
        const subsList = JSON.parse(t.substitutesJson || '[]');
        const mains = roster.filter(p => !subsList.includes(p.discordId));
        const subs = roster.filter(p => subsList.includes(p.discordId));
        const wins = roster.reduce((s, p) => s + (p.wins || 0), 0);
        const losses = roster.reduce((s, p) => s + (p.losses || 0), 0);
        const avgElo = roster.length ? Math.round(roster.reduce((s, p) => s + (p.elo || 1200), 0) / roster.length) : 0;
        const sc = statusColors[t.status] || 'text-gray-400 bg-gray-500/10';
        const sl = statusLabels[t.status] || t.status;
        const capName = roster.find(p => p.discordId === t.captainDiscordId);
        const pts = mains.reduce((s, p) => s + getPtsFromRank(p.peakRank||p.rank), 0);
        const ptsBreakdown = roster.map(p => (p.displayName||p.discord||'?') + ': ' + getPtsFromRank(p.peakRank||p.rank) + 'đ').join('\n');
        return `<div class="bg-valCard border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition cursor-pointer group" onclick="adminOpenTeamModal('${t.name}')">
            <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-white truncate">${t.name}</h4>
                        <p class="text-[10px] text-gray-500 mt-0.5">${capName ? capName.displayName || capName.discord : 'Chưa có captain'}</p>
                    </div>
                    <span class="text-[9px] ${sc} px-2 py-0.5 rounded-full font-bold shrink-0">${sl}</span>
                </div>
                <div class="flex items-center gap-3 text-[10px]">
                    <span class="text-yellow-400 font-black text-sm tracking-wider bg-yellow-400/10 px-2.5 py-0.5 rounded-lg border border-yellow-400/20" title="${ptsBreakdown}">${pts}p</span>
                    <span><i class="fa-solid fa-user text-valCyan mr-1"></i>${mains.length}/5 · ${subs.length}/2</span>
                    <span class="text-emerald-400">${wins}W</span>
                    <span class="text-valRed">${losses}L</span>
                    <span class="text-gray-500">${avgElo}elo</span>
                </div>
                <div class="flex flex-wrap gap-1">
                    ${roster.slice(0,7).map(p => {
                        const isSub = subsList.includes(p.discordId);
                        const pPts = getPtsFromRank(p.peakRank||p.rank);
                        return `<div class="relative group/av ${isSub ? 'opacity-60' : ''}" title="${(isSub?'[Dự Bị] ':'')}${p.displayName||p.discord||'?'} — ${pPts}đ · ${p.elo||0}elo · ${p.rank||''} (peak ${p.peakRank||p.rank||'?'})">
                            <img src="${getAvatarUrl(p.discordId, p.discordAvatar, 32)}" class="w-6 h-6 rounded-full border border-gray-700" onerror="this.style.display='none'">
                            <div class="absolute -bottom-1 -right-1 bg-yellow-400/90 text-[7px] text-black font-black px-0.5 rounded-full leading-none">${pPts}</div>
                        </div>`;
                    }).join('')}
                    ${mains.length < 5 ? `<div class="w-6 h-6 rounded-full border border-dashed border-gray-700 flex items-center justify-center text-[9px] text-gray-600">+${5-mains.length}</div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
};

function adminMemberRow(p, teamName, capDiscordId, subsList) {
  const isSub = subsList.includes(p.discordId);
  const isCap = p.discordId === capDiscordId;
  return `<div class="flex items-center justify-between bg-valBg/60 border ${isSub ? 'border-gray-700/50 opacity-70' : 'border-gray-800'} p-2 rounded-lg hover:bg-valBg/80 transition" onclick="openProfile('${p.discordId}')">
    <div class="flex items-center gap-2">
      <img src="${getAvatarUrl(p.discordId, p.discordAvatar, 32)}" class="w-6 h-6 rounded-full border border-gray-700" onerror="this.style.display='none'">
      <div class="min-w-0">
        <div class="flex items-center gap-1">
          <span class="text-white text-xs font-bold">${p.displayName || p.discord || '?'}</span>
          ${isCap ? '<span class="text-[9px] text-yellow-400 font-bold">C</span>' : ''}
          ${isSub ? '<span class="text-[8px] bg-gray-700/40 text-gray-500 px-1 rounded font-bold">Dự Bị</span>' : ''}
        </div>
        <div class="text-[9px] text-gray-500 truncate">${p.rank||''}${p.peakRank ? ' · Peak '+p.peakRank : ''} · ${p.role||'N/A'}${p.headshotPct != null ? ' · HS:' + p.headshotPct + '%' : ''}</div>
      </div>
    </div>
    <div class="flex gap-2 text-[10px] items-center">
      ${(function(){var _u = (typeof window.getRankIconUrl === 'function' ? window.getRankIconUrl(p.peakRank||p.rank) : ''); return _u ? '<img src="' + _u + '" class="w-4 h-4 inline-block mr-1 align-middle">' : '';})()}<span class="text-yellow-400 font-black">${getPtsFromRank(p.peakRank||p.rank)}đ</span>
      <span class="text-gray-400">${p.elo || 1200}</span>
      <span class="text-emerald-400">${p.wins||0}</span>
      <span class="text-valRed">${p.losses||0}</span>
      ${!isCap ? `<button onclick="event.stopPropagation();adminChangeCaptain('${teamName}','${p.discordId}','${(p.displayName||p.discord||'?').replace(/'/g, "\\'")   }')" class="text-gray-500 hover:text-yellow-400" title="Đặt làm Đội Trưởng"><i class="fa-solid fa-crown"></i></button>` : ''}
      ${!isCap ? `<button onclick="event.stopPropagation();adminToggleSubRole('${teamName}','${p.discordId}')" class="${isSub ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-500 hover:text-gray-300'}" title="${isSub ? 'Lên đánh chính' : 'Xuống dự bị'}"><i class="fa-solid fa-arrows-rotate"></i></button>` : ''}
      ${!isCap ? `<button onclick="event.stopPropagation();adminKickMember('${teamName}','${p.discordId}')" class="text-gray-500 hover:text-valRed" title="Kick"><i class="fa-solid fa-user-minus"></i></button>` : ''}
    </div>
  </div>`;
}
window.adminOpenTeamModal = async function(teamName) {
    window.adminTeamModalName = teamName;
    const modal = document.getElementById('admin-team-detail-modal');
    if (!modal) return;
    document.getElementById('admin-team-modal-name').textContent = teamName;
    try {
        const detail = await window.api('/api/teams/detail/' + encodeURIComponent(teamName));
        const roster = detail.roster || [];
        const matches = detail.matchHistory || [];
        const teamObj = detail.team || {};
        const capDiscordId = teamObj.captainDiscordId || (detail.captain && detail.captain.discordId) || '';
        const subsList = JSON.parse(teamObj.substitutesJson || '[]');
        const mains = roster.filter(p => !subsList.includes(p.discordId));
        const subRoster = roster.filter(p => subsList.includes(p.discordId));
        const totalPts = roster.reduce((s, p) => s + getPtsFromRank(p.peakRank||p.rank), 0);
        document.getElementById('tm-modal-pts').textContent = totalPts;
        document.getElementById('tm-modal-count').textContent = mains.length + '/5 chính + ' + subRoster.length + '/2 dự bị';
        document.getElementById('tm-modal-wins').textContent = detail.wins || 0;
        document.getElementById('tm-modal-losses').textContent = detail.losses || 0;
        document.getElementById('tm-modal-elo').textContent = roster.length ? Math.round(roster.reduce((s,p) => s+(p.elo||1200),0)/roster.length) : 0;
        const statusBadge = document.getElementById('admin-team-modal-status-badge');
        const statusLabels = { approved: 'Đã duyệt', ready: 'Sẵn sàng · Chờ duyệt', pending: 'Chờ duyệt', recruiting: 'Tuyển TV', complete: 'Hoàn chỉnh', rejected: 'Từ chối' };
        const statusColors = { approved: 'text-emerald-400 bg-emerald-500/10', ready: 'text-amber-400 bg-amber-500/10', pending: 'text-gray-400 bg-gray-500/10', recruiting: 'text-blue-400 bg-blue-500/10', complete: 'text-valCyan bg-valCyan/10', rejected: 'text-valRed bg-valRed/10' };
        const st = teamObj.status || detail.status || '';
        statusBadge.textContent = statusLabels[st] || st;
        
        statusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold ' + (statusColors[st] || 'text-gray-400 bg-gray-500/10');
        
        // Add Admin Action Buttons
        let actionHtml = '';
        if (st !== 'approved') {
            actionHtml += '<button onclick="adminUpdateTeamStatus(\'approved\')" class="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 text-[10px] px-2 py-1 rounded-md font-bold ml-2 transition">Duyệt</button>';
        }
        if (st !== 'rejected') {
            actionHtml += '<button onclick="adminUpdateTeamStatus(\'rejected\')" class="bg-valRed/20 hover:bg-valRed/40 text-valRed text-[10px] px-2 py-1 rounded-md font-bold ml-1 transition">Từ chối</button>';
        }
        if (st !== 'pending') {
            actionHtml += '<button onclick="adminUpdateTeamStatus(\'pending\')" class="bg-gray-500/20 hover:bg-gray-500/40 text-gray-400 text-[10px] px-2 py-1 rounded-md font-bold ml-1 transition">Set Pending</button>';
        }
        
        // Find if we already injected the actions container
        let actionsContainer = document.getElementById('admin-team-status-actions');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'admin-team-status-actions';
            statusBadge.parentNode.insertBefore(actionsContainer, statusBadge.nextSibling);
        }
        actionsContainer.innerHTML = actionHtml;

        // Roster
        let adminRosterHtml = '';

        // Main section
        adminRosterHtml += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1 mt-1"><i class="fa-solid fa-shield-halved mr-1"></i>Chính Thức (' + mains.length + '/5)</p>';
        for (const p of mains) {
            adminRosterHtml += adminMemberRow(p, teamName, capDiscordId, subsList);
        }
        for (let i = mains.length; i < 5; i++) {
            adminRosterHtml += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-800 p-2 rounded-lg text-[10px] text-gray-600"><i class="fa-solid fa-plus-circle text-gray-700"></i><span>Trống</span></div>';
        }

        // Sub section
        adminRosterHtml += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1 mt-3"><i class="fa-solid fa-chair mr-1"></i>Dự Bị (' + subRoster.length + '/2)</p>';
        for (const p of subRoster) {
            adminRosterHtml += adminMemberRow(p, teamName, capDiscordId, subsList);
        }
        for (let i = subRoster.length; i < 2; i++) {
            adminRosterHtml += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-700/50 p-2 rounded-lg text-[10px] text-gray-600"><i class="fa-solid fa-plus-circle text-gray-700"></i><span>Trống dự bị</span></div>';
        }

        document.getElementById('admin-team-modal-roster').innerHTML = adminRosterHtml || '<div class="text-gray-500 text-center py-4">Chưa có thành viên</div>';
        // Match history
        const matchHtml = matches.map(m => {
            const isWin = m.result === 'win' || m.winner === teamName;
            const result = m.status === 'completed' ? (isWin ? '<span class="text-emerald-400 font-bold">W</span>' : '<span class="text-valRed font-bold">L</span>') : '<span class="text-yellow-400">?</span>';
            return `<div class="flex items-center gap-2 bg-valBg/40 border border-gray-800 p-1.5 rounded-lg">
                <span>${result}</span>
                <span class="text-gray-300">${m.team1Name} vs ${m.team2Name}</span>
                <span class="text-gray-500">${m.score1 ?? '-'}-${m.score2 ?? '-'}</span>
            </div>`;
        }).join('');
        document.getElementById('admin-team-modal-matches').innerHTML = matchHtml || '<div class="text-gray-500 text-center py-4">Chưa có trận nào</div>';
    } catch(e) {}
    modal.classList.remove('hidden');
};

window.adminCloseTeamModal = function() {
    document.getElementById('admin-team-detail-modal')?.classList.add('hidden');
};

window.adminToggleSubRole = async function(teamName, discordId) {
  try {
    const res = await window.api('/api/teams/' + encodeURIComponent(teamName) + '/role', { method: 'PUT', body: { targetDiscordId: discordId } });
    window.showToast(res.isSubstitute ? 'Đã chuyển sang Dự Bị' : 'Đã chuyển sang Đánh Chính', 'success');
    adminOpenTeamModal(teamName);
  } catch(e) {
    window.showToast('Lỗi: ' + e.message, 'error');
  }
};

window.adminChangeCaptain = async function(teamName, newCaptainDiscordId, playerName) {
  if (!confirm('Đặt "' + playerName + '" làm Đội Trưởng mới của đội "' + teamName + '"?')) return;
  try {
    await window.api('/api/teams/' + encodeURIComponent(teamName) + '/captain', { method: 'PUT', body: { newCaptainDiscordId } });
    window.showToast('Đã chuyển quyền Đội Trưởng cho ' + playerName, 'success');
    adminOpenTeamModal(teamName);
    adminLoadTeams();
  } catch(e) {
    window.showToast('Lỗi: ' + e.message, 'error');
  }
};
window.adminCreateTeam = function() {
    document.getElementById('admin-ct-name').value = '';
    const capSelect = document.getElementById('admin-ct-captain');
    capSelect.innerHTML = '<option value="">-- Không chọn (Để trống) --</option>';
    
    // Fill captain options with free agents
    const freeAgents = (window.adminPlayerList || []).filter(p => !p.teamId);
    freeAgents.forEach(p => {
        capSelect.innerHTML += `<option value="${p.discordId}">${p.displayName || p.riotId || p.discordId}</option>`;
    });
    
    document.getElementById('admin-create-team-modal').classList.remove('hidden');
};

window.closeAdminCreateTeamModal = function() {
    document.getElementById('admin-create-team-modal').classList.add('hidden');
};

window.adminSubmitCreateTeam = function() {
    const name = document.getElementById('admin-ct-name').value.trim();
    if (!name) return window.showToast('Vui lòng nhập tên đội', 'error');
    const status = document.getElementById('admin-ct-status').value;
    const teamType = document.getElementById('admin-ct-type').value;
    const captainDiscordId = document.getElementById('admin-ct-captain').value;
    
    window.api('/api/teams/admin-create', { 
        method: 'POST', 
        body: { name, status, teamType, captainDiscordId: captainDiscordId || null } 
    })
    .then(() => { 
        window.showToast('Đã tạo đội ' + name, 'success'); 
        closeAdminCreateTeamModal();
        adminLoadTeams(); 
        adminRefreshPlayers(); // refresh free agents
    })
    .catch(e => window.showToast('Lỗi: ' + e.message, 'error'));
};

window.adminAddMemberToTeam = function() {
    const select = document.getElementById('admin-ap-discord');
    select.innerHTML = '<option value="">-- Chọn thành viên --</option>';
    
    // Fill with free agents
    const freeAgents = (window.adminPlayerList || []).filter(p => !p.teamId);
    freeAgents.forEach(p => {
        select.innerHTML += `<option value="${p.discordId}">${p.displayName || p.riotId || p.discordId}</option>`;
    });
    
    document.getElementById('admin-add-player-modal').classList.remove('hidden');
};

window.closeAdminAddPlayerModal = function() {
    document.getElementById('admin-add-player-modal').classList.add('hidden');
};

window.adminSubmitAddPlayer = function() {
    const discordId = document.getElementById('admin-ap-discord').value;
    if (!discordId) return window.showToast('Vui lòng chọn người chơi', 'error');
    
    const teamName = window.adminTeamModalName;
    window.api('/api/teams/' + encodeURIComponent(teamName) + '/admin-add-player', { method: 'POST', body: { discordId } })
        .then(() => { 
            window.showToast('Đã thêm vào đội!', 'success'); 
            closeAdminAddPlayerModal();
            adminOpenTeamModal(teamName); 
            adminLoadTeams(); 
            adminRefreshPlayers(); // refresh player data
        })
        .catch(e => window.showToast('Lỗi: ' + e.message, 'error'));
};

window.adminKickMember = async function(teamName, discordId) {
    if (!confirm('Xóa thành viên này khỏi đội?')) return;
    try {
        await window.api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + discordId, { method: 'DELETE' });
        window.showToast('Đã xóa thành viên!', 'success');
        adminOpenTeamModal(teamName);
        adminLoadTeams();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminRenameCurrentTeam = function() {
    const oldName = window.adminTeamModalName;
    const newName = prompt('Nhập tên mới cho đội ' + oldName + ':', oldName);
    if (!newName || newName === oldName) return;
    window.api('/api/teams/' + encodeURIComponent(oldName) + '/rename', { method: 'PUT', body: { newName } })
        .then(() => { window.showToast('Đã đổi tên!', 'success'); adminLoadTeams(); adminCloseTeamModal(); })
        .catch(e => window.showToast('Lỗi: ' + e.message, 'error'));
};

window.adminDeleteCurrentTeam = function() {
    const name = window.adminTeamModalName;
    if (!confirm('Xóa đội "' + name + '"?')) return;
    window.api('/api/teams/' + encodeURIComponent(name), { method: 'DELETE' })
        .then(() => { window.showToast('Đã xóa đội!', 'success'); adminLoadTeams(); adminCloseTeamModal(); })
        .catch(e => window.showToast('Lỗi: ' + e.message, 'error'));
};

window.adminResetAllTeams = async function() {
    if (!confirm('Reset tất cả đội về trạng thái Chờ duyệt?')) return;
    try {
        await window.api('/api/teams/reset-all-status', { method: 'PUT' });
        window.showToast('Đã reset tất cả đội!', 'success');
        adminLoadTeams();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminScoreReports = [];

window.loadScoreReports = async function() {
    if (!window.apiToken) return;
    try {
        const reports = await window.api('/api/matches/score-reports');
        window.adminScoreReports = reports;
        adminRenderReports();
    } catch(e) {}
};

window.adminRenderReports = function() {
    const tbody = document.getElementById('score-reports-table-body');
    const empty = document.getElementById('score-reports-empty');
    if (!tbody) return;
    const list = window.adminScoreReports;
    if (list.length === 0) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');
    tbody.innerHTML = list.map(r => {
        const m = r.match || {};
        const matchLabel = (m.team1Name && m.team2Name) ? m.team1Name + ' vs ' + m.team2Name : r.matchId || 'N/A';
        const status = r.status === 'pending' ? '<span class="text-yellow-400 text-[10px]">Chờ duyệt</span>' :
            r.status === 'approved' ? '<span class="text-emerald-400 text-[10px]">Đã duyệt</span>' :
            '<span class="text-valRed text-[10px]">Từ chối</span>';
        const isPending = r.status === 'pending';
        return `<tr class="border-b border-gray-800/50 hover:bg-valBg/40 transition">
            <td class="py-2 px-3"><span class="text-white font-bold text-xs">${matchLabel}</span></td>
            <td class="py-2 px-3 text-gray-400 hidden md:table-cell text-[10px]">${r.reportedBy || r.reportedByName || '-'}</td>
            <td class="py-2 px-3 text-center"><span class="text-white font-bold">${r.score1 || 0}</span><span class="text-gray-600"> - </span><span class="text-white font-bold">${r.score2 || 0}</span></td>
            <td class="py-2 px-3 text-center hidden sm:table-cell">${status}</td>
            <td class="py-2 px-3 text-right">${isPending ? `<div class="flex gap-1 justify-end">
                <button onclick="adminApproveReport('${r.id}')" class="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/30 transition"><i class="fa-solid fa-check"></i></button>
                <button onclick="adminRejectReport('${r.id}')" class="bg-valRed/20 text-valRed border border-valRed/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-valRed/30 transition"><i class="fa-solid fa-xmark"></i></button>
            </div>` : '<span class="text-gray-600 text-[10px]">Đã xử lý</span>'}</td>
        </tr>`;
    }).join('');
};

window.adminApproveReport = async function(id) {
    try {
        await window.api('/api/matches/score-reports/' + id + '/approve', { method: 'PUT' });
        window.showToast('Đã duyệt báo cáo!', 'success');
        await loadScoreReports();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminRejectReport = async function(id) {
    try {
        await window.api('/api/matches/score-reports/' + id + '/reject', { method: 'PUT' });
        window.showToast('Đã từ chối báo cáo', 'info');
        await loadScoreReports();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminMatchList = [];

window.adminRefreshMatchList = async function() {
    if (!window.apiToken) return;
    try {
        let res = await window.api('/api/matches');
        window.adminMatchList = res.data ? res.data : res;
        adminRenderMatches();
    } catch(e) {}
};

window.adminRenderMatches = function() {
    const tbody = document.getElementById('admin-match-table-body');
    const empty = document.getElementById('admin-match-table-empty');
    if (!tbody) return;
    const list = window.adminMatchList;
    if (list.length === 0) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');
    tbody.innerHTML = list.map(m => {
        const statusMap = {
            'scheduled': '<span class="text-yellow-400 text-[10px]">Chờ đấu</span>',
            'ongoing': '<span class="text-blue-400 text-[10px]">Đang đấu</span>',
            'completed': '<span class="text-emerald-400 text-[10px]">Xong</span>',
            'forfeit': '<span class="text-valRed text-[10px]">Forfeit</span>'
        };
        return `<tr class="border-b border-gray-800/50 hover:bg-valBg/40 transition">
            <td class="py-2 px-2"><span class="text-white font-bold text-xs">${m.team1Name || '???'} vs ${m.team2Name || '???'}</span></td>
            <td class="py-2 px-2 text-center hidden sm:table-cell"><span class="text-white font-bold">${m.score1 ?? '-'}</span><span class="text-gray-600">-</span><span class="text-white font-bold">${m.score2 ?? '-'}</span></td>
            <td class="py-2 px-2 text-center hidden md:table-cell text-gray-400">${m.round || m.group || '-'}</td>
            <td class="py-2 px-2 text-center">${statusMap[m.status] || '<span class="text-gray-500">N/A</span>'}</td>
            <td class="py-2 px-2 text-right"><div class="flex gap-1 justify-end">
                <button onclick="openAdminMatchModal('${m.id}')" class="text-gray-500 hover:text-amber-400 px-1" title="Sửa"><i class="fa-solid fa-pen"></i></button>
            </div></td>
        </tr>`;
    }).join('');
};

window.openCreateMatchModal = function() {
    const modal = document.getElementById('admin-create-match-modal');
    if (!modal) return;
    
    const team1Select = document.getElementById('admin-cm-team1');
    const team2Select = document.getElementById('admin-cm-team2');
    team1Select.innerHTML = '<option value="">-- Chọn Đội 1 --</option>';
    team2Select.innerHTML = '<option value="">-- Chọn Đội 2 --</option>';
    
    const teams = (window.adminTeamList || []).sort((a,b) => a.name.localeCompare(b.name));
    teams.forEach(t => {
        const status = t.status === 'complete' ? ' (Sẵn sàng)' : (t.status === 'recruiting' ? ' (Tuyển mem)' : '');
        team1Select.innerHTML += `<option value="${t.name}">${t.name}${status}</option>`;
        team2Select.innerHTML += `<option value="${t.name}">${t.name}${status}</option>`;
    });

    document.getElementById('admin-cm-round').value = '';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('admin-cm-date').value = now.toISOString().slice(0,16);

    modal.classList.remove('hidden');
};

window.closeCreateMatchModal = function() {
    document.getElementById('admin-create-match-modal')?.classList.add('hidden');
};

window.adminSubmitCreateMatch = async function() {
    const team1Name = document.getElementById('admin-cm-team1').value;
    const team2Name = document.getElementById('admin-cm-team2').value;
    const round = document.getElementById('admin-cm-round').value;
    const dateStr = document.getElementById('admin-cm-date').value;

    if (!team1Name || !team2Name) return window.showToast('Vui lòng chọn 2 đội!', 'error');
    if (team1Name === team2Name) return window.showToast('Hai đội không được trùng nhau!', 'error');
    
    const body = {
        team1Name,
        team2Name,
        round: round || 'Thủ Công',
        scheduledAt: dateStr ? new Date(dateStr).toISOString() : null
    };

    try {
        await window.api('/api/matches', { method: 'POST', body });
        window.showToast('Đã tạo trận đấu thành công!', 'success');
        closeCreateMatchModal();
        if (window.adminRefreshMatchList) await adminRefreshMatchList();
    } catch(e) { 
        window.showToast('Lỗi: ' + e.message, 'error'); 
    }
};

window.openGenerateMatchesModal = function() {
    const modal = document.getElementById('admin-generate-matches-modal');
    if (!modal) return;
    document.getElementById('admin-gen-format').value = 'round-robin';
    document.getElementById('admin-gen-rounds').value = '1';
    document.getElementById('admin-gen-start-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('admin-gen-include-playoff').checked = false;
    modal.classList.remove('hidden');
};

window.closeGenerateMatchesModal = function() {
    document.getElementById('admin-generate-matches-modal')?.classList.add('hidden');
};

window.adminGenerateMatches = async function() {
    const format = document.getElementById('admin-gen-format').value;
    const rounds = parseInt(document.getElementById('admin-gen-rounds').value) || 1;
    const startDate = document.getElementById('admin-gen-start-date').value;
    if (!startDate) return window.showToast('Chọn ngày bắt đầu!', 'error');
    try {
        await window.api('/api/matches/generate', {
            method: 'POST',
            body: { format, rounds, startDate, includePlayoff: document.getElementById('admin-gen-include-playoff').checked }
        });
        window.showToast('Đã tạo lịch thi đấu!', 'success');
        closeGenerateMatchesModal();
        await adminRefreshMatchList();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.openAdminMatchModal = async function(matchId) {
    const modal = document.getElementById('admin-match-modal');
    if (!modal) return;
    const m = window.adminMatchList.find(x => x.id === matchId);
    if (!m) return;
    document.getElementById('admin-match-modal-id').value = matchId;
    document.getElementById('admin-match-modal-title').textContent = 'Sửa Trận: ' + (m.team1Name || '???') + ' vs ' + (m.team2Name || '???');
    document.getElementById('admin-match-modal-team1').value = m.team1Name || '';
    document.getElementById('admin-match-modal-team2').value = m.team2Name || '';
    document.getElementById('admin-match-modal-score1').value = m.score1 ?? 0;
    document.getElementById('admin-match-modal-score2').value = m.score2 ?? 0;
    document.getElementById('admin-match-modal-status').value = m.status || 'scheduled';
    modal.classList.remove('hidden');
};

window.closeAdminMatchModal = function() {
    document.getElementById('admin-match-modal')?.classList.add('hidden');
};

window.adminSaveMatch = async function() {
    const id = document.getElementById('admin-match-modal-id').value;
    const body = {
        team1Name: document.getElementById('admin-match-modal-team1').value.trim(),
        team2Name: document.getElementById('admin-match-modal-team2').value.trim(),
        score1: parseInt(document.getElementById('admin-match-modal-score1').value) || 0,
        score2: parseInt(document.getElementById('admin-match-modal-score2').value) || 0,
        status: document.getElementById('admin-match-modal-status').value
    };
    try {
        await window.api('/api/matches/' + id, { method: 'PUT', body });
        window.showToast('Đã cập nhật trận!', 'success');
        closeAdminMatchModal();
        await adminRefreshMatchList();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminDeleteMatch = async function() {
    const id = document.getElementById('admin-match-modal-id').value;
    if (!confirm('Xóa trận này?')) return;
    try {
        await window.api('/api/matches/' + id, { method: 'DELETE' });
        window.showToast('Đã xóa trận!', 'success');
        closeAdminMatchModal();
        await adminRefreshMatchList();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.loadAdminDashboard = async function() {
    if (!window.apiToken) return;
    try {
        const [players, matches, audit] = await Promise.all([
            window.api('/api/players'),
            window.api('/api/matches'),
            window.api('/api/audit')
        ]);
        document.getElementById('dash-stat-players').textContent = players.length;
        document.getElementById('dash-stat-matches').textContent = matches.length;
        document.getElementById('dash-stat-completed').textContent = matches.filter(m => m.status === 'completed').length;
        const teams = new Set(players.filter(p => p.teamId).map(p => p.teamId));
        document.getElementById('dash-stat-teams').textContent = teams.size;

        // Rank chart
        const rankOrder = ['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal','Radiant'];
        const rankCounts = rankOrder.map(r => players.filter(p => (p.rank || '').startsWith(r)).length);
        const ctx1 = document.getElementById('dash-rank-chart');
        if (ctx1 && window.Chart) {
            if (window._dashRankChart) window._dashRankChart.destroy();
            window._dashRankChart = new Chart(ctx1, {
                type: 'doughnut',
                data: { labels: rankOrder, datasets: [{ data: rankCounts, backgroundColor: ['#78716c','#d97706','#9ca3af','#facc15','#06b6d4','#3b82f6','#a855f7','#ef4444','#fef08a'] }] },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // Wins chart (top 5)
        const sorted = [...players].sort((a,b) => (b.wins||0) - (a.wins||0)).slice(0,5);
        const ctx2 = document.getElementById('dash-wins-chart');
        if (ctx2 && window.Chart) {
            if (window._dashWinsChart) window._dashWinsChart.destroy();
            window._dashWinsChart = new Chart(ctx2, {
                type: 'bar',
                data: { labels: sorted.map(p => p.displayName || p.discord || '?'), datasets: [{ label: 'Thắng', data: sorted.map(p => p.wins||0), backgroundColor: '#06b6d4' }] },
                options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9ca3af' } }, y: { ticks: { color: '#9ca3af' } } } }
            });
        }

        // Activity feed
        const feed = document.getElementById('dash-activity-feed');
        if (feed) {
            const logs = (audit || []).slice(-20).reverse();
            feed.innerHTML = logs.length ? logs.map(l => `<div class="flex items-start gap-2 bg-valBg/40 border border-gray-800 p-2 rounded-lg">
                <div class="w-1.5 h-1.5 rounded-full bg-valCyan mt-1.5 shrink-0"></div>
                <div>
                    <p class="text-gray-300">${escHtml(l.action || l.detail || '')}</p>
                    <p class="text-gray-600 text-[9px]">${l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : ''}</p>
                </div>
            </div>`).join('') : '<div class="text-gray-500 text-center py-4">Chưa có hoạt động</div>';
        }
    } catch(e) {}
};

window.adminLoadSettings = async function() {
    if (!window.apiToken) return;
    try {
        const settings = await window.api('/api/settings');
        const getName = (key) => { const s = settings.find(x => x.key === key); return s ? s.value : ''; };
        document.getElementById('admin-settings-name').value = getName('tournament_name');
        document.getElementById('admin-settings-rounds').value = getName('num_rounds') || '1';
    } catch(e) {}
};

window.adminSaveSettings = async function() {
    const name = document.getElementById('admin-settings-name').value.trim();
    const rounds = document.getElementById('admin-settings-rounds').value || '1';
    try {
        await window.api('/api/settings/tournament_name', { method: 'PUT', body: { key: 'tournament_name', value: name } });
        await window.api('/api/settings/num_rounds', { method: 'PUT', body: { key: 'num_rounds', value: rounds } });
        window.showToast('Đã lưu cấu hình!', 'success');
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.adminResetTournament = async function() {
    try {
        await window.api('/api/settings/reset-tournament', { method: 'POST' });
        window.showToast('Đã reset giải đấu!', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.renderAdmin = async function() {
    await adminRefreshPlayers();
    if (document.getElementById('admin-sub-teams')?.classList.contains('hidden') === false) {
        await adminLoadTeams();
        await adminRefreshMatchList();
    }
};

window.adminUpdateTeamStatus = async function(status) {
    const teamName = window.adminTeamModalName;
    if (!confirm('Xác nhận đổi trạng thái đội thành ' + status + '?')) return;
    try {
        await window.api('/api/teams/' + encodeURIComponent(teamName) + '/status', { method: 'PUT', body: { status } });
        window.showToast('Đã cập nhật trạng thái!', 'success');
        adminOpenTeamModal(teamName);
        adminLoadTeams();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};
