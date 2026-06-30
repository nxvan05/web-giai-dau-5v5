const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace loadSchedule()
const loadScheduleRegex = /async function loadSchedule\(\) \{[\s\S]*?\}\s*async function generateSwissRound\(\)/;
const newLoadSchedule = `async function loadSchedule() {
    const container = document.getElementById('schedule-list');
    showLoading('Đang tải lịch đấu...');
    try {
        const matches = await api('/api/matches');
        hideLoading();
        if (matches.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i><p>Chưa có trận đấu nào.</p></div>';
            return;
        }

        const now = new Date();
        const liveMatches = matches.filter(m => m.status === 'live');
        const pending = matches.filter(m => m.status === 'pending');
        const completed = matches.filter(m => m.status === 'completed');

        let html = '';
        const isAdmin = !!apiToken;

        // Helper to render a Match Card
        const renderMatchCard = (m, type) => {
            const isLive = type === 'live';
            const isCompleted = type === 'completed';
            const borderClass = isLive ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' : (isCompleted ? 'border-gray-700 opacity-70' : 'border-valCyan/30');
            const bgClass = isLive ? 'bg-red-900/20' : 'bg-valBg/60';
            const timeStr = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}) : 'TBD';
            
            const score1Color = isCompleted && m.winner === m.team1Name ? 'text-emerald-400' : 'text-white';
            const score2Color = isCompleted && m.winner === m.team2Name ? 'text-emerald-400' : 'text-white';
            
            let adminInlineControls = '';
            if (isAdmin && !isCompleted) {
                adminInlineControls = \`
                    <div class="mt-4 pt-3 border-t border-gray-800 flex justify-center items-center gap-2">
                        <span class="text-[10px] text-yellow-400 uppercase font-bold"><i class="fa-solid fa-bolt"></i> Cập nhật điểm:</span>
                        <input type="number" id="inline-score1-\${m.id}" value="\${m.score1 || 0}" class="w-12 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white font-mono">
                        <span class="text-gray-500">-</span>
                        <input type="number" id="inline-score2-\${m.id}" value="\${m.score2 || 0}" class="w-12 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white font-mono">
                        <button onclick="updateInlineScore('\${m.id}', '\${m.team1Name}', '\${m.team2Name}')" class="bg-valCyan/20 text-valCyan hover:bg-valCyan/40 px-2 py-0.5 rounded border border-valCyan/30 text-[10px] font-bold ml-2">LƯU</button>
                    </div>\`;
            }

            return \`<div class="\${bgClass} border \${borderClass} p-4 rounded-xl mb-4 transition-all relative overflow-hidden">
                \${isLive ? '<div class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl uppercase tracking-wider"><i class="fa-solid fa-circle-dot animate-pulse"></i> LIVE</div>' : ''}
                \${isCompleted ? '<div class="absolute top-0 right-0 bg-gray-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl uppercase tracking-wider">Đã kết thúc</div>' : ''}
                
                <div class="text-center text-[10px] text-gray-500 mb-2 font-mono">\${timeStr} \${m.map ? ' | ' + m.map : ''}</div>
                
                <div class="flex items-center justify-between">
                    <div class="flex-1 text-center">
                        <div class="font-display font-black text-xl text-white team-link cursor-pointer hover:text-valCyan truncate" onclick="event.stopPropagation();openTeamDetail('\${m.team1Name.replace(/'/g, "\\'")}')">\${m.team1Name}</div>
                    </div>
                    
                    <div class="flex-shrink-0 px-4 text-center">
                        \${isCompleted || isLive ? 
                            \`<div class="font-mono text-3xl font-black bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-800">
                                <span class="\${score1Color}">\${m.score1}</span><span class="text-gray-600 mx-2">-</span><span class="\${score2Color}">\${m.score2}</span>
                            </div>\` 
                            : \`<div class="text-gray-500 font-bold text-xs">VS</div>\`
                        }
                    </div>
                    
                    <div class="flex-1 text-center">
                        <div class="font-display font-black text-xl text-white team-link cursor-pointer hover:text-valCyan truncate" onclick="event.stopPropagation();openTeamDetail('\${m.team2Name.replace(/'/g, "\\'")}')">\${m.team2Name}</div>
                    </div>
                </div>
                
                \${m.mvpPlayerName ? \`<div class="text-center mt-3 text-[10px] text-yellow-400 font-bold"><i class="fa-solid fa-star"></i> MVP: \${m.mvpPlayerName}</div>\` : ''}
                \${adminInlineControls}
            </div>\`;
        };

        if (liveMatches.length > 0) {
            html += '<h4 class="text-sm font-bold text-red-500 mb-3 uppercase flex items-center gap-2"><span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span> TRẬN ĐANG DIỄN RA</h4>';
            liveMatches.forEach(m => { html += renderMatchCard(m, 'live'); });
        }

        if (pending.length > 0) {
            html += '<h4 class="text-sm font-bold text-yellow-400 mb-3 mt-6 uppercase"><i class="fa-solid fa-clock mr-1"></i> Sắp diễn ra</h4>';
            pending.forEach(m => { html += renderMatchCard(m, 'pending'); });
        }

        if (completed.length > 0) {
            html += '<h4 class="text-sm font-bold text-gray-500 mb-3 mt-6 uppercase"><i class="fa-solid fa-check-circle mr-1"></i> Đã kết thúc</h4>';
            completed.forEach(m => { html += renderMatchCard(m, 'completed'); });
        }

        container.innerHTML = html;
        updateAllCountdowns();
    } catch(e) {
        hideLoading();
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải lịch đấu</div>';
    }
}

async function updateInlineScore(matchId, t1, t2) {
    const s1 = parseInt(document.getElementById('inline-score1-' + matchId).value) || 0;
    const s2 = parseInt(document.getElementById('inline-score2-' + matchId).value) || 0;
    try {
        await api('/api/matches/' + matchId, { method: 'PATCH', body: { score1: s1, score2: s2, status: 'completed' } });
        showToast('Đã cập nhật tỉ số ' + t1 + ' ' + s1 + ' - ' + s2 + ' ' + t2, 'success');
        
        // Notify socket
        if (typeof socket !== 'undefined' && socket.emit) socket.emit('admin:match-updated', { matchId });
        
        loadSchedule();
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function generateSwissRound()`;
content = content.replace(loadScheduleRegex, newLoadSchedule);


