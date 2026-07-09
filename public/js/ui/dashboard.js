window.lookupPlayer = async function() {
    let discordId = document.getElementById('dashboard-discord-id').value.trim();
    if (!discordId && window.discordUser) { 
        discordId = window.discordUser.discordId; 
        document.getElementById('dashboard-discord-id').value = discordId; 
    }
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
            
            const teamEl = document.getElementById('dashboard-player-team');
            if (player.teamId) {
                teamEl.textContent = '🛡️ ' + player.teamId;
                teamEl.classList.remove('hidden');
                teamEl.className = 'text-xs bg-valCyan/20 text-valCyan px-3 py-1 rounded-full font-bold ml-auto border border-valCyan/50';
            } else {
                teamEl.textContent = 'Đang tự do';
                teamEl.classList.remove('hidden');
                teamEl.className = 'text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-bold ml-auto border border-gray-700';
            }
        } else {
            document.getElementById('dashboard-player-name').textContent = discordId + ' (not found in LB)';
            document.getElementById('d-elo').textContent = '-';
            document.getElementById('d-rank').textContent = '-';
            document.getElementById('d-wins').textContent = '-';
            document.getElementById('d-losses').textContent = '-';
            document.getElementById('dashboard-player-team').classList.add('hidden');
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
};

window.lookupTeam = async function() {
    const teamName = document.getElementById('dashboard-team-name').value.trim();
    if (!teamName) return showToast('Nhập tên đội!', 'error');
    const resultDiv = document.getElementById('dashboard-result');
    resultDiv.classList.add('hidden');
    showLoading('Đang tra cứu đội...');
    try {
        const matches = await api('/api/matches/team/' + encodeURIComponent(teamName));
        hideLoading();
        document.getElementById('dashboard-player-name').textContent = teamName + ' 🏆';
        document.getElementById('dashboard-player-team')?.classList.add('hidden');
        
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
};
