window.initSocket = function() {
        // === WebSocket real-time ===
        window.window.socket = null;
        if (typeof io !== 'undefined') {
            window.socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
            // socket connected
            window.socket.on('match:result', (data) => {
                window.showToast('Kết quả: ' + (data.winner || 'Hòa') + ' (' + (data.score1 || 0) + '-' + (data.score2 || 0) + ')', 'success');
                window.renderSchedule(); window.loadLeaderboard(); window.pulseTab('leaderboard-tab');
                if (data.round === 'semifinal' || data.round === 'final') {
                    if (!document.getElementById('bracket-tab')?.classList.contains('hidden')) window.loadBracket(); else window.pulseTab('bracket-tab');
                }
            });
            window.socket.on('match:created', (data) => {
                window.showToast('Trận mới: ' + data.team1Name + ' vs ' + data.team2Name, 'info');
                window.renderSchedule(); window.pulseTab('schedule-tab');
            });
            window.socket.on('matches:generated', (data) => {
                window.showToast('Đã tạo ' + data.count + ' trận!', 'success');
                window.renderSchedule();
            });
            window.socket.on('mvp:assigned', (data) => {
                window.showToast('MVP: ' + (data.playerName || data.discordId), 'success');
                window.loadLeaderboard(); window.pulseTab('leaderboard-tab');
            });
            window.socket.on('player:created', (data) => {
                window.showToast('Đăng ký mới: ' + data.displayName, 'info');
                window.loadLeaderboard(); window.loadAdminStats(); window.renderAdmin(); window.pulseTab('leaderboard-tab');
            });
            window.socket.on('checkin:updated', (data) => {
                window.showToast('Check-in: ' + data.count + ' người', 'info');
                window.renderSchedule(); window.pulseTab('schedule-tab');
            });
            window.socket.on('bracket:generated', () => {
                window.showToast('Đã tạo playoff!', 'success');
                if (document.getElementById('bracket-tab')?.classList.contains('hidden') === false) window.loadBracket();
            });
            window.socket.on('score:report', (data) => {
                window.showToast('Có báo cáo kết quả mới!', 'info');
                if (window.apiToken && document.getElementById('admin-tab')?.classList.contains('hidden') === false) window.loadScoreReports();
            });
            window.socket.on('veto:update', (data) => {
                if (data.matchId === document.getElementById('veto-match-select')?.value) {
                    window.window.currentVetoData = data;
                    window.renderVetoBoard(data);
                }
            });
            window.socket.on('veto:reset', (data) => {
                if (data.matchId === document.getElementById('veto-match-select')?.value) {
                    window.window.currentVetoData = { phase: 0, maps: Object.fromEntries(MAP_LIST.map(m => [m, 'active'])), matchId: data.matchId, active: false };
                    window.renderVetoBoard(window.window.currentVetoData);
                    document.getElementById('veto-start-btn').classList.remove('hidden');
                    window.showToast('VETO đã được reset', 'info');
                }
            });
            window.socket.on('team:created', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
            });
            window.socket.on('team:updated', (data) => {
                if (data?.status === 'approved') window.showToast('Đội ' + data.name + ' đã được duyệt!', 'success');
                if (data?.status === 'rejected') window.showToast('Đội ' + data.name + ' đã bị từ chối!', 'warning');
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
            });
            window.socket.on('team:approved', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
            });
            window.socket.on('joinRequest:created', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
            });
            window.socket.on('joinRequest:resolved', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
            });
            window.socket.on('kda:updated', (data) => {
                if (data.matchId && document.getElementById('match-detail-modal')?.classList.contains('hidden') === false) {
                    window.openMatchDetail(data.matchId);
                }
            });
            window.socket.on('score:report-resolved', (data) => {
                window.showToast(data?.status === 'approved' ? 'Báo cáo đã duyệt' : 'Báo cáo đã từ chối', 'info');
                window.renderSchedule(); window.loadLeaderboard(); window.pulseTab('leaderboard-tab');
                if (window.apiToken) window.loadScoreReports();
            });
            window.socket.on('teams:reload', () => {
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
                window.loadLeaderboard(); window.pulseTab('leaderboard-tab');
            });
            window.socket.on('team:deleted', () => {
                window.showToast('Một đội đã bị xoá', 'warning');
                if (!document.getElementById('teams-tab')?.classList.contains('hidden')) window.loadTeamsBrowser(); else window.pulseTab('teams-tab');
                window.loadLeaderboard(); window.pulseTab('leaderboard-tab');
            });
            window.socket.on('stream:casters', () => {
                if (!document.getElementById('stream-tab')?.classList.contains('hidden')) window.renderCasters();
            });
            window.socket.on('stream:score', (data) => {
                if (window.showToast) window.showToast('Cập nhật tỉ số live: ' + data.score1 + ' - ' + data.score2, 'info');
                if (window.renderSchedule) window.renderSchedule();
                if (window.loadBracket && !document.getElementById('bracket-tab')?.classList.contains('hidden')) window.loadBracket();
            });
        }



};
window.initSocket();
