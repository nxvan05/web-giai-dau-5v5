const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /async function loadBracket\(\) \{[\s\S]*?async function generatePlayoff\(\)/;
const newLoadBracket = `async function loadBracket() {
    const container = document.getElementById('bracket-container');
    const btn = document.getElementById('btn-generate-playoff');
    const isAdmin = !!apiToken;
    showLoading('Đang tải playoff...');
    try {
        const bracket = await api('/api/bracket');
        if (bracket.semis?.length > 0 || bracket.final) {
            if (isAdmin) btn.classList.add('hidden');
            const matches = await api('/api/matches');
            const playoffMatches = matches.filter(m => m.group === 'playoff' || m.round === 'semifinal' || m.round === 'final');
            
            let html = '<div class="flex gap-16 items-stretch justify-center w-full min-w-max">';
            
            // Render Semifinals Column
            html += '<div class="flex flex-col justify-around gap-12 py-8">';
            bracket.semis.forEach((s, i) => {
                const m = playoffMatches.find(p => p.team1Name === s.team1Name && p.team2Name === s.team2Name);
                const score = m?.status === 'completed' ? \`\${m.score1} - \${m.score2}\` : '?';
                const wClass = m?.winner === s.team1Name ? 'text-emerald-400' : m?.winner === s.team2Name ? 'text-emerald-400' : '';
                const connectorClass = i === 0 ? 'bracket-connector-top' : 'bracket-connector-bottom';
                
                let adminInlineControls = '';
                if (isAdmin && m && m.status !== 'completed') {
                    adminInlineControls = \`<div class="mt-2 flex justify-center gap-1 border-t border-gray-800 pt-2">
                        <input type="number" id="inline-score1-\${m.id}" value="\${m.score1 || 0}" class="w-10 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white">
                        <input type="number" id="inline-score2-\${m.id}" value="\${m.score2 || 0}" class="w-10 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white">
                        <button onclick="updateInlineScore('\${m.id}', '\${m.team1Name}', '\${m.team2Name}')" class="text-[9px] bg-valCyan/20 text-valCyan hover:bg-valCyan/40 px-1 rounded font-bold">LƯU</button>
                    </div>\`;
                }
                
                html += \`<div class="bracket-match \${connectorClass} relative">
                    <div class="bg-valBg border border-gray-700 p-4 rounded-xl text-center min-w-[200px] shadow-lg relative z-10">
                        <div class="text-[10px] text-yellow-400 uppercase font-bold mb-2">\${i === 0 ? 'Bán kết 1' : 'Bán kết 2'}</div>
                        <div class="flex justify-between items-center bg-gray-900/50 px-3 py-2 rounded border border-gray-800 mb-1">
                            <span class="text-sm font-bold text-white truncate max-w-[100px]">\${s.team1Name || 'TBD'}</span>
                            <span class="font-mono \${m?.winner === s.team1Name ? 'text-emerald-400 font-black' : 'text-gray-400'}">\${m?.status==='completed' ? m.score1 : '-'}</span>
                        </div>
                        <div class="flex justify-between items-center bg-gray-900/50 px-3 py-2 rounded border border-gray-800">
                            <span class="text-sm font-bold text-white truncate max-w-[100px]">\${s.team2Name || 'TBD'}</span>
                            <span class="font-mono \${m?.winner === s.team2Name ? 'text-emerald-400 font-black' : 'text-gray-400'}">\${m?.status==='completed' ? m.score2 : '-'}</span>
                        </div>
                        \${adminInlineControls}
                    </div>
                </div>\`;
            });
            html += '</div>';

            // Render Finals Column
            const final = playoffMatches.find(p => p.round === 'final');
            if (final) {
                const fScore = final.status === 'completed' ? \`\${final.score1} - \${final.score2}\` : '?';
                const fClass = final.winner === final.team1Name ? 'text-emerald-400' : final.winner === final.team2Name ? 'text-emerald-400' : '';
                
                let adminInlineControls = '';
                if (isAdmin && final.status !== 'completed') {
                    adminInlineControls = \`<div class="mt-2 flex justify-center gap-1 border-t border-yellow-400/30 pt-2">
                        <input type="number" id="inline-score1-\${final.id}" value="\${final.score1 || 0}" class="w-10 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white">
                        <input type="number" id="inline-score2-\${final.id}" value="\${final.score2 || 0}" class="w-10 h-6 bg-gray-900 border border-gray-700 rounded text-center text-xs text-white">
                        <button onclick="updateInlineScore('\${final.id}', '\${final.team1Name}', '\${final.team2Name}')" class="text-[9px] bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/40 px-1 rounded font-bold">LƯU</button>
                    </div>\`;
                }
                
                html += \`<div class="flex flex-col justify-center py-8">
                    <div class="bracket-match bracket-connector-straight relative">
                        <div class="bg-gradient-to-b from-yellow-500/20 via-valBg to-yellow-950/30 border-2 border-yellow-400 p-6 rounded-2xl text-center min-w-[250px] shadow-[0_0_30px_rgba(250,204,21,0.15)] relative z-10">
                            <div class="text-[12px] text-yellow-400 uppercase font-black mb-4 flex items-center justify-center gap-2"><i class="fa-solid fa-trophy text-xl"></i> CHUNG KẾT</div>
                            <div class="flex justify-between items-center bg-gray-900/80 px-4 py-3 rounded-t-lg border-b border-gray-800">
                                <span class="text-base font-black text-white truncate max-w-[120px]">\${final.team1Name || 'TBD'}</span>
                                <span class="font-mono text-xl \${final.winner === final.team1Name ? 'text-yellow-400 font-black' : 'text-gray-400'}">\${final.status==='completed' ? final.score1 : '-'}</span>
                            </div>
                            <div class="flex justify-between items-center bg-gray-900/80 px-4 py-3 rounded-b-lg">
                                <span class="text-base font-black text-white truncate max-w-[120px]">\${final.team2Name || 'TBD'}</span>
                                <span class="font-mono text-xl \${final.winner === final.team2Name ? 'text-yellow-400 font-black' : 'text-gray-400'}">\${final.status==='completed' ? final.score2 : '-'}</span>
                            </div>
                            \${final.winner ? \`<div class="mt-4 text-sm font-black text-yellow-400 animate-pulse"><i class="fa-solid fa-crown"></i> VÔ ĐỊCH: \${final.winner}</div>\` : ''}
                            \${adminInlineControls}
                        </div>
                    </div>
                </div>\`;
            }
            
            html += '</div>'; // End container
            container.innerHTML = html;
            hideLoading();
        } else {
            if (isAdmin) btn.classList.remove('hidden');
            hideLoading();
            container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8 w-full"><i class="fa-solid fa-diagram-project text-3xl mb-2"></i><p>Chưa có playoff.</p></div>';
        }
    } catch(e) {
        hideLoading();
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4 w-full">Lỗi tải dữ liệu playoff</div>';
    }
}

async function generatePlayoff()`;

content = content.replace(regex, newLoadBracket);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated loadBracket with proper tree layout.');
