window.switchScheduleSubTab = function(type) {
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
        if (window.loadBracket) window.loadBracket();
    } else {
        playoffSection?.classList.add('hidden');
        matchesSection?.classList.remove('hidden');
        btnPlayoff?.classList.remove('bg-valCyan/20', 'text-valCyan');
        btnPlayoff?.classList.add('text-gray-400');
        btnMatches?.classList.add('bg-valCyan/20', 'text-valCyan');
        btnMatches?.classList.remove('text-gray-400');
    }
};

window.renderSchedule = function() {
    const controls = document.getElementById('admin-schedule-controls');
    if (window.apiToken && controls) {
        controls.innerHTML = `<div class="mb-6 bg-valBg/50 p-4 rounded-xl border border-gray-800">
            <h4 class="text-sm font-bold text-valCyan mb-3 uppercase">Tạo lịch thi đấu tự động</h4>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <div class="col-span-full sm:col-span-1"><label class="text-[10px] text-gray-400 uppercase block mb-1">Nguồn Đội</label>
                <div class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500 italic flex items-center h-[34px]"><i class="fa-solid fa-cloud-arrow-down mr-2 text-valCyan"></i> Tự động lấy từ Database</div></div>
                <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Ngày bắt đầu</label>
                <input type="date" id="sched-date" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
                <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Phút/trận</label>
                <input type="number" id="sched-duration" value="60" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"></div>
                <div><label class="text-[10px] text-gray-400 uppercase block mb-1">Định dạng</label>
                <select id="sched-format" class="w-full bg-valBg border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="round-robin">Vòng tròn</option>
                <option value="swiss">Swiss</option>
                </select></div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.generateSchedule()" class="flex-1 bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
                <i class="fa-solid fa-gear mr-1"></i>Tạo lịch Vòng Bảng</button>
                <button onclick="window.generateSwissRound()" class="flex-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition">
                <i class="fa-solid fa-shuffle mr-1"></i>Vòng Swiss Mới</button>
            </div>
        </div>`;
    }
    window.loadSchedule();
};

window.toggleScheduleFullscreen = function() {
    const c = document.getElementById('schedule-container');
    const expand = document.getElementById('btn-schedule-expand');
    const collapse = document.getElementById('btn-schedule-collapse');
    c.classList.toggle('schedule-expanded');
    expand.classList.toggle('hidden');
    collapse.classList.toggle('hidden');
};

let countdownTimer = null;
window.updateAllCountdowns = function() {
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
};

