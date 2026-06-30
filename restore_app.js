const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace switchAdminSubTab
const switchAdminRegex = /function switchAdminSubTab\(tab\) \{[\s\S]*?const btn = document\.getElementById\('admin-sub-btn-' \+ tab\);\s*if \(btn\) \{\s*btn\.classList\.remove\('text-gray-400'\);\s*btn\.classList\.add\('bg-valRed', 'text-white', 'glow-red'\);\s*\}\s*\}/;

const newSwitchAdmin = `function switchAdminSubTab(tab) {
            // Group mappings
            const groupMap = {
                'dashboard': ['admin-sub-dashboard'],
                'roster': ['admin-sub-players', 'admin-sub-teams'],
                'matches': ['admin-sub-veto', 'admin-sub-reports'],
                'system': ['admin-sub-config', 'admin-sub-discipline', 'admin-sub-data']
            };
            
            // Hide all sections
            document.querySelectorAll('[id^="admin-sub-"]').forEach(el => {
                if (el.id.startsWith('admin-sub-') && !el.id.startsWith('admin-sub-btn')) {
                    el.classList.add('hidden');
                }
            });
            
            // Show grouped sections
            if (groupMap[tab]) {
                groupMap[tab].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.classList.remove('hidden');
                });
            } else {
                // Fallback for old tabs if directly called
                const el = document.getElementById('admin-sub-' + tab);
                if (el) el.classList.remove('hidden');
            }
            
            // Update button styles
            document.querySelectorAll('.admin-sub-btn').forEach(btn => {
                btn.classList.remove('bg-valRed', 'text-white', 'glow-red');
                btn.classList.add('text-gray-400');
            });
            const btn = document.getElementById('admin-sub-btn-' + tab);
            if (btn) {
                btn.classList.remove('text-gray-400');
                btn.classList.add('bg-valRed', 'text-white', 'glow-red');
            }
        }
        
        // Broadcast Modal UI
        window.broadcastMessage = function() {
            const msg = document.getElementById('broadcast-message').value.trim();
            if (!msg) return showToast('Vui lòng nhập nội dung!', 'error');
            
            if (typeof io !== 'undefined') {
                const socket = io();
                socket.emit('broadcast', { message: msg });
            }
            showToast('Đã phát thông báo toàn máy chủ!', 'success');
            document.getElementById('broadcast-modal').classList.add('hidden');
            document.getElementById('broadcast-message').value = '';
        }
        
        // Bulk Approve Teams
        window.approveAllTeams = async function() {
            if (!confirm('Bạn có chắc muốn duyệt tự động tất cả các đội hợp lệ?')) return;
            try {
                const res = await api('/api/teams/all');
                const pending = res.filter(t => t.status === 'pending');
                let count = 0;
                for (const t of pending) {
                    await api('/api/teams/' + t.id + '/approve', { method: 'PUT' });
                    count++;
                }
                showToast('Đã duyệt thành công ' + count + ' đội!', 'success');
                if (typeof loadAdminTeams === 'function') loadAdminTeams();
            } catch (e) {
                showToast('Lỗi duyệt đội: ' + e.message, 'error');
            }
        }`;

content = content.replace(switchAdminRegex, newSwitchAdmin);

