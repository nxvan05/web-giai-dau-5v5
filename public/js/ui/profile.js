let eloChartInstance = null;

window.openProfile = async function(query, openTracker = false) {
    if (!query) return;

    window.showLoading('Đang tải hồ sơ...');
    try {
        // Accept both discordId and displayName
        let discordId = query;
        if (!/^\d{17,20}$/.test(query)) {
            const players = await window.api('/api/players');
            const found = players.find(function(p) { return p.displayName.toLowerCase() === query.toLowerCase() || p.discordId === query; });
            if (found) discordId = found.discordId;
            else { window.hideLoading(); window.showToast('Không tìm thấy tuyển thủ "' + query + '"', 'error'); return; }
        }

                const data = await window.api('/api/players/profile/' + discordId);
        window.hideLoading();
        const p = data.player;

        const modal = document.getElementById('player-profile-modal');
        const modalContent = modal.querySelector('div');

        // Populate Header
        document.getElementById('player-profile-name').innerHTML = `<a href="https://discordapp.com/users/${p.discordId}" target="_blank" class="hover:text-[#5865F2] transition-colors flex items-center gap-2" title="Mở hồ sơ Discord">${p.displayName} <i class="fa-brands fa-discord text-[#5865F2] text-lg"></i></a>`;
        document.getElementById('profile-riotid').innerHTML = p.riotId ? `${p.riotId} <i class="fa-solid fa-copy ml-1 cursor-pointer hover:text-white transition-colors text-gray-500" onclick="window.copyToClipboard('${p.riotId.replace(/'/g, "\\'")}', event)" title="Sao chép Riot ID"></i>` : 'N/A';
        document.getElementById('profile-team').textContent = p.teamId || 'Free Agent';
        document.getElementById('profile-role').innerHTML = getRoleIcon(p.role) + ' ' + (p.role || 'Flex');
        document.getElementById('profile-rank').textContent = p.peakRank || p.rank || 'Unranked';
        document.getElementById('profile-level').textContent = 'Lv ' + (p.accountLevel || 0);

        const rankIconEl = document.getElementById('profile-rank-icon');
        const bestIcon = p.peakIconUrl || p.rankIconUrl || (typeof window.getRankIconUrl === 'function' ? window.getRankIconUrl(p.peakRank || p.rank) : '');
        if (rankIconEl && bestIcon) {
            rankIconEl.innerHTML = '<img src="' + bestIcon + '" class="w-full h-full object-contain">';
        } else if (rankIconEl) { rankIconEl.innerHTML = ''; }

        var pts = (p.pts != null ? p.pts : (typeof window.getPtsFromRank === 'function' ? window.getPtsFromRank(p.peakRank || p.rank) : 3));
        document.getElementById('profile-pts-display').textContent = pts + 'đ';
        document.getElementById('profile-elo-display').textContent = p.elo;

        // Show peak rank container only when peak differs from current
        var peakContainer = document.getElementById('profile-peak-container');
        var peakEl = document.getElementById('profile-peak');
        if (peakContainer && peakEl && p.peakRank && p.peakRank !== p.rank) {
            peakEl.textContent = p.peakRank;
            peakContainer.classList.remove('hidden');
        } else if (peakContainer) { peakContainer.classList.add('hidden'); }

        // Admin Evaluation
        var evalContainer = document.getElementById('profile-admin-eval-container');
        var evalEl = document.getElementById('profile-admin-eval');
        if (evalContainer && evalEl) {
            if (p.adminEvaluation && p.adminEvaluation.trim() !== '') {
                evalEl.textContent = p.adminEvaluation;
                evalContainer.classList.remove('hidden');
            } else {
                evalContainer.classList.add('hidden');
            }
        }

        const avatarEl = document.getElementById('player-profile-avatar');
        if (avatarEl) {
            var aurl = '';
            if (window.getAvatarUrl) aurl = window.getAvatarUrl(p.discordId, p.discordAvatar, 128);
            else if (p.discordAvatar) { aurl = 'https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=128'; }
            else if (p.discordId) { try { var idx = Number((BigInt(p.discordId) >> 22n) % 6n); aurl = 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png'; } catch(_e) { aurl = 'https://cdn.discordapp.com/embed/avatars/0.png'; } }
            
            avatarEl.src = aurl;
            avatarEl.onerror = () => { if (window.getFallbackAvatar) avatarEl.src = window.getFallbackAvatar(p.discordId, p.displayName, 128); };
            avatarEl.onclick = () => window.open(`https://discordapp.com/users/${p.discordId}`, '_blank');
            avatarEl.classList.add('cursor-pointer', 'hover:ring-2', 'hover:ring-[#5865F2]', 'transition-all', 'hover:scale-105');
            avatarEl.title = 'Mở hồ sơ Discord';
        }

        // Populate Stats from tournament data (DB)
        var total = p.wins + p.losses;
        var wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
        document.getElementById('profile-wr').textContent = wr;
        document.getElementById('profile-wins').textContent = p.wins;
        document.getElementById('profile-losses').textContent = p.losses;
        document.getElementById('profile-mvp').textContent = p.mvps || 0;

        var k = data.kda?.kills || 0, d = data.kda?.deaths || 0, a = data.kda?.assists || 0;
        document.getElementById('profile-kda').textContent = k + '/' + d + '/' + a;
        var kdRatio = d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
        document.getElementById('profile-kd-ratio').textContent = kdRatio;
        var kadRatio = d > 0 ? ((k + a) / d).toFixed(2) : (k + a).toFixed(2);
        document.getElementById('profile-kad-ratio').textContent = kadRatio;

        document.getElementById('profile-server-rank').textContent = data.seasonStats?.playerRank || '?';
        var hsEl = document.getElementById('profile-hs-pct');
        if (hsEl && p.headshotPct != null) {
            hsEl.textContent = p.headshotPct.toFixed(1) + '%';
            hsEl.className = 'text-base font-bold mt-1 ' + (p.headshotPct >= 30 ? 'text-emerald-400' : p.headshotPct >= 20 ? 'text-yellow-400' : 'text-red-400');
        } else if (hsEl) { hsEl.textContent = '--'; }

        // Kills per Match
        var totalMatches = total || 0;
        var totalKills = k || 0;
        var kpm = totalMatches > 0 ? (totalKills / totalMatches).toFixed(2) : '0.00';
        document.getElementById('profile-kpm').textContent = kpm;
        document.getElementById('profile-total-matches').textContent = totalMatches;

        
        const btnValTracker = document.getElementById('btn-open-valtracker');
        if (p.riotId) {
            btnValTracker.href = 'https://tracker.gg/valorant/profile/riot/' + encodeURIComponent(p.riotId).replace('%23', '%2523') + '/overview';
            btnValTracker.classList.remove('opacity-50', 'pointer-events-none');
            // Wait, tracker.gg uses literal %23 in the URL, e.g. Tenz%23000
            // encodeURIComponent('Tenz#000') -> 'Tenz%23000'
            btnValTracker.href = 'https://tracker.gg/valorant/profile/riot/' + encodeURIComponent(p.riotId) + '/overview';
        } else {
            btnValTracker.href = '#';
            btnValTracker.classList.add('opacity-50', 'pointer-events-none');
        }
        
        // Reset and wire up Tracker Button
        const btnTracker = document.getElementById('btn-load-tracker');
        const trackerContent = document.getElementById('profile-tracker-content');
        const trackerStats = document.getElementById('profile-tracker-stats');
        const trackerLoading = document.getElementById('profile-tracker-loading');
        
        trackerContent.classList.add('hidden');
        trackerStats.classList.add('hidden');
        trackerLoading.classList.add('hidden');
        
        btnTracker.onclick = async () => {
            trackerContent.classList.remove('hidden');
            trackerLoading.classList.remove('hidden');
            trackerStats.classList.add('hidden');
            btnTracker.classList.add('hidden'); // hide button while loading or after clicked
            
            try {
                const trackerData = await window.api('/api/players/tracker/' + discordId);
                const ts = trackerData.totalStats || {};
                const k_ = ts.kills || 0, d_ = ts.deaths || 0, a_ = ts.assists || 0;
                
                document.getElementById('ptr-kda').textContent = k_ + '/' + d_ + '/' + a_;
                document.getElementById('ptr-kd').textContent = ts.kd || (d_ > 0 ? (k_ / d_).toFixed(2) : k_.toFixed(2));
                document.getElementById('ptr-kad').textContent = d_ > 0 ? ((k_ + a_) / d_).toFixed(2) : (k_ + a_).toFixed(2);
                document.getElementById('ptr-mvp').textContent = ts.mvps || 0;
                
                trackerLoading.classList.add('hidden');
                trackerStats.classList.remove('hidden');
            } catch (err) {
                trackerLoading.textContent = 'Lỗi khi tải Tracker';
                setTimeout(() => { btnTracker.classList.remove('hidden'); trackerContent.classList.add('hidden'); }, 2000);
            }
        };

        // Render Elo Chart
        const ctx = document.getElementById('profileEloChart').getContext('2d');
        if (eloChartInstance) { eloChartInstance.destroy(); }

        const chartLabels = ['Khởi đầu'];
        const chartData = [1200];
        if (data.eloHistory && data.eloHistory.length > 0) {
            data.eloHistory.forEach(function(h, i) {
                chartLabels.push('Trận ' + (i+1));
                chartData.push(h.elo);
            });
        }

        
        if (openTracker && btnTracker) {
            btnTracker.click();
        }
        eloChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Elo',
                    data: chartData,
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff4655',
                    pointBorderColor: '#ff4655',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 25, 35, 0.9)',
                        titleColor: '#00f2fe',
                        bodyColor: '#fff',
                        borderColor: 'rgba(0,242,254,0.3)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 5 } }
                }
            }
        });

        // Show modal
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');

    } catch (e) {
        window.hideLoading();
        window.showToast('Lỗi khi tải hồ sơ: ' + e.message, 'error');
    }
};

window.closePlayerProfile = function() {
    const modal = document.getElementById('player-profile-modal');
    const modalContent = modal.querySelector('div');
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(function() { modal.classList.add('hidden'); }, 300);
};



window.getRoleIcon = function(role) {
    if (!role) return '';
    role = role.toLowerCase();
    if (role.includes('duelist')) return '<i class="fa-solid fa-fire text-valRed"></i>';
    if (role.includes('initiator')) return '<i class="fa-solid fa-eye text-yellow-400"></i>';
    if (role.includes('controller')) return '<i class="fa-solid fa-cloud text-gray-400"></i>';
    if (role.includes('sentinel')) return '<i class="fa-solid fa-shield-halved text-valCyan"></i>';
    return '<i class="fa-solid fa-crosshairs text-purple-400"></i>';
}
