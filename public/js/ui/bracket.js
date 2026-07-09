window.loadBracket = async function() {
    const container = document.getElementById('bracket-container');
    const btn = document.getElementById('btn-generate-playoff');
    const isAdmin = !!window.apiToken;
    window.showLoading('Đang tải playoff...');
    try {
        const bracket = await window.api('/api/bracket');
        if (bracket.semis?.length > 0 || bracket.final) {
            if (isAdmin && btn) btn.classList.add('hidden');
            const matches = await window.api('/api/matches');
            const playoffMatches = matches.filter(m => m.group === 'playoff' || m.round === 'semifinal' || m.round === 'final');
            let html = '<div class="flex flex-col items-center w-full">';
            
            if (bracket.semis) {
                html += '<div class="flex flex-row justify-center gap-8 md:gap-32 w-full relative">';
                
                // CSS Connecting Tree Line
                html += '<div class="absolute top-[50%] left-[25%] right-[25%] bottom-0 border-t-2 border-l-2 border-r-2 border-valCyan/30 rounded-t-xl z-0 pointer-events-none"></div>';

                bracket.semis.forEach((s, i) => {
                    const m = playoffMatches.find(p => p.team1Name === s.team1Name && p.team2Name === s.team2Name);
                    const score = m?.status === 'completed' ? `${m.score1} - ${m.score2}` : '?';
                    const wClass = m?.winner === s.team1Name ? 'text-emerald-400' : m?.winner === s.team2Name ? 'text-emerald-400' : '';
                    html += `<div class="bg-valBg/90 border border-gray-800 p-4 rounded-xl text-center min-w-[140px] md:min-w-[180px] relative z-10 shadow-lg">
                        <div class="text-[10px] text-yellow-400 uppercase font-bold mb-2">${i === 0 ? 'Bán kết 1' : 'Bán kết 2'}</div>
                        <div class="text-sm font-bold text-white truncate max-w-[150px] mx-auto">${s.team1Name || 'TBD'}</div>
                        <div class="text-lg font-black font-mono ${wClass}">${score}</div>
                        <div class="text-sm font-bold text-white truncate max-w-[150px] mx-auto">${s.team2Name || 'TBD'}</div>
                        ${m && isAdmin ? `<button onclick="if(window.openResultModal) window.openResultModal('${m.id}','${m.team1Name}','${m.team2Name}','${m.score1}','${m.score2}','${m.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> KQ</button>` : ''}
                    </div>`;
                });
                html += '</div>';
            }
            
            const final = playoffMatches.find(p => p.round === 'final');
            if (final) {
                // Vertical line to Final
                html += '<div class="w-0.5 h-10 bg-valCyan/30 relative z-0"></div>';
                
                const fScore = final.status === 'completed' ? `${final.score1} - ${final.score2}` : '?';
                const fClass = final.winner === final.team1Name ? 'text-emerald-400' : final.winner === final.team2Name ? 'text-emerald-400' : '';
                html += `<div class="flex justify-center relative z-10">
                    <div class="bg-gradient-to-b from-yellow-500/20 via-valBg to-yellow-950/30 border-2 border-yellow-400 p-6 rounded-2xl text-center min-w-[200px] md:min-w-[250px] shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        <div class="text-[10px] text-yellow-400 uppercase font-bold mb-2"><i class="fa-solid fa-trophy"></i> CHUNG KẾT</div>
                        <div class="text-sm font-bold text-white truncate max-w-[200px] mx-auto">${final.team1Name || 'TBD'}</div>
                        <div class="text-2xl font-black font-mono ${fClass}">${fScore}</div>
                        <div class="text-sm font-bold text-white truncate max-w-[200px] mx-auto">${final.team2Name || 'TBD'}</div>
                        ${final.winner ? `<div class="mt-3 text-sm font-black text-yellow-400 drop-shadow-md">🏆 Vô địch: ${final.winner}</div>` : ''}
                        ${isAdmin ? `<button onclick="if(window.openResultModal) window.openResultModal('${final.id}','${final.team1Name}','${final.team2Name}','${final.score1}','${final.score2}','${final.map||''}')" class="mt-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded hover:bg-yellow-400/10 transition"><i class="fa-solid fa-pen"></i> Nhập KQ</button>` : ''}
                    </div>
                </div>`;
            }
            html += '</div>';
            container.innerHTML = html;
            window.hideLoading();
        } else {
            if (isAdmin && btn) btn.classList.remove('hidden');
            window.hideLoading();
            container.innerHTML = '<div class="text-center text-gray-500 text-sm py-8"><i class="fa-solid fa-diagram-project text-3xl mb-2"></i><p>Chưa có playoff.</p></div>';
        }
    } catch(e) {
        window.hideLoading();
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Lỗi tải dữ liệu playoff</div>';
    }
};

window.generatePlayoff = async function() {
    if (!window.requireAdminAuth || !window.requireAdminAuth()) return;
    try {
        await window.api('/api/bracket/generate', { method: 'POST' });
        window.showToast('Đã tạo playoff!', 'success');
        window.loadBracket();
    } catch(e) {
        window.showToast('Lỗi: ' + e.message, 'error');
    }
};