// 2. Add loadAdminDashboard
const currentAdminRegex = /let currentAdminSubTab = 'players';/;
const newLoadTabData = `        async function loadAdminDashboard() {
            try {
                const [players, teams, matches, reports] = await Promise.all([
                    api('/api/players?limit=1000'),
                    api('/api/teams/all'),
                    api('/api/matches'),
                    api('/api/matches/reports')
                ]);
                const faCount = (players.data || []).filter(p => !p.teamId).length;
                document.getElementById('metric-fa').textContent = faCount;
                const pendingTeams = teams.filter(t => t.status === 'pending').length;
                document.getElementById('metric-pending-teams').textContent = pendingTeams;
                const liveMatches = (matches.data || []).filter(m => m.status === 'scheduled' || m.status === 'live').length;
                document.getElementById('metric-live-matches').textContent = liveMatches;
                const pendingReports = reports.filter(r => r.status === 'pending').length;
                document.getElementById('metric-pending-reports').textContent = pendingReports;
            } catch (e) { console.error(e); }
        }

        let currentAdminSubTab = 'dashboard';
        window.loadTabData = function(tab) {
            currentAdminSubTab = tab;
            if (tab === 'dashboard') loadAdminDashboard();
            if (tab === 'roster') { renderAdmin(); loadAdminTeams(); }
            if (tab === 'matches') { if (typeof vetoMatchId !== 'undefined' && vetoMatchId) loadVeto(vetoMatchId); loadScoreReports(); }
            if (tab === 'system') { loadWebhookUrl(); loadPenalties(); loadAuditLog(); loadDisputes(); }
            if (tab === 'teams') renderAdmin();
            if (tab === 'config') loadWebhookUrl();
            if (tab === 'reports') loadScoreReports();
        };`;

// Also replace the old tab routing inside loadAdminData / init
content = content.replace(/let currentAdminSubTab = 'players';[\s\S]*?if \(tab === 'discipline'\) \{ loadPenalties\(\); loadAuditLog\(\); loadDisputes\(\); \}/, newLoadTabData);

// Fix call in HTML or just replace the inner assignments
content = content.replace(/currentAdminSubTab = tab;\s*if \(tab === 'teams'\) renderAdmin\(\);[\s\S]*?if \(tab === 'discipline'\) \{ loadPenalties\(\); loadAuditLog\(\); loadDisputes\(\); \}/, '');

// 3. Replace openProfile logic for Radar Chart
const oldProfileStart = /document\.getElementById\('profile-name'\)\.textContent = p\.displayName \+ ' — Hồ Sơ';/;
const oldProfileEnd = /document\.getElementById\('profile-matches'\)\.innerHTML = mh\.length === 0[\s\S]*?\n\s*\}\)\.join\(''\);/;

