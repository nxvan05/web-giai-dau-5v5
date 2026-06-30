const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /document\.getElementById\('profile-info'\)\.innerHTML =[\s\S]*?\}\)\.join\(''\);/;

const newLogic = `                // Calculate Advanced Stats
                const teamName = data.team ? data.team.name : p.teamId || 'Tự do';
                const ss = data.seasonStats || {};
                const kda = data.kda || {};
                const k = kda.kills || 0, d = kda.deaths || 0, a = kda.assists || 0;
                const totalGames = p.wins + p.losses;
                const winRate = totalGames > 0 ? Math.round(p.wins / totalGames * 100) : 0;
                
                const avgK = totalGames > 0 ? (k / totalGames).toFixed(1) : 0;
                const avgD = totalGames > 0 ? (d / totalGames).toFixed(1) : 0;
                const avgA = totalGames > 0 ? (a / totalGames).toFixed(1) : 0;
                
                const kdRatio = d > 0 ? (k / d).toFixed(2) : (k > 0 ? k.toFixed(2) : '0.00');
                
                // Update K/D Ratio prominent display
                const kdRatioEl = document.getElementById('profile-kd-ratio');
                if (kdRatioEl) {
                    kdRatioEl.textContent = kdRatio;
                    // Color code K/D
                    if (kdRatio >= 1.5) kdRatioEl.className = 'text-2xl font-display font-black text-yellow-400 glow-text';
                    else if (kdRatio >= 1.0) kdRatioEl.className = 'text-2xl font-display font-black text-emerald-400 glow-text';
                    else kdRatioEl.className = 'text-2xl font-display font-black text-red-400 glow-text';
                }

                // Main Agents display
                const agentsContainer = document.getElementById('profile-main-agents');
                if (agentsContainer) {
                    if (p.mainAgents) {
                        const agents = p.mainAgents.split(',').map(a => a.trim()).filter(a => a);
                        agentsContainer.innerHTML = agents.map(agent => 
                            \`<div class="w-6 h-6 rounded border border-gray-700 bg-gray-800 flex items-center justify-center text-[8px] text-white font-bold" title="\${agent}">\${agent.substring(0,3).toUpperCase()}</div>\`
                        ).join('');
                        agentsContainer.classList.remove('hidden');
                    } else {
                        agentsContainer.classList.add('hidden');
                    }
                }

                // Badges System
                const badgesContainer = document.getElementById('profile-badges');
                if (badgesContainer) {
                    let badgesHTML = '';
                    if (parseFloat(kdRatio) > 1.5 && totalGames > 2) {
                        badgesHTML += \`<span class="px-2 py-0.5 bg-yellow-900/40 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold rounded flex items-center gap-1 shadow-[0_0_10px_rgba(250,204,21,0.3)]" title="K/D > 1.5"><i class="fa-solid fa-crosshairs"></i> Thợ Săn</span>\`;
                    }
                    if (p.mvps >= 2) {
                        badgesHTML += \`<span class="px-2 py-0.5 bg-purple-900/40 text-purple-400 border border-purple-500/30 text-[10px] font-bold rounded flex items-center gap-1 shadow-[0_0_10px_rgba(192,132,252,0.3)]" title="Đạt trên 2 MVP"><i class="fa-solid fa-crown"></i> Hủy Diệt</span>\`;
                    }
                    if (winRate > 60 && totalGames >= 5) {
                        badgesHTML += \`<span class="px-2 py-0.5 bg-blue-900/40 text-blue-400 border border-blue-500/30 text-[10px] font-bold rounded flex items-center gap-1 shadow-[0_0_10px_rgba(96,165,250,0.3)]" title="Tỉ lệ thắng > 60%"><i class="fa-solid fa-shield-halved"></i> Bức Tường</span>\`;
                    }
                    badgesContainer.innerHTML = badgesHTML;
                }

                document.getElementById('profile-info').innerHTML =
                    '<div><span class="text-[10px] text-gray-500">Trung bình K/D/A</span><p class="text-white font-mono font-bold text-xs">' + avgK + ' / ' + avgD + ' / ' + avgA + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Tỉ Lệ Thắng</span><p class="text-emerald-400 font-mono font-bold text-xs">' + winRate + '%</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">MVP</span><p class="text-yellow-400 font-mono font-bold text-xs">' + (p.mvps || 0) + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Trận Đã Chơi</span><p class="text-white font-mono font-bold text-xs">' + totalGames + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Đội Hiện Tại</span><p class="text-valCyan font-bold truncate text-xs">' + teamName + '</p></div>' +
                    '<div><span class="text-[10px] text-gray-500">Rank Đỉnh</span><p class="text-purple-400 font-bold text-xs">' + (p.peakRank || p.rank || '—') + '</p></div>';

                destroyProfileCharts();

                const radarBox = document.querySelector('#radar-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && radarBox) {
                    const cvs = radarBox.querySelector('canvas');
                    if (cvs) {
                        const normalizedKDA = Math.min(parseFloat(kdRatio) * 30, 100); 
                        const normalizedWR = winRate;
                        const normalizedMVP = Math.min((p.mvps || 0) * 15, 100);
                        const normalizedMatches = Math.min(totalGames * 10, 100);
                        const normalizedAvgKills = Math.min(parseFloat(avgK) * 4, 100);
                        
                        profileChartInstances.radar = new Chart(cvs, {
                            type: 'radar',
                            data: {
                                labels: ['Gánh Team (K/D)', 'Tỉ Lệ Thắng', 'Điểm Nhấn (MVP)', 'Kinh Nghiệm', 'Kills TB'],
                                datasets: [{
                                    label: 'Chỉ số',
                                    data: [normalizedKDA, normalizedWR, normalizedMVP, normalizedMatches, normalizedAvgKills],
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

                // Render Elo Line Chart
                const eloBox = document.querySelector('#elo-chart')?.parentElement;
                if (typeof Chart !== 'undefined' && eloBox && data.eloHistory) {
                    const cvs = eloBox.querySelector('canvas');
                    if (cvs) {
                        // Prepare data: Start with initial 1200, then map history
                        const labels = ['Bắt đầu'];
                        const eloData = [1200];
                        data.eloHistory.forEach((h, idx) => {
                            labels.push('Trận ' + (idx + 1));
                            eloData.push(h.elo);
                        });
                        
                        profileChartInstances.elo = new Chart(cvs, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Điểm Elo',
                                    data: eloData,
                                    borderColor: '#fbbf24',
                                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.3,
                                    pointBackgroundColor: '#fbbf24',
                                    pointRadius: 3
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { display: false },
                                    y: { 
                                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                        ticks: { color: '#6b7280', font: { size: 9 } }
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

content = content.replace(regex, newLogic);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated profile stats logic.');