// Now inject the CSS into index.html
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const bracketCss = `
    /* BRACKET CSS */
    .bracket-round { display: flex; flex-direction: column; justify-content: space-around; position: relative; }
    .bracket-match { position: relative; }
    /* Connectors for Playoffs */
    .bracket-connector-top::after { content: ''; position: absolute; top: 50%; right: -2rem; width: 2rem; height: calc(100% + 1rem); border-top: 2px solid #374151; border-right: 2px solid #374151; border-top-right-radius: 8px; z-index: 0;}
    .bracket-connector-bottom::after { content: ''; position: absolute; bottom: 50%; right: -2rem; width: 2rem; height: calc(100% + 1rem); border-bottom: 2px solid #374151; border-right: 2px solid #374151; border-bottom-right-radius: 8px; z-index: 0;}
    .bracket-connector-straight::before { content: ''; position: absolute; top: 50%; left: -2rem; width: 2rem; border-top: 2px solid #374151; z-index: 0;}
    .bracket-match > div { position: relative; z-index: 10;}
</style>`;
indexHtml = indexHtml.replace('</style>', bracketCss);

// Let's rewrite bracket container to use these connectors
const playoffRegex = /<div id="bracket-container" class="space-y-4">[\s\S]*?<\/div>\s*<\/div>/;
const newBracketContainer = `<div id="bracket-container" class="flex gap-16 overflow-x-auto pb-8 pt-4 px-4 min-h-[400px]">
                            <div class="text-center text-gray-500 text-sm py-8 w-full">
                                <i class="fa-solid fa-diagram-project text-3xl mb-2"></i>
                                <p>Hoàn thành vòng bảng để tạo playoff.</p>
                            </div>
                        </div>
                    </div>`;
indexHtml = indexHtml.replace(playoffRegex, newBracketContainer);

fs.writeFileSync(filePath, content, 'utf8');
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Successfully updated loadSchedule and CSS connectors.');