const newProfileLogic = `                document.getElementById('profile-name').textContent = p.displayName;
                const avatarEl = document.getElementById('profile-modal-avatar');
                if (p.discordAvatar) {
                    avatarEl.src = 'https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=128';
                    avatarEl.classList.remove('hidden');
                } else {
                    avatarEl.classList.add('hidden');
                }
                
                const roleBadge = document.getElementById('profile-role-badge');
                if (p.role) {
                    roleBadge.textContent = p.role;
                    roleBadge.classList.remove('hidden');
                } else {
                    roleBadge.classList.add('hidden');
                }
                
                document.getElementById('profile-elo-badge').textContent = 'Elo: ' + p.elo;

                const teamName = data.team ? data.team.name : p.teamId || 'Tự do';
                const ss = data.seasonStats || {};
                const kda = data.kda || {};
                const k = kda.kills || 0, d = kda.deaths || 0, a = kda.assists || 0;
                const totalGames = p.wins + p.losses;
                const winRate = totalGames > 0 ? Math.round(p.wins / totalGames * 100) : 0;
                const kdaRatio = d > 0 ? ((k + a) / d).toFixed(2) : (k + a > 0 ? (k + a).toFixed(2) : '0.00');
                const totalMatches_ = ss.totalMatches || 0;
                
                document.getElementById('profile-info').innerHTML =
                    '<div><span class="text-[10px] text-gray-500">K / D / A</span><p class="text-white font-mono font-bold">' + k + ' / ' + d + ' / ' + a + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Tỉ Lệ Thắng</span><p class="text-emerald-400 font-mono font-bold">' + winRate + '%</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">MVP</span><p class="text-yellow-400 font-mono font-bold">' + (p.mvps || 0) + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Trận Đã Chơi</span><p class="text-white font-mono font-bold">' + totalGames + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Đội Hiện Tại</span><p class="text-valCyan font-bold truncate">' + teamName + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Rank Đỉnh</span><p class="text-purple-400 font-bold">' + (p.peakRank || p.rank || '—') + '</p></div>';

                destroyProfileCharts();

                const radarBox = document.querySelector('#radar-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && radarBox) {
                    const cvs = radarBox.querySelector('canvas');
                    if (cvs) {
                        const normalizedKDA = Math.min(parseFloat(kdaRatio) * 20, 100); 
                        const normalizedWR = winRate;
                        const normalizedMVP = Math.min((p.mvps || 0) * 15, 100);
                        const normalizedMatches = Math.min(totalGames * 5, 100);
                        const normalizedKills = Math.min(k * 2, 100);
                        
                        profileChartInstances.radar = new Chart(cvs, {
                            type: 'radar',
                            data: {
                                labels: ['Gánh Team (KDA)', 'Tỉ Lệ Thắng', 'Điểm Nhấn (MVP)', 'Kinh Nghiệm', 'Kills'],
                                datasets: [{
                                    label: 'Chỉ số',
                                    data: [normalizedKDA, normalizedWR, normalizedMVP, normalizedMatches, normalizedKills],
                                    backgroundColor: 'rgba(0, 242, 254, 0.2)',
                                    borderColor: '#00f2fe',
                                    pointBackgroundColor: '#ff4655',
                                    pointBorderColor: '#fff',
                                    pointHoverBackgroundColor: '#fff',
                                    pointHoverBorderColor: '#ff4655',
                                    borderWidth: 2,
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: { legend: { display: false } },
                                scales: {
                                    r: {
                                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                        pointLabels: { color: '#9ca3af', font: { size: 10, family: 'Outfit' } },
                                        ticks: { display: false, min: 0, max: 100 }
                                    }
                                }
                            }
                        });
                    }
                }

                const mh = data.matchHistory || [];
                document.getElementById('profile-history-list').innerHTML = mh.length === 0
                    ? '<p class="text-gray-500 text-center py-4">Chưa có trận nào</p>'
                    : mh.slice().reverse().map(m => {
                        const isWin = m.result === 'win';
                        const cls = isWin ? 'text-emerald-400' : m.result === 'loss' ? 'text-red-400' : 'text-gray-400';
                        return '<div class="flex items-center justify-between py-2 px-3 bg-valBg/50 rounded-lg border-l-2 ' +
                            (isWin ? 'border-emerald-400' : m.result === 'loss' ? 'border-red-400' : 'border-gray-600') + '">' +
                            '<span class="text-white font-bold">' + m.team1Name + ' vs ' + m.team2Name + '</span>' +
                            '<span class="font-mono font-bold ' + cls + '">' + (m.status === 'completed' ? m.score1 + '-' + m.score2 : '—') + '</span></div>';
                    }).join('');`;

const oldProfileFullMatch = new RegExp(oldProfileStart.source + '[\\s\\S]*?' + oldProfileEnd.source);
content = content.replace(oldProfileFullMatch, newProfileLogic);

// 4. Replace Team Modal QR logic
const teamStatsRegex = /document\.getElementById\('team-modal-wr'\)\.textContent = total > 0 \? Math\.round\(data\.wins \/ total \* 100\) \+ '%' : '-';/;
const teamStatsReplacement = `document.getElementById('team-modal-wr').textContent = total > 0 ? Math.round(data.wins / total * 100) + '%' : '-';
                
                // Update QR Code
                const qrContainer = document.getElementById('team-qr-container');
                const qrImg = document.getElementById('team-qr-img');
                if (qrContainer && qrImg) {
                    qrContainer.classList.add('hidden'); // default hidden
                    qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=evancup-team-' + data.team.id;
                }`;

content = content.replace(teamStatsRegex, teamStatsReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully restored app.js modifications.');
