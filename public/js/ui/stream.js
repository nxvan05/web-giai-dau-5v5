window.currentStreamSession = null;
window.currentStreamMatch = null;
window.streamCasters = [];

window.loadStreamArchive = async function() {
            try {
                const archive = await window.api('/api/stream/archive');
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
window.loadStreamBooth = async function() {
            window.showLoading('Đang tải stream...');
            try {
                const data = await window.api('/api/stream/current');
                window.hideLoading();
                if (data.live && data.match) {
                    window.currentStreamSession = data.session;
                    window.currentStreamMatch = data.match;
                    window.streamCasters = data.casters || [];
                    renderStreamLive();
                } else {
                    renderStreamIdle();
                }
                renderCasters();
                if (window.apiToken) {
                    document.getElementById('stream-admin-panel').classList.remove('hidden');
                    document.getElementById('stream-caster-admin').classList.remove('hidden');
                    document.getElementById('obs-widget-card')?.classList.remove('hidden');
                    document.getElementById('stream-embed-admin')?.classList.remove('hidden');
                    await loadStreamMatchSelect();
                    updateObsWidgetUrl();
                } else {
                    document.getElementById('obs-widget-card')?.classList.add('hidden');
                    document.getElementById('stream-embed-admin')?.classList.add('hidden');
                }
            } catch(e) {
                window.hideLoading();
                console.error('Stream load error:', e);
            }
        }
window.renderStreamIdle = function() {
            document.getElementById('stream-idle-state').classList.remove('hidden');
            document.getElementById('stream-live-state').classList.add('hidden');
            document.getElementById('stream-live-badge').textContent = 'LIVESTREAM CHƯA KÍCH HOẠT';
            document.getElementById('stream-live-badge').className = 'text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] font-mono';
            document.getElementById('stream-embed-placeholder').classList.remove('hidden');
            document.getElementById('stream-embed-active').classList.add('hidden');
            document.getElementById('stream-kda-container').innerHTML = '<div class="text-center text-gray-500 text-sm py-4"><i class="fa-solid fa-chart-line text-3xl mb-2"></i><p>Bắt đầu trận đấu để theo dõi KDA</p></div>';
        }
window.renderStreamLive = function() {
            const m = window.currentStreamMatch;
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
window.updateObsCasters = function() {
            const casterNames = window.streamCasters.map(c => c.name || '???').join(', ');
            document.getElementById('obs-casters').textContent = 'BLV: ' + (casterNames || '—');
        }
window.updateObsWidgetUrl = function() {
            const url = window.location.origin + '/?obs-widget=1';
            document.getElementById('obs-widget-url').textContent = url;
        }
window.copyObsWidgetUrl = function() {
            const el = document.createElement('textarea');
            el.value = document.getElementById('obs-widget-url').textContent;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            window.showToast('Đã sao chép OBS Widget URL!', 'success');
        }
window.embedStreamUrl = function(url) {
            url = url || document.getElementById('stream-embed-url').value.trim();
            if (!url) return window.showToast('Nhập URL stream!', 'error');
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
window.loadStreamMatchSelect = async function() {
            try {
                const matches = await window.api('/api/matches');
                const pending = matches.filter(m => m.status === 'pending');
                const select = document.getElementById('stream-match-select');
                select.innerHTML = '<option value="">-- Chọn trận --</option>' +
                    pending.map(m => `<option value="${m.id}" ${window.currentStreamMatch?.id === m.id ? 'selected' : ''}>${m.team1Name} vs ${m.team2Name} ${m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('vi-VN') : ''}</option>`).join('');
            } catch(e) {}
        }
window.startStream = async function() {
            const matchId = document.getElementById('stream-match-select').value;
            if (!matchId) return window.showToast('Chọn trận đấu!', 'error');
            try {
                const data = await window.api('/api/stream/current', { method: 'PUT', body: { matchId } });
                window.currentStreamSession = data.session;
                window.currentStreamMatch = data.match;
                window.showToast('Đã bắt đầu stream: ' + data.match.team1Name + ' vs ' + data.match.team2Name, 'success');
                renderStreamLive();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.stopStream = async function() {
            if (!window.currentStreamSession) return window.showToast('Không có stream nào!', 'error');
            try {
                await window.api('/api/stream/' + window.currentStreamSession.id + '/stop', { method: 'POST' });
                window.currentStreamSession = null;
                window.currentStreamMatch = null;
                window.showToast('Đã kết thúc stream!', 'success');
                renderStreamIdle();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.updateStreamScore = async function() {
            if (!window.currentStreamMatch) return window.showToast('Không có trận đấu trực tiếp!', 'error');
            const score1 = parseInt(document.getElementById('stream-ctrl-score1').value) || 0;
            const score2 = parseInt(document.getElementById('stream-ctrl-score2').value) || 0;
            try {
                const updated = await window.api('/api/stream/current/score', {
                    method: 'PUT',
                    body: { matchId: window.currentStreamMatch.id, score1, score2 }
                });
                window.currentStreamMatch = updated;
                renderStreamLive();
                window.showToast('Đã cập nhật tỉ số: ' + updated.score1 + ' - ' + updated.score2, 'success');
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.loadStreamKDA = async function() {
            if (!window.currentStreamMatch) return;
            try {
                const stats = await window.api('/api/teams/kda/' + window.currentStreamMatch.id);
                if (stats && stats.players && stats.players.length > 0) {
                    let html = '<div class="space-y-3">';
                    const team1players = stats.players.filter(p => p.teamNumber === 1);
                    const team2players = stats.players.filter(p => p.teamNumber === 2);

                    if (team1players.length > 0) {
                        html += '<h4 class="text-[10px] text-valCyan font-bold uppercase">' + (window.currentStreamMatch.team1Name || 'Đội 1') + '</h4>';
                        team1players.forEach(p => {
                            html += '<div class="flex items-center justify-between bg-valBg/60 border border-valCyan/20 p-2 rounded-lg text-xs"><span class="text-white">' + (p.playerName || '???') + '</span><span class="font-mono text-valCyan">' + (p.kills||0) + ' / ' + (p.deaths||0) + ' / ' + (p.assists||0) + '</span></div>';
                        });
                    }
                    if (team2players.length > 0) {
                        html += '<h4 class="text-[10px] text-valRed font-bold uppercase mt-2">' + (window.currentStreamMatch.team2Name || 'Đội 2') + '</h4>';
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
window.addCaster = async function() {
            const name = document.getElementById('caster-name-input').value.trim();
            const discordId = document.getElementById('caster-discord-input').value.trim();
            const role = document.getElementById('caster-role-select').value;
            if (!name) return window.showToast('Nhập tên BLV!', 'error');
            try {
                const caster = await window.api('/api/stream/casters', { method: 'POST', body: { name, discordId, role } });
                document.getElementById('caster-name-input').value = '';
                document.getElementById('caster-discord-input').value = '';
                window.showToast('Đã thêm BLV: ' + name, 'success');
                renderCasters();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.deleteCaster = async function(id) {
            try {
                await window.api('/api/stream/casters/' + id, { method: 'DELETE' });
                window.showToast('Đã xóa BLV!', 'success');
                renderCasters();
            } catch(e) {
                window.showToast('Lỗi: ' + e.message, 'error');
            }
        }
window.renderCasters = async function() {
            try {
                const casters = await window.api('/api/stream/casters');
                window.streamCasters = casters;

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
                            (window.apiToken ? '<button onclick="deleteCaster(\'' + c.id + '\')" class="text-gray-500 hover:text-valRed text-xs"><i class="fa-solid fa-trash"></i></button>' : '') +
                            '</div>';
                    }).join('');
                }

                // Admin caster management list
                if (window.apiToken) {
                    const adminList = document.getElementById('caster-list-admin');
                    adminList.innerHTML = casters.map(c => '<div class="flex items-center justify-between bg-valBg/40 border border-gray-800 p-2 rounded-lg text-xs"><span class="text-white">' + c.name + '</span><button onclick="deleteCaster(\'' + c.id + '\')" class="text-gray-500 hover:text-valRed"><i class="fa-solid fa-xmark"></i></button></div>').join('');
                }

                updateObsCasters();
            } catch(e) {}
        }