window.loadSchedule = async function() {
    const container = document.getElementById('schedule-list');
    window.showLoading('Đang tải lịch đấu...');
    try {
        let matches = await window.api('/api/matches');
        if (matches && matches.data) matches = matches.data;
        window.hideLoading();
        if (!matches || matches.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i><p>Chưa có trận đấu nào.</p></div>';
            return;
        }

        const pending = matches.filter(m => m.status === 'pending');
        const completed = matches.filter(m => m.status === 'completed');

        let html = '';
        const isAdmin = !!window.apiToken;
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
                            <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();if(window.openTeamProfile) window.openTeamProfile('${m.team1Name.replace(/'/g, "\\'")}')">${m.team1Name}</span>
                            <span class="text-gray-500 text-xs">vs</span>
                            <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();if(window.openTeamProfile) window.openTeamProfile('${m.team2Name.replace(/'/g, "\\'")}')">${m.team2Name}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-gray-400 font-mono">${time}</span>
                            <span id="${countdownId}" class="text-[10px] font-mono text-yellow-400/80 min-w-[60px] text-right"></span>
                            <button onclick="document.getElementById('${checkinId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition">
                                <i class="fa-solid fa-check"></i> Check-in
                            </button>
                            ${isAdmin ? `<button onclick="document.getElementById('${timeId}').classList.toggle('hidden')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-clock"></i> Giờ</button>` : ''}
                            ${isAdmin ? `<button onclick="if(window.openQrModal) window.openQrModal('${m.id}', '${m.team1Name.replace(/'/g, "\\'")} vs ${m.team2Name.replace(/'/g, "\\'")}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-qrcode"></i> QR</button>` : ''}
                            <button onclick="if(window.openMatchDetail) window.openMatchDetail('${m.id}')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-eye"></i> Chi tiết</button>
                            <button onclick="if(window.openScoreReport) window.openScoreReport('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-400/10 transition"><i class="fa-solid fa-flag"></i> Báo KQ</button>
                            ${isAdmin ? `<button onclick="if(window.openResultModal) window.openResultModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded-lg hover:bg-emerald-400/10 transition"><i class="fa-solid fa-pen"></i> Nhập KQ</button>` : ''}
                            <button onclick="if(window.openVetoForMatch) window.openVetoForMatch('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-purple-400 border border-purple-400/30 px-2 py-1 rounded-lg hover:bg-purple-400/10 transition"><i class="fa-solid fa-map-location-dot"></i> VETO</button>
                        </div>
                    </div>
                    <div id="${timeId}" class="hidden mt-3 pt-3 border-t border-gray-800">
                        <div class="flex gap-2 items-center">
                            <input type="datetime-local" id="resched-time-${m.id}" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white">
                            <button onclick="if(window.reschedule) window.reschedule('${m.id}')" class="bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition"><i class="fa-solid fa-save"></i> Đặt</button>
                        </div>
                    </div>
                    <div id="${checkinId}" class="hidden mt-3 pt-3 border-t border-gray-800">
                        <div class="flex gap-2">
                            <input type="text" id="checkin-discord-${m.id}" placeholder="Discord ID của bạn" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white" value="${window.discordUser ? window.discordUser.discordId : ''}">
                            <input type="text" id="checkin-name-${m.id}" placeholder="Tên" class="flex-1 bg-valBg border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white" value="${window.discordUser ? window.discordUser.discordUsername : ''}">
                            <button onclick="if(window.toggleCheckin) window.toggleCheckin('${m.id}', document.getElementById('checkin-discord-${m.id}').value, document.getElementById('checkin-name-${m.id}').value)" class="bg-valCyan/20 text-valCyan border border-valCyan/30 px-3 py-1 rounded-lg text-xs font-bold hover:bg-valCyan/30 transition">
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
                const streamStr = m.streamUrl ? `<div class="mt-3"><button onclick="window.openVodModal('${m.streamUrl}')" class="w-full bg-valRed/10 hover:bg-valRed/20 text-valRed border border-valRed/30 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"><i class="fa-brands fa-youtube"></i> Xem Lại VOD / Highlight</button></div>` : '';
                html += `<div class="bg-valBg/60 border border-gray-800 p-3 rounded-xl">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();if(window.openTeamProfile) window.openTeamProfile('${m.team1Name.replace(/'/g, "\\'")}')">${m.team1Name}</span>
                            <span class="font-black text-lg font-mono ${winner}">${m.score1} - ${m.score2}</span>
                            <span class="font-bold text-white text-sm team-link cursor-pointer hover:text-valCyan" onclick="event.stopPropagation();if(window.openTeamProfile) window.openTeamProfile('${m.team2Name.replace(/'/g, "\\'")}')">${m.team2Name}</span>
                            ${mvpStr}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-gray-500">${m.map || ''}</span>
                            <button onclick="if(window.openMatchDetail) window.openMatchDetail('${m.id}')" class="text-[10px] text-valCyan border border-valCyan/30 px-2 py-1 rounded-lg hover:bg-valCyan/10 transition"><i class="fa-solid fa-eye"></i></button>
                            <button onclick="if(window.openDisputeModal) window.openDisputeModal('${m.id}','${m.team1Name}','${m.team2Name}')" class="text-[10px] text-orange-400 border border-orange-400/30 px-2 py-1 rounded-lg hover:bg-orange-400/10 transition"><i class="fa-solid fa-scale-balanced"></i></button>
                            ${isAdmin ? `<button onclick="if(window.openMvpModal) window.openMvpModal('${m.id}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-star"></i> MVP</button>` : ''}
                            ${isAdmin ? `<button onclick="if(window.openResultModal) window.openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pencil"></i> Sửa</button>` : ''}
                        </div>
                    </div>
                    ${streamStr}
                </div>`;
            });
        }

        window.hideLoading();
        container.innerHTML = html;
        window.updateAllCountdowns();
    } catch(e) {
        window.hideLoading();
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải lịch đấu</div>';
    }
};

