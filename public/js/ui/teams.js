window.pendingRequestsMap = window.pendingRequestsMap || {};
window.getSubstitutes = function(team) {
  try { return JSON.parse(team.substitutesJson || '[]'); } catch(e) { return []; }
};
window.isPlayerSubstitute = function(team, discordId) {
  return window.getSubstitutes(team).includes(discordId);
};
window.getActivePts = function(team, rosterPlayers) {
  const subs = window.getSubstitutes(team);
  return (rosterPlayers || []).reduce((s, p) => subs.includes(p.discordId) ? s : s + (p.pts || getPtsFromRank(p.peakRank||p.rank)), 0);
};
window.toggleSubstituteRole = async function(teamName, targetDiscordId, btnEl) {
  if (!confirm('Chuyển đổi trạng thái Đánh Chính / Dự Bị cho thành viên này?')) return;
  try {
    const res = await window.api('/api/teams/' + encodeURIComponent(teamName) + '/role', { method: 'PUT', body: { targetDiscordId } });
    window.showToast(res.isSubstitute ? 'Đã chuyển sang Dự Bị' : 'Đã chuyển sang Đánh Chính', 'success');
    loadTeamsBrowser();
  } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};
window.openTeamDetail = async function(teamName) {
            if (!teamName || teamName === 'Chưa có' || teamName === '-') return;
            window.showLoading('Đang tải thông tin đội...');
            try {
                const data = await window.api('/api/teams/detail/' + encodeURIComponent(teamName));
                window.hideLoading();
                document.getElementById('team-modal-title').textContent = data.team.name;
                const modalStatusLabels = {approved:'✅ Đã duyệt',ready:'⏳ Sẵn sàng · Chờ duyệt',pending:'⏳ Chờ duyệt',recruiting:'📢 Tuyển TV',complete:'✅ Hoàn chỉnh',rejected:'❌ Từ chối'};
                document.getElementById('team-modal-status').textContent = modalStatusLabels[data.team.status] || '⏳ Chờ duyệt';
                document.getElementById('team-modal-captain').textContent = data.captain ? data.captain.displayName + ' (' + data.team.captainDiscordId + ')' : (data.team.captainDiscordId || 'Không có');
                document.getElementById('team-modal-wins').textContent = data.wins;
                document.getElementById('team-modal-losses').textContent = data.losses;
                const total = data.wins + data.losses;
                document.getElementById('team-modal-wr').textContent = total > 0 ? Math.round(data.wins / total * 100) + '%' : '-';
                const rosterEl = document.getElementById('team-modal-roster');
                if (data.roster && data.roster.length > 0) {
                    const isCaptain = window.discordUser && data.team.captainDiscordId === window.discordUser.discordId;
                    const subs = window.getSubstitutes(data.team);
                    const mains = data.roster.filter(r => !subs.includes(r.discordId));
                    const subRoster = data.roster.filter(r => subs.includes(r.discordId));
                    let html = '';

                    // Main members section
                    html += '<div class="col-span-full text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1 mt-1"><i class="fa-solid fa-shield-halved mr-1"></i>Chính Thức (' + mains.length + '/5)</div>';
                    for (const r of mains) {
                        const canKick = isCaptain && r.discordId !== data.team.captainDiscordId;
                        html += detailMemberCard(r, false, canKick, isCaptain, data.team);
                    }
                    // Empty main slots
                    for (let i = mains.length; i < 5; i++) {
                        html += '<div class="bg-valBg/40 border border-dashed border-gray-800 p-3 rounded-xl flex items-center justify-center text-gray-600 text-xs"><i class="fa-solid fa-plus-circle mr-1 text-gray-700"></i>Trống</div>';
                    }

                    // Sub members section
                    html += '<div class="col-span-full text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1 mt-3"><i class="fa-solid fa-chair mr-1"></i>Dự Bị (' + subRoster.length + '/2)</div>';
                    for (const r of subRoster) {
                        const canKick = isCaptain && r.discordId !== data.team.captainDiscordId;
                        html += detailMemberCard(r, true, canKick, isCaptain, data.team);
                    }
                    // Empty sub slots
                    for (let i = subRoster.length; i < 2; i++) {
                        html += '<div class="bg-valBg/40 border border-dashed border-gray-700/50 p-3 rounded-xl flex items-center justify-center text-gray-600 text-xs"><i class="fa-solid fa-plus-circle mr-1 text-gray-700"></i>Trống dự bị</div>';
                    }

                    rosterEl.innerHTML = html;
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
                window.hideLoading();
                window.showToast('Lỗi tải thông tin đội: ' + e.message, 'error');
            }
        }
window.closeTeamDetail = function() {
            document.getElementById('team-modal').classList.add('hidden');
        }
window.openCreateTeamModal = function() {
            document.getElementById('create-team-modal').classList.remove('hidden');
        }
window.closeCreateTeamModal = function() {
            document.getElementById('create-team-modal').classList.add('hidden');
        }
window.submitCreateTeam = async function() {
            const name = document.getElementById('create-team-name').value.trim();
            if (!name) return window.showToast('Nhập tên đội!', 'error');
            if (name.length < 3) return window.showToast('Tên đội tối thiểu 3 ký tự!', 'error');
            const type = document.getElementById('create-team-type').value;
            try {
                const team = await window.api('/api/teams/create-from-registration', {
                    method: 'POST',
                    body: { name, type, discordId: window.discordUser.discordId, displayName: window.discordUser.discordUsername }
                });
                window.showToast('Đã tạo đội ' + team.name + '!', 'success');
                closeCreateTeamModal();
                loadTeamsBrowser();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.confirmKickMember = async function(teamName, targetDiscordId, targetName) {
            if (!confirm('Bạn có chắc chắn muốn đá "' + targetName + '" ra khỏi đội ' + teamName + ' không?')) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + targetDiscordId, { method: 'DELETE' });
                window.showToast('Đã đá ' + targetName + ' khỏi đội!', 'success');
                closeTeamDetail();
                openTeamProfile(teamName);
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
        // Make team names clickable — call this after rendering any team name
window.loadPendingTeams = async function() {
            if (!requireAdminAuth()) return;
            try {
                const filter = document.getElementById('admin-team-status-filter')?.value || 'pending';
                const teams = await window.api('/api/teams/all');
                const container = document.getElementById('pending-teams-list');
                const filteredTeams = filter === 'all' ? teams : teams.filter(t => t.status === filter);
                
                if (filteredTeams.length === 0) { 
                    container.innerHTML = '<p class="text-gray-500 text-center py-2">Không có đội nào</p>'; 
                    return; 
                }
                container.innerHTML = filteredTeams.map(t => {
                    const roster = JSON.parse(t.rosterJson || '[]');
                    const statusLabels = {approved:'Đã duyệt',ready:'Sẵn sàng',pending:'Chờ duyệt',recruiting:'Tuyển TV',complete:'Hoàn chỉnh',rejected:'Từ chối'};
                    const sl = statusLabels[t.status] || t.status;
                    
                    let buttonsHtml = '';
                    if (t.status === 'pending' || t.status === 'rejected' || t.status === 'recruiting') {
                        buttonsHtml += '<button onclick="approveTeam(\'' + t.id + '\')" class="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/30 transition">Duyệt</button>';
                    }
                    if (t.status === 'pending' || t.status === 'approved' || t.status === 'recruiting' || t.status === 'complete' || t.status === 'ready') {
                        buttonsHtml += '<button onclick="rejectTeam(\'' + t.id + '\')" class="bg-red-500/20 text-red-400 border border-red-400/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-500/30 transition">Từ chối</button>';
                    }
                    buttonsHtml += '<button onclick="disbandTeam(\'' + t.id + '\')" class="bg-gray-500/20 text-gray-400 border border-gray-400/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-gray-500/30 transition">Xoá</button>';

                    return '<div class="bg-valBg border border-gray-700/50 p-3 rounded-xl hover:border-valCyan/30 transition">' +
                        '<div class="flex justify-between items-center">' +
                        '<div><span class="text-white font-bold">' + window.escHtml(t.name) + '</span>' +
                        '<span class="text-[9px] bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400 ml-2">' + sl + '</span></div>' +
                        '<div class="flex gap-1">' + buttonsHtml + '</div></div>' +
                        '<div class="text-[10px] text-gray-500 mt-1">' + roster.length + ' thành viên · Cpt: ' + t.captainDiscordId + '</div></div>';
                }).join('');
            } catch(e) {
                document.getElementById('pending-teams-list').innerHTML = '<p class="text-gray-500 text-center py-2">Lỗi tải</p>';
            }
        }
window.approveTeam = async function(id) {
            try {
                await window.api('/api/teams/' + id + '/approve', { method: 'PUT' });
                window.showToast('Đã duyệt đội!', 'success');
                loadPendingTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.rejectTeam = async function(id) {
            try {
                await window.api('/api/teams/' + id + '/reject', { method: 'PUT' });
                window.showToast('Đã từ chối đội!', 'success');
                loadPendingTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
function profileMemberCard(p, team) {
  const isSub = JSON.parse(team.substitutesJson || '[]').includes(p.discordId);
  const isCap = p.discordId === team.captainDiscordId;
  const roleColor = p.role === 'Duelist' ? 'text-red-400' : p.role === 'Sentinel' ? 'text-emerald-400' : p.role === 'Controller' ? 'text-blue-400' : p.role === 'Initiator' ? 'text-purple-400' : 'text-gray-400';
  return `
    <div class="bg-valBg/60 border ${isSub ? 'border-gray-700/50 opacity-70' : 'border-gray-800'} p-3 rounded-xl flex items-center gap-3 hover:border-valCyan/50 transition group relative">
      <img src="${getAvatarUrl(p.discordId, p.discordAvatar, 64)}" class="w-10 h-10 rounded-lg cursor-pointer" onclick="openProfile('${p.discordId}')" data-discord-id="${p.discordId||''}" data-name="${(p.displayName||'?').replace(/"/g,'&quot;')}" onerror="this.src=window.getFallbackAvatar('${p.discordId||''}','${(p.displayName||'?').replace(/'/g,"\\'")}',64)">
      <div class="flex-1 cursor-pointer" onclick="openProfile('${p.discordId}')">
        <p class="text-sm font-bold text-white flex items-center gap-1">${p.displayName} <i class="fa-solid fa-magnifying-glass-chart text-gray-500 hover:text-valCyan ml-1 transition-colors cursor-pointer" onclick="event.stopPropagation(); openProfile('${p.discordId}', true)" title="Xem Tracker KDA"></i> ${isCap ? '<i class="fa-solid fa-crown text-yellow-400 text-[10px]" title="Đội trưởng"></i>' : ''}${isSub ? '<span class="text-[9px] bg-gray-600/40 text-gray-400 px-1.5 py-0.5 rounded font-bold text-[9px]"><i class="fa-solid fa-chair mr-0.5"></i>Dự Bị</span>' : ''}</p>
        <p class="text-[10px] text-gray-400">${p.riotId || 'Chưa cập nhật'}</p>
        <p class="text-xs ${roleColor}">${p.role} - ${p.elo} ELO ${p.rank ? '· ' + ((function(){var _u = p.peakIconUrl || p.rankIconUrl || (typeof window.getRankIconUrl === 'function' ? window.getRankIconUrl(p.peakRank || p.rank) : ''); return _u ? '<img src="' + _u + '" class="w-3 h-3 inline-block align-middle mr-0.5">' : '';})()) + (p.peakRank || p.rank) : ''}${p.headshotPct != null ? ' · HS: ' + p.headshotPct + '%' : ''}</p>
      </div>
      ${(!isCap && window.isAdmin) ? `
        <button class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 transition" onclick="changeCaptain('${team.name}', '${p.discordId}')" title="Chuyển quyền Đội Trưởng">
          <i class="fa-solid fa-crown"></i>
        </button>
      ` : ''}
    </div>
  `;
}
function detailMemberCard(r, isSub, canKick, isCaptain, team) {
  const isCap = r.discordId === team.captainDiscordId;
  return `<div class="bg-valBg/60 border ${isSub ? 'border-gray-700/50 opacity-70' : 'border-gray-800'} p-3 rounded-xl text-center">
    <div class="flex justify-center mb-1">
      <img src="${getAvatarUrl(r.discordId, r.discordAvatar, 64)}" class="w-10 h-10 rounded-full border-2 border-gray-700 cursor-pointer hover:ring-2 hover:ring-valCyan transition" onclick="openProfile('${r.discordId}')" title="Xem hồ sơ" data-discord-id="${r.discordId||''}" data-name="${(r.displayName||'?').replace(/"/g,'&quot;')}" onerror="this.src=window.getFallbackAvatar('${r.discordId||''}','${(r.displayName||'?').replace(/'/g,"\\'")}',64)">
    </div>
    <p class="text-[10px] text-white font-bold truncate cursor-pointer hover:text-valCyan" onclick="openProfile('${r.discordId}')" title="Xem hồ sơ">${r.displayName}</p>
    <p class="text-[9px] text-gray-500">${r.rankIconUrl ? '<img src="' + r.rankIconUrl + '" class="w-3 h-3 inline-block align-middle mr-0.5">' : ''}${r.rank || ''}${(r.rank && r.peakRank) ? ' · ' : ''}${r.peakRank ? 'Peak ' + r.peakRank : ''}</p>
    <p class="text-[9px] text-gray-500">${r.role || ''} · ${r.elo}elo${r.headshotPct != null ? ' · HS: ' + r.headshotPct + '%' : ''}</p>
    <p class="text-[10px] text-yellow-400 font-mono font-bold">${getPtsFromRank(r.peakRank||r.rank)}đ</p>
    ${isSub ? '<p class="text-[8px] text-gray-500"><i class="fa-solid fa-chair"></i> Dự Bị</p>' : ''}
    ${canKick ? `<div class="flex justify-center gap-1 mt-1"><button onclick="toggleSubstituteRole('${team.name}', '${r.discordId}', this)" class="text-[9px] bg-gray-700/40 hover:bg-gray-600 border border-gray-600/30 text-gray-300 px-1.5 py-0.5 rounded transition" title="${isSub ? 'Lên Đánh Chính' : 'Xuống Dự Bị'}"><i class="fa-solid fa-arrows-rotate"></i></button><button onclick="confirmKickMember('${team.name}', '${r.discordId}', '${r.displayName.replace(/'/g, "\\'")}')" class="text-[9px] bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-200 px-1.5 py-0.5 rounded transition"><i class="fa-solid fa-user-minus mr-0.5"></i>Đá</button></div>` : ''}
    ${isCap ? '<p class="text-[8px] text-emerald-400 mt-1"><i class="fa-solid fa-crown"></i> Đội trưởng</p>' : ''}
  </div>`;
}
function memberRowHtml(rid, p, name, isCap, isSub, isCaptain, team) {
  let h = '<div class="flex items-center justify-between bg-valBg/60 border ' + (isSub ? 'border-gray-700/50 opacity-70' : 'border-gray-800') + ' p-2.5 rounded-lg hover:border-valCyan/30 transition">';
  h += '<div class="flex items-center gap-2 min-w-0 flex-1">';
  h += '<img src="' + getAvatarUrl(rid, p?.discordAvatar, 32) + '" class="w-7 h-7 rounded-full border border-gray-700 cursor-pointer hover:ring-2 hover:ring-valCyan transition shrink-0" onclick="openProfile(\'' + rid + '\')" title="Xem hồ sơ" data-discord-id="' + (rid||'') + '" data-name="' + ((name||'?').replace(/"/g,'&quot;')) + '" onerror="this.src=window.getFallbackAvatar(\'' + (rid||'') + '\',\'' + ((name||'?').replace(/'/g,"\\'")) + '\',32)">';
  h += '<div class="min-w-0"><span class="text-white text-sm font-bold cursor-pointer hover:text-valCyan" onclick="openProfile(\'' + rid + '\')">' + window.escHtml(name) + '</span>';
  h += '<span class="text-[8px] text-gray-500 block truncate">' + (p ? (p.rank||'') + (p.peakRank ? ' · Peak ' + p.peakRank : '') + ' · ' + (p.elo || 0) + 'elo · ' + getPtsFromRank(p.peakRank||p.rank) + 'đ' : '') + '</span></div>';
  if (isCap) h += '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold border border-yellow-400/30 shrink-0 ml-2"><i class="fa-solid fa-crown mr-0.5"></i>Đội Trưởng</span>';
  if (isSub) h += '<span class="text-[9px] bg-gray-600/30 text-gray-400 px-2 py-0.5 rounded font-bold shrink-0 ml-2"><i class="fa-solid fa-chair mr-0.5"></i>Dự Bị</span>';
  h += '</div>';
  const roleBtnId = 'role-btn-' + rid.replace(/[^a-zA-Z0-9]/g, '');
  if (isCaptain && !isCap) {
    h += '<div class="flex gap-1 shrink-0">';
    h += '<button id="' + roleBtnId + '" onclick="toggleSubstituteRole(\'' + team.name + '\',\'' + rid + '\', this)" class="text-[10px] ' + (isSub ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-400 hover:text-gray-300') + ' hover:bg-gray-700/30 p-1.5 rounded transition" title="' + (isSub ? 'Chuyển lên Đánh Chính' : 'Chuyển xuống Dự Bị') + '"><i class="fa-solid fa-arrows-rotate"></i></button>';
    h += '<button onclick="confirmKickMember(\'' + team.name + '\',\'' + rid + '\',\'' + window.escHtml(name).replace(/'/g, "\\'") + '\')" class="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/30 p-1.5 rounded transition" title="Đá thành viên"><i class="fa-solid fa-user-minus"></i></button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}
window.loadTeamsBrowser = async function() {
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
                if (window.discordUser) {
                    myPlayer = await window.api('/api/players/lookup/' + window.discordUser.discordId).catch(() => null);
                    myTeamName = myPlayer?.teamId || null;
                }
                window.currentPlayerTeam = myTeamName;

                const teams = await window.api('/api/teams/all');
                window.allTeams = teams;
                const countEl = document.getElementById('teams-count');
                if (countEl) countEl.textContent = teams.length + ' đội';

                // === My Team Section ===
                if (mySection && myContent) {
                    if (myTeamName) {
                        mySection.classList.remove('hidden');
                        const team = teams.find(t => t.name === myTeamName);
                        if (team) {
                            const roster = JSON.parse(team.rosterJson || '[]');
                            const subs = window.getSubstitutes(team);
                            const isCaptain = window.discordUser && team.captainDiscordId === window.discordUser.discordId;
                            const size = roster.length;
                            const maxMembers = team.teamType === 'team5' ? 7 : 5;
                            let html = '';

                            if (isCaptain) {
                                html += '<div class="flex items-center gap-2">';
                                html += '<input type="text" id="my-team-name-input" value="' + window.escHtml(team.name) + '" class="bg-valBg border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold outline-none focus:border-valCyan flex-1">';
                                html += '<button onclick="renameTeam()" class="text-[10px] bg-valCyan/20 text-valCyan border border-valCyan/30 px-2 py-1.5 rounded-lg font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-pen"></i></button>';
                                html += '</div>';
                            } else {
                                const safeName = team.name.replace(/'/g, "\\'");
                                html += '<h4 class="text-white font-bold text-lg cursor-pointer hover:text-valCyan transition" onclick="openTeamProfile(\'' + safeName + '\')">' + window.escHtml(team.name) + ' <i class="fa-solid fa-up-right-from-square text-[10px] text-gray-500 ml-1"></i></h4>';
                            }

                            const statusLabels = {approved:'✅ Đã duyệt',ready:'⏳ Sẵn sàng · Chờ duyệt',pending:'⏳ Chờ duyệt',recruiting:'📢 Tuyển TV',complete:'✅ Hoàn chỉnh',rejected:'❌ Từ chối'};
                            const statusColors = {approved:'text-emerald-400',ready:'text-amber-400',pending:'text-gray-400',recruiting:'text-blue-400',complete:'text-valCyan',rejected:'text-valRed'};
                            const sl = statusLabels[team.status] || team.status;
                            const sc = statusColors[team.status] || 'text-gray-400';
                            const rosterPlayers = team.rosterPlayers || [];
                            const activePts = window.getActivePts(team, rosterPlayers);
                            const allPts = rosterPlayers.reduce((s, p) => s + getPtsFromRank(p.peakRank||p.rank), 0);
                            const mains = roster.filter(id => !subs.includes(id));
                            const subMembers = roster.filter(id => subs.includes(id));
                            html += '<div class="flex items-center gap-3 flex-wrap"><span class="text-[10px] ' + sc + ' font-bold uppercase">' + sl + '</span>';
                            html += '<span class="text-[10px] text-gray-500">' + mains.length + ' chính + ' + subMembers.length + ' dự bị</span>';
                            html += '<span class="text-[10px] text-yellow-400 font-mono font-bold">' + activePts + 'đ <span class="text-gray-500 text-[8px]">(tổng ' + allPts + 'đ)</span></span></div>';

                            html += '<div class="space-y-1.5">';
                            const rosterMap = {};
                            for (const rp of rosterPlayers) rosterMap[rp.discordId] = rp;

                            // Label: Chính Thức
                            if (mains.length > 0) {
                              html += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-1 mb-1"><i class="fa-solid fa-shield-halved mr-1"></i>Chính Thức (' + mains.length + '/5)</p>';
                              for (const rid of mains) {
                                const p = rosterMap[rid] || null;
                                const name = p ? p.displayName : rid;
                                const isCap = rid === team.captainDiscordId;
                                html += memberRowHtml(rid, p, name, isCap, false, isCaptain, team);
                              }
                            }
                            // Fill empty main slots
                            for (let i = mains.length; i < 5; i++) {
                              html += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-800 p-2.5 rounded-lg text-xs text-gray-600"><i class="fa-solid fa-plus-circle text-gray-700"></i><span>Trống</span></div>';
                            }

                            // Label: Dự Bị
                            html += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-3 mb-1"><i class="fa-solid fa-chair mr-1"></i>Dự Bị (' + subMembers.length + '/2)</p>';
                            if (subMembers.length > 0) {
                              for (const rid of subMembers) {
                                const p = rosterMap[rid] || null;
                                const name = p ? p.displayName : rid;
                                const isCap = rid === team.captainDiscordId;
                                html += memberRowHtml(rid, p, name, isCap, true, isCaptain, team);
                              }
                            }
                            // Fill empty sub slots
                            for (let i = subMembers.length; i < 2; i++) {
                              html += '<div class="flex items-center gap-2 bg-valBg/30 border border-dashed border-gray-700/50 p-2.5 rounded-lg text-xs text-gray-600"><i class="fa-solid fa-plus-circle text-gray-700"></i><span>Trống</span></div>';
                            }
                            html += '</div>';

                            if (isCaptain) {
                                try {
                                    const requests = await window.api('/api/teams/' + encodeURIComponent(team.name) + '/requests');
                                    const pending = requests.filter(r => r.status === 'pending');
                                    html += '<div class="border-t border-gray-800 pt-3 mt-3">';
                                    html += '<h5 class="text-xs font-bold text-amber-400 uppercase mb-2"><i class="fa-solid fa-envelope mr-1"></i>Đơn Xin Vào (' + pending.length + ')</h5>';
                                    if (pending.length === 0) {
                                        html += '<p class="text-xs text-gray-500">Chưa có đơn xin vào đội</p>';
                                    } else {
                                        for (const r of pending) {
                                            html += '<div class="flex items-center justify-between bg-valBg/40 border border-gray-800 p-3 rounded-lg mb-2">';
                                            html += '<div><p class="text-sm text-white font-bold">' + window.escHtml(r.playerName) + '</p><p class="text-[10px] text-gray-500 font-mono">' + r.playerDiscordId + '</p></div>';
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
                        if (window.discordUser && myPlayer) {
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
                window.allTeamsData = teams;
                window.myPlayerState = myPlayer;
                window.myTeamNameState = myTeamName;
                renderTeamsList(teams);

                // === Free Agents Section ===
                if (faContainer) {
                    const faBadge = document.getElementById('fa-count-badge');
                    try {
                        const agents = await window.api('/api/players/free-agents');
                        if (faBadge) faBadge.textContent = (agents || []).length;
                        if (!agents || agents.length === 0) {
                            faContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-user-slash text-2xl mb-2"></i><p>Không có tuyển thủ tự do</p></div>';
                        } else {
                            faContainer.innerHTML = agents.map(p => {
                                return '<div class="bg-valCard/60 border border-gray-800 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-valBg/60 transition" onclick="openProfile(\'' + p.discordId + '\')">' +
                                    '<img src="' + getAvatarUrl(p.discordId, p.discordAvatar, 32) + '" class="w-8 h-8 rounded-full border border-gray-700 shrink-0" onerror="this.style.display=\'none\'">' +
                                    '<div class="min-w-0 flex-1"><p class="text-xs text-white font-bold truncate">' + window.escHtml(p.displayName) + '</p>' +
                                    '<p class="text-[9px] text-gray-400">' + (p.rank || '') + ' · ' + (p.role || '') + ' · ' + (p.elo || 0) + ' Elo</p></div>' +
                                    '<span class="text-[10px] text-yellow-400 font-mono font-bold shrink-0">' + getPtsFromRank(p.peakRank||p.rank) + 'đ</span></div>';
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
window.requestJoinTeam = async function(teamName) {
            if (!window.discordUser) return window.showToast('Cần đăng nhập Discord!', 'error');
            try {
                const result = await window.api('/api/teams/' + encodeURIComponent(teamName) + '/join', { method: 'POST' });
                window.pendingRequestsMap[teamName] = result.id || true;
                window.showToast('Đã gửi đơn xin vào đội ' + teamName + '! Chờ đội trưởng duyệt.', 'success');
                loadTeamsBrowser();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.cancelJoinRequest = async function(teamName) {
            if (!window.discordUser) return window.showToast('Cần đăng nhập Discord!', 'error');
            if (!window.pendingRequestsMap[teamName]) return window.showToast('Không tìm thấy đơn xin vào đội này', 'error');
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/requests/cancel', { method: 'POST', body: { discordId: window.discordUser.discordId } });
                delete window.pendingRequestsMap[teamName];
                window.showToast('Đã hủy đơn xin vào đội', 'info');
                loadTeamsBrowser();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.approveJoinRequest = async function(teamName, requestId) {
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/approve', { method: 'PUT' });
                window.showToast('Đã duyệt thành viên!', 'success');
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.rejectJoinRequest = async function(teamName, requestId) {
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/requests/' + requestId + '/reject', { method: 'PUT' });
                window.showToast('Đã từ chối', 'info');
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.renameTeam = async function() {
            if (!window.discordUser) return window.showToast('Cần đăng nhập Discord!', 'error');
            if (!window.currentPlayerTeam) return window.showToast('Bạn chưa có đội!', 'error');
            const newName = document.getElementById('my-team-name-input')?.value.trim();
            if (!newName) return window.showToast('Nhập tên đội mới!', 'error');
            if (newName === window.currentPlayerTeam) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(window.currentPlayerTeam) + '/rename', { method: 'PUT', body: { newName, discordId: window.discordUser.discordId } });
                window.showToast('Đã đổi tên đội thành ' + newName + '!', 'success');
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.leaveTeam = async function() {
            if (!window.discordUser) return window.showToast('Cần đăng nhập Discord!', 'error');
            if (!window.currentPlayerTeam) return window.showToast('Bạn chưa có đội!', 'error');
            if (!confirm('Xác nhận rời khỏi đội?')) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(window.currentPlayerTeam) + '/leave', { method: 'POST' });
                window.showToast('Đã rời khỏi đội!', 'success');
                window.currentPlayerTeam = null;
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.removeMember = async function(teamName, discordId) {
            if (!confirm('Xác nhận xóa thành viên này khỏi đội?')) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + discordId, { method: 'DELETE' });
                window.showToast('Đã xóa thành viên!', 'success');
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.disbandMyTeam = async function() {
            if (!window.discordUser) return window.showToast('Cần đăng nhập Discord!', 'error');
            if (!window.currentPlayerTeam) return window.showToast('Bạn chưa có đội!', 'error');
            try {
                const team = window.allTeams.find(t => t.name === window.currentPlayerTeam);
                if (!team) return window.showToast('Không tìm thấy đội!', 'error');
                await window.api('/api/teams/' + encodeURIComponent(team.name) + '/disband', { method: 'DELETE', body: { discordId: window.discordUser.discordId } });
                window.showToast('Đã giải tán đội!', 'success');
                window.currentPlayerTeam = null;
                loadTeamsBrowser();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.adminDraftTeams = async function() {
            if (!requireAdminAuth()) return;
            try {
                const res = await window.api('/api/teams/admin/draft-preview', { method: 'GET' });
                if (window.openDraftPreviewModal) {
                    window.openDraftPreviewModal(res);
                }
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        };

window.confirmDraftTeams = async function() {
    if (!requireAdminAuth()) return;
    if (!window.draftState || !window.draftState.teams) return window.showToast('Không có dữ liệu đội hình', 'error');
    
    // Format payload
    const payload = {
        teams: window.draftState.teams.map(t => ({
            name: t.name,
            captainDiscordId: t.captainDiscordId,
            players: (t.players || []).map(p => p.discordId)
        }))
    };

    try {
        const res = await window.api('/api/teams/admin/draft-save', { 
            method: 'POST',
            body: payload
        });
        window.showToast('Đã lưu ' + res.drafted + ' Đội thành công!', 'success');
        if (window.closeDraftPreviewModal) window.closeDraftPreviewModal();
        loadCompleteTeams();
        loadTeamsBrowser();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};
window.loadCompleteTeams = async function() {
            const container = document.getElementById('complete-teams-list');
            if (!container) return;
            try {
                const teams = await window.api('/api/teams/all');
                const players = await window.api('/api/players').catch(() => []);
                // Pending = incomplete teams
                const pending = teams.filter(t => {
                    const r = JSON.parse(t.rosterJson || '[]');
                    const maxMembers = t.teamType === 'team5' ? 7 : 5;
                    return r.length < maxMembers;
                });
                const complete = teams.filter(t => {
                    const r = JSON.parse(t.rosterJson || '[]');
                    const maxMembers = t.teamType === 'team5' ? 5 : 5;
                    return r.length >= maxMembers;
                });
                // === Pending Teams (Đội Chờ Duyệt) ===
                const pendingCountBadge = document.getElementById('admin-pending-count');
                if (pendingCountBadge) pendingCountBadge.textContent = pending.length + ' đội';
                const pendingEl = document.getElementById('admin-pending-teams');
                if (pendingEl) {
                    if (pending.length === 0) {
                        pendingEl.innerHTML = '<div class="text-center py-4 text-gray-500 text-xs">Không có đội chờ duyệt</div>';
                    } else {
                        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
                        for (const t of pending) {
                            const roster = JSON.parse(t.rosterJson || '[]');
                            const safeName = t.name.replace(/'/g, "\\'");
                            const maxMembers = t.teamType === 'team5' ? 7 : 5;
                            html += `<div class="bg-valBg/60 border border-amber-500/40 rounded-xl p-3">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span class="text-amber-400 text-[10px] animate-pulse">⏳</span>
                                        <span class="text-xs font-bold text-white truncate">${t.name}</span>
                                        <button onclick="adminRenameTeam('${safeName}')" class="text-gray-500 hover:text-valCyan text-[10px]" title="Đổi tên"><i class="fa-solid fa-pen"></i></button>
                                        <button onclick="if(confirm('Xoá đội ${t.name}?'))deleteTeam('${safeName}')" class="text-gray-500 hover:text-valRed text-[10px]" title="Xoá đội"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                    <span class="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">${roster.length}/${maxMembers} người</span>
                                </div>
                                <div class="text-[10px] text-gray-400 space-y-0.5">`;
                            for (const discordId of roster) {
                                const p = players.find(pl => pl.discordId === discordId);
                                const pName = p ? (p.riotId || p.displayName) : discordId;
                                html += `<div class="flex justify-between items-center">
                                    <span class="truncate">${pName}</span>
                                    <button onclick="adminKickMember('${safeName}','${discordId}')" class="text-gray-600 hover:text-valRed text-[9px] ml-2 shrink-0" title="Đá khỏi đội"><i class="fa-solid fa-user-minus"></i></button>
                                </div>`;
                            }
                            html += `</div>
                                <div class="mt-2 flex gap-2">
                                    <button onclick="adminAddToTeam('${safeName}')" class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition"><i class="fa-solid fa-plus mr-0.5"></i>Thêm người</button>
                                </div>
                            </div>`;
                        }
                        html += '</div>';
                        pendingEl.innerHTML = html;
                    }
                }
                // === Complete Teams ===
                if (complete.length === 0) {
                    container.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">Chưa có đội hoàn chỉnh.</div>';
                } else {
                    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
                    for (const team of complete) {
                        const roster = JSON.parse(team.rosterJson || '[]');
                        const subs = window.getSubstitutes(team);
                        const memberCount = roster.length;
                        const safeName = team.name.replace(/'/g, "\\'");
                        const totalPts = roster.reduce((s, id) => { const p = players.find(pl => pl.discordId === id); return s + getPtsFromRank(p?.peakRank || p?.rank); }, 0);
                        const activePts = roster.reduce((s, id) => { const p = players.find(pl => pl.discordId === id); return subs.includes(id) ? s : s + getPtsFromRank(p?.peakRank || p?.rank); }, 0);
                        html += `<div class="bg-valBg/60 border border-blue-500/30 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <h5 class="text-sm font-bold text-white truncate cursor-pointer hover:text-valCyan" onclick="openTeamProfile('${safeName}')" title="Xem chi tiết">${team.name}</h5>
                                    <button onclick="adminRenameTeam('${safeName}')" class="text-gray-500 hover:text-valCyan text-[10px]" title="Đổi tên"><i class="fa-solid fa-pen"></i></button>
                                    <button onclick="if(confirm('Xoá đội ${team.name}?'))deleteTeam('${safeName}')" class="text-gray-500 hover:text-valRed text-[10px]" title="Xoá đội"><i class="fa-solid fa-trash"></i></button>
                                </div>
                                <span class="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">✅ ${memberCount} NGƯỜI</span>
                            </div>
                            <div class="text-[10px] text-gray-400 space-y-1">`;
                        for (const discordId of roster) {
                            const p = players.find(pl => pl.discordId === discordId);
                            const pName = p ? (p.riotId || p.displayName) : discordId;
                            const isSub = subs.includes(discordId);
                            html += `<div class="flex justify-between items-center ${isSub ? 'opacity-60' : ''}">
                                <span class="truncate">${pName}${isSub ? ' <span class="text-gray-600 text-[8px]">[Dự Bị]</span>' : ''}</span>
                                <div class="flex gap-1">
                                    <button onclick="toggleSubstituteRole('${safeName}','${discordId}', this)" class="text-gray-500 hover:text-gray-300 text-[9px]" title="${isSub ? 'Lên Đánh Chính' : 'Xuống Dự Bị'}"><i class="fa-solid fa-arrows-rotate"></i></button>
                                    <button onclick="adminKickMember('${safeName}','${discordId}')" class="text-gray-600 hover:text-valRed text-[9px] shrink-0" title="Đá khỏi đội"><i class="fa-solid fa-user-minus"></i></button>
                                </div>
                            </div>`;
                        }
                        html += `</div>
                            <div class="mt-2 text-[10px] text-gray-500">Tổng: ${activePts}đ đánh chính · ${totalPts}đ tổng · Đội trưởng: ${team.captainDiscordId || 'N/A'}</div>
                            <div class="mt-2 flex gap-2">
                                <button onclick="adminAddToTeam('${safeName}')" class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition"><i class="fa-solid fa-plus mr-0.5"></i>Thêm</button>
                            </div>
                        </div>`;
                    }
                    html += '</div>';
                    container.innerHTML = html;
                }
            } catch(e) { container.innerHTML = '<div class="text-center py-4 text-gray-500 text-xs">Lỗi tải dữ liệu</div>'; }
        }
window.adminAddToTeam = async function(teamName) {
            const id = prompt('Nhập Discord ID của người chơi để thêm vào đội ' + teamName + ':');
            if (!id) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/admin-add-player', { method: 'POST', body: { discordId: id } });
                window.showToast('Đã thêm vào đội!', 'success');
                loadCompleteTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.adminKickMember = async function(teamName, discordId) {
            if (!confirm('Đá người chơi này khỏi đội?')) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/players/' + encodeURIComponent(discordId), { method: 'DELETE' });
                window.showToast('Đã đá khỏi đội!', 'success');
                loadCompleteTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.adminRenameTeam = async function(teamName) {
            const newName = prompt('Nhập tên mới cho đội ' + teamName + ':');
            if (!newName || newName === teamName) return;
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName) + '/rename', { method: 'PUT', body: { newName } });
                window.showToast('Đã đổi tên thành ' + newName, 'success');
                loadCompleteTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.deleteTeam = async function(teamName) {
            try {
                await window.api('/api/teams/' + encodeURIComponent(teamName), { method: 'DELETE' });
                window.showToast('Đã xoá đội!', 'success');
                loadCompleteTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }
window.disbandTeam = async function(id) {
            if (!requireAdminAuth()) return;
            if (!confirm('Xác nhận giải tán đội này?')) return;
            try {
                await window.api('/api/teams/' + id, { method: 'DELETE' });
                window.showToast('Đã giải tán đội!', 'success');
                loadPendingTeams();
            } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
        }



// --- TEAM PROFILE MODAL ---
window.openTeamProfile = async function(teamName) {
    try {
        const res = await api('/api/teams/detail/' + encodeURIComponent(teamName));
        if (res.error) return showNotification('error', res.error);
        const { team, roster, matchHistory, captainPlayer } = res;
        
        document.getElementById('team-profile-modal').classList.remove('hidden');
        document.getElementById('team-modal-name').textContent = team.name;
        document.getElementById('team-modal-pts').innerHTML = '<i class="fa-solid fa-star mr-1"></i>' + team.pts + ' PTS';
        const totalElo = roster.reduce((sum, p) => sum + (p.elo || 1200), 0);
        document.getElementById('team-modal-elo').innerHTML = '<i class="fa-solid fa-trophy mr-1"></i>' + totalElo + ' ELO';
        
        const banner = document.getElementById('team-modal-banner');
        banner.style.backgroundColor = team.color || '#6B7280';
        
        const logoImg = document.getElementById('team-modal-logo-img');
        const logoText = document.getElementById('team-modal-logo-text');
        const logoWrapper = document.getElementById('team-modal-logo-wrapper');
        const logoOverlay = document.getElementById('team-modal-logo-overlay');
        
        logoWrapper.style.backgroundColor = team.color || '#6B7280';
        if (team.logo) {
            logoImg.src = team.logo;
            logoImg.classList.remove('hidden');
            logoText.classList.add('hidden');
        } else {
            logoImg.classList.add('hidden');
            logoText.textContent = team.shortName || team.name.substring(0, 2).toUpperCase();
            logoText.classList.remove('hidden');
        }

        if (window.discordUser && window.discordUser.discordId === team.captainDiscordId) {
            logoOverlay.classList.replace('hidden', 'flex');
        } else {
            logoOverlay.classList.replace('flex', 'hidden');
        }
        
        window.currentViewingTeam = team.name;

        const rosterContainer = document.getElementById('team-profile-roster');
        const subsList = JSON.parse(team.substitutesJson || '[]');
        const mains = roster.filter(p => !subsList.includes(p.discordId));
        const subRoster = roster.filter(p => subsList.includes(p.discordId));

        let profileRosterHtml = '';

        // Main section
        profileRosterHtml += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-2 mt-1 col-span-full"><i class="fa-solid fa-shield-halved mr-1"></i>Chính Thức (' + mains.length + '/5)</p>';
        for (const p of mains) {
            profileRosterHtml += profileMemberCard(p, team);
        }
        for (let i = mains.length; i < 5; i++) {
            profileRosterHtml += '<div class="bg-valBg/40 border border-dashed border-gray-800 p-3 rounded-xl flex items-center justify-center text-gray-600 text-xs col-span-full"><i class="fa-solid fa-plus-circle mr-1 text-gray-700"></i>Trống</div>';
        }

        // Sub section
        profileRosterHtml += '<p class="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-2 mt-3 col-span-full"><i class="fa-solid fa-chair mr-1"></i>Dự Bị (' + subRoster.length + '/2)</p>';
        for (const p of subRoster) {
            profileRosterHtml += profileMemberCard(p, team);
        }
        for (let i = subRoster.length; i < 2; i++) {
            profileRosterHtml += '<div class="bg-valBg/40 border border-dashed border-gray-700/50 p-3 rounded-xl flex items-center justify-center text-gray-600 text-xs col-span-full"><i class="fa-solid fa-plus-circle mr-1 text-gray-700"></i>Trống dự bị</div>';
        }

        rosterContainer.innerHTML = profileRosterHtml;

        const historyContainer = document.getElementById('team-modal-history');
        if (matchHistory.length === 0) {
            historyContainer.innerHTML = '<p class="text-center text-gray-500 text-sm italic py-4">Chưa thi đấu trận nào</p>';
        } else {
            historyContainer.innerHTML = matchHistory.map(m => {
                const isWin = m.result === 'win';
                const isLoss = m.result === 'loss';
                const resultColor = isWin ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isLoss ? 'bg-valRed/20 text-valRed border-valRed/30' : 'bg-gray-800 text-gray-400 border-gray-700';
                const resultText = isWin ? 'THẮNG' : isLoss ? 'THUA' : 'CHỜ';
                const oppName = m.isTeam1 ? m.team2Name : m.team1Name;
                const myScore = m.isTeam1 ? m.score1 : m.score2;
                const oppScore = m.isTeam1 ? m.score2 : m.score1;
                return `
                    <div class="flex items-center justify-between p-3 rounded-xl border ${resultColor}">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-bold w-12 text-center">${resultText}</span>
                            <span class="text-sm font-bold text-white">vs ${oppName}</span>
                        </div>
                        <div class="text-sm font-mono font-bold">${m.status === 'completed' ? myScore + ' - ' + oppScore : '-'}</div>
                    </div>
                `;
            }).join('');
        }

    } catch (e) {
        showNotification('error', 'Lỗi khi tải thông tin đội');
    }
}

function closeTeamProfile() {
    document.getElementById('team-profile-modal').classList.add('hidden');
    window.currentViewingTeam = null;
}

async function uploadTeamLogo(e) {
    if (!window.currentViewingTeam) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showNotification('error', 'Ảnh quá lớn (tối đa 2MB)');
    
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('teamName', window.currentViewingTeam);

    try {
        const token = localStorage.getItem('evan_api_token');
        const res = await fetch('/api/upload/team-logo', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        showNotification('success', 'Đã cập nhật Logo đội!');
        openTeamProfile(window.currentViewingTeam);
        if (window.loadCompleteTeams) loadCompleteTeams();
    } catch (err) {
        showNotification('error', err.message);
    }
}


window.changeCaptain = async function(teamName, newCaptainDiscordId) {
    if (!confirm('Bạn có chắc chắn muốn chuyển quyền đội trưởng cho người này?')) return;
    try {
        const res = await api(`/api/teams/${encodeURIComponent(teamName)}/captain`, { method: 'PUT', body: { newCaptainDiscordId } });
        if (res && res.error) return showNotification('error', res.error);
        showNotification('success', 'Đã chuyển quyền đội trưởng thành công!');
        openTeamProfile(teamName);
        if (window.loadCompleteTeams) loadCompleteTeams();
    } catch (err) {
        showNotification('error', 'Lỗi khi chuyển quyền');
    }
};


window.filterTeams = function() {
    if (!window.allTeamsData) return;
    const query = (document.getElementById('team-search-input')?.value || '').toLowerCase().trim();
    const status = document.getElementById('team-status-filter')?.value || 'all';
    
    const filtered = window.allTeamsData.filter(team => {
        const matchQuery = team.name.toLowerCase().includes(query);
        const matchStatus = status === 'all' || team.status === status;
        return matchQuery && matchStatus;
    });
    
    renderTeamsList(filtered);
};

window.renderTeamsList = function(teamsToRender) {
    const container = document.getElementById('teams-list');
    const countBadge = document.getElementById('teams-count');
    if (!container) return;
    if (countBadge) countBadge.textContent = teamsToRender.length + ' đội';
    
    if (teamsToRender.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">Không tìm thấy đội nào phù hợp</div>';
        return;
    }

    const myPlayer = window.myPlayerState;
    const myTeamName = window.myTeamNameState;

    let html = '';
    for (const team of teamsToRender) {
        const roster = JSON.parse(team.rosterJson || '[]');
        const subs = window.getSubstitutes(team);
        const isCaptain = window.discordUser && team.captainDiscordId === window.discordUser.discordId;
        const isMember = myTeamName === team.name;
        const canJoin = window.discordUser && myPlayer && !myTeamName && (team.status === 'approved' || team.status === 'recruiting' || team.status === 'pending') && roster.length < 7 && !isCaptain;
        const hasPendingRequest = window.pendingRequestsMap[team.name];

        const statusStyles = {approved:{b:'border-emerald-500/40',bg:'bg-emerald-500/10 text-emerald-400 border-emerald-400/30'},ready:{b:'border-amber-500/50',bg:'bg-amber-500/20 text-amber-400 border-amber-400/30'},pending:{b:'border-gray-600/50',bg:'bg-gray-500/20 text-gray-400 border-gray-400/30'},recruiting:{b:'border-blue-500/40',bg:'bg-blue-500/20 text-blue-400 border-blue-400/30'},complete:{b:'border-valCyan/40',bg:'bg-valCyan/20 text-valCyan border-valCyan/30'},rejected:{b:'border-red-500/40',bg:'bg-red-500/20 text-red-400 border-red-400/30'}};
        const statusLabels = {approved:'✅ Đã duyệt',ready:'⏳ Sẵn sàng · Chờ duyệt',pending:'⏳ Chờ duyệt',recruiting:'📢 Tuyển TV',complete:'✅ Hoàn chỉnh',rejected:'❌ Từ chối'};
        const st = statusStyles[team.status] || {b:'border-gray-800',bg:'bg-gray-500/10 text-gray-400 border-gray-400/30'};
        const sl = statusLabels[team.status] || team.status;

        const rosterPlayers = team.rosterPlayers || [];
        const rosterMap = {};
        for (const rp of rosterPlayers) rosterMap[rp.discordId] = rp;
        const captainP = rosterMap[team.captainDiscordId] || null;
        const captainName = captainP ? captainP.displayName : team.captainDiscordId;
        
        const mains = roster.filter(id => !subs.includes(id));
        const subMembers = roster.filter(id => subs.includes(id));

        html += '<div class="bg-valCard border ' + st.b + ' rounded-2xl p-4 hover:border-valCyan/50 transition cursor-pointer flex flex-col" onclick="openTeamProfile(\'' + window.escHtml(team.name).replace(/'/g, "\\'") + '\')">';
        
        // Header
        html += '<div class="flex items-start justify-between mb-3">';
        html += '<div class="min-w-0 pr-2">';
        html += '<h4 class="text-white font-bold text-base truncate">' + window.escHtml(team.name) + '</h4>';
        html += '<p class="text-[10px] text-gray-500 mt-0.5 truncate"><i class="fa-solid fa-crown text-yellow-400/70 mr-1"></i>' + window.escHtml(captainName) + ' · ' + mains.length + '/5 + ' + subMembers.length + '/2</p>';
        html += '</div>';
        html += '<span class="text-[9px] font-mono ' + st.bg + ' border px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">' + sl + '</span>';
        html += '</div>';

        // Avatar row
        html += '<div class="flex flex-wrap gap-1 mb-4">';
        // Mains
        for (const rid of mains) {
            const p = rosterMap[rid];
            const isCap = rid === team.captainDiscordId;
            html += '<div class="relative group">';
            html += '<img src="' + getAvatarUrl(rid, p?.discordAvatar, 32) + '" class="w-7 h-7 rounded-full border-2 ' + (isCap ? 'border-yellow-400' : 'border-gray-700') + ' object-cover" onerror="this.style.display=\'none\'">';
            if (isCap) html += '<div class="absolute -top-1.5 -right-1.5 text-[8px] bg-yellow-400 text-black px-1 rounded-sm font-black">C</div>';
            html += '<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border border-gray-700">' + window.escHtml(p?.displayName || rid) + '</div>';
            html += '</div>';
        }
        for (let i = mains.length; i < 5; i++) {
            html += '<div class="w-7 h-7 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600 bg-gray-800/30" title="Trống"><i class="fa-solid fa-plus text-[10px]"></i></div>';
        }
        
        // Subs divider
        html += '<div class="w-px h-6 bg-gray-700 mx-1 self-center"></div>';
        
        // Subs
        for (const rid of subMembers) {
            const p = rosterMap[rid];
            html += '<div class="relative group opacity-70 hover:opacity-100 transition">';
            html += '<img src="' + getAvatarUrl(rid, p?.discordAvatar, 32) + '" class="w-6 h-6 rounded-full border-2 border-emerald-500/50 object-cover" onerror="this.style.display=\'none\'">';
            html += '<div class="absolute -top-1.5 -right-1.5 text-[7px] bg-emerald-500 text-white px-1 rounded-sm font-black">SUB</div>';
            html += '<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border border-gray-700">' + window.escHtml(p?.displayName || rid) + '</div>';
            html += '</div>';
        }
        for (let i = subMembers.length; i < 2; i++) {
            html += '<div class="w-6 h-6 rounded-full border-2 border-dashed border-gray-700/50 flex items-center justify-center text-gray-600 bg-gray-800/20" title="Trống dự bị"><i class="fa-solid fa-plus text-[8px]"></i></div>';
        }
        html += '</div>'; // End avatar row

        // Stats & Actions
        html += '<div class="mt-auto">';
        const totalPts = rosterPlayers.reduce((s, p) => s + getPtsFromRank(p.peakRank||p.rank), 0);
        const activePts = window.getActivePts(team, rosterPlayers);
        
        html += '<div class="flex items-center justify-between gap-2 mb-3">';
        html += '<div class="flex items-center gap-2">';
        html += '<span class="text-[11px] text-yellow-400 font-mono font-black bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20" title="' + activePts + 'đ đánh chính / ' + totalPts + 'đ tổng"><i class="fa-solid fa-star mr-1 text-[10px]"></i>' + activePts + 'đ</span>';
        if (team.wins || team.losses) {
            html += '<span class="text-[11px] text-gray-400 font-mono"><span class="text-emerald-400">' + (team.wins||0) + 'W</span> - <span class="text-red-400">' + (team.losses||0) + 'L</span></span>';
        }
        html += '</div>';
        html += '</div>';

        // Action Buttons
        html += '<div class="flex gap-2" onclick="event.stopPropagation()">';
        if (isMember) {
            html += '<span class="flex-1 text-center text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-bold uppercase"><i class="fa-solid fa-check mr-1"></i>Đã Trong Đội</span>';
        } else if (hasPendingRequest) {
            html += '<button onclick="cancelJoinRequest(\'' + window.escHtml(team.name).replace(/'/g, "\\'") + '\')" class="flex-1 text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-400/30 px-3 py-2 rounded-lg font-bold hover:bg-yellow-500/20 transition uppercase"><i class="fa-solid fa-clock mr-1"></i>Đã Gửi Đơn (Hủy)</button>';
        } else if (canJoin) {
            html += '<button onclick="requestJoinTeam(\'' + window.escHtml(team.name).replace(/'/g, "\\'") + '\')" class="flex-1 text-[10px] bg-valCyan/10 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg font-bold hover:bg-valCyan/20 transition uppercase"><i class="fa-solid fa-hand mr-1"></i>Xin Vào</button>';
        } else if (!window.discordUser) {
            html += '<span class="flex-1 text-center text-[10px] text-gray-500 border border-gray-700 px-3 py-2 rounded-lg font-bold uppercase">Đăng nhập để xin vào</span>';
        } else {
            html += '<button onclick="openTeamProfile(\'' + window.escHtml(team.name).replace(/'/g, "\\'") + '\')" class="flex-1 text-[10px] bg-gray-800 text-gray-300 border border-gray-700 px-3 py-2 rounded-lg font-bold hover:bg-gray-700 transition uppercase"><i class="fa-solid fa-circle-info mr-1"></i>Chi Tiết</button>';
        }
        html += '</div>';
        
        html += '</div>'; // mt-auto
        html += '</div>'; // End Card
    }
    container.innerHTML = html;
};