window.generateSwissRound = async function() {
    const startDate = document.getElementById('sched-date').value;
    const duration = parseInt(document.getElementById('sched-duration').value) || 60;
    
    window.showLoading('Đang lấy danh sách đội...');
    let teams = [];
    try {
        const allTeams = await window.api('/api/teams/all');
        teams = allTeams.filter(t => t.status === 'recruiting' || t.status === 'approved' || t.status === 'locked').map(t => t.name);
    } catch(e) {
        window.hideLoading();
        return window.showToast('Lỗi lấy dữ liệu đội', 'error');
    }
    window.hideLoading();
    if (teams.length < 2) return window.showToast('Cần ít nhất 2 đội được duyệt trên hệ thống!', 'error');
    const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';
    try {
        await window.api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: 'swiss' } });
        window.showToast('Đã tạo vòng Swiss!', 'success');
        window.loadSchedule();
    } catch(e) { window.showToast('Lỗi: ' + e.message, 'error'); }
};

window.generateSchedule = async function() {
    window.showLoading('Đang lấy danh sách đội...');
    let teams = [];
    try {
        const allTeams = await window.api('/api/teams/all');
        teams = allTeams.filter(t => t.status === 'recruiting' || t.status === 'approved' || t.status === 'locked').map(t => t.name);
    } catch(e) {
        window.hideLoading();
        return window.showToast('Lỗi lấy dữ liệu đội', 'error');
    }
    window.hideLoading();
    if (teams.length < 2) return window.showToast('Cần ít nhất 2 đội được duyệt trên hệ thống!', 'error');

    const startDate = document.getElementById('sched-date').value;
    const duration = parseInt(document.getElementById('sched-duration').value) || 60;
    const fmt = document.getElementById('sched-format') ? document.getElementById('sched-format').value : 'round-robin';

    try {
        await window.api('/api/matches/generate', { method: 'POST', body: { teams, startDate, matchDurationMinutes: duration, format: fmt } });
        window.showToast('Đã tạo lịch thi đấu!', 'success');
        window.loadSchedule();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    }
};

window.openVodModal = function(url) {
    if (!url) return;
    const modal = document.getElementById('vod-modal');
    const container = document.getElementById('vod-container');
    const modalContent = modal.querySelector('div');
    
    let embedUrl = '';
    let match;
    if ((match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)) || (match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/))) {
        embedUrl = 'https://www.youtube.com/embed/' + match[1] + '?autoplay=1';
    } else if ((match = url.match(/twitch\.tv\/(\w+)/))) {
        embedUrl = 'https://player.twitch.tv/?channel=' + match[1] + '&parent=' + window.location.hostname;
    } else {
        window.open(url, '_blank');
        return;
    }

    container.innerHTML = '<iframe class="w-full h-full" src="' + embedUrl + '" allowfullscreen allow="autoplay"></iframe>';
    
    modal.classList.remove('hidden');
    void modal.offsetWidth; // trigger reflow
    modal.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
};

window.closeVodModal = function() {
    const modal = document.getElementById('vod-modal');
    const container = document.getElementById('vod-container');
    const modalContent = modal.querySelector('div');
    
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        container.innerHTML = ''; // Stop video playing
    }, 300);
};

