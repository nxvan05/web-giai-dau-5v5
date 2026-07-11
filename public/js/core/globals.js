// Global variables for Evan Cup
window.API = window.location.origin;
window.apiToken = null; 
window.apiPlayerCache = [];
window.lastRiotLookup = null;
window.isRefreshing = false;
window.loadingCount = 0;
window.players = [];
window.team1 = [];
window.team2 = [];

// Utils
window.showLoading = function(msg) {
    window.loadingCount++;
    const textEl = document.getElementById('loading-text');
    const overlay = document.getElementById('loading-overlay');
    if (textEl) textEl.textContent = msg || 'Đang tải...';
    if (overlay) overlay.classList.remove('hidden');
};

window.hideLoading = function() {
    window.loadingCount = Math.max(0, window.loadingCount - 1);
    const overlay = document.getElementById('loading-overlay');
    if (window.loadingCount === 0 && overlay) overlay.classList.add('hidden');
};

// Hệ thống quy đổi Rank thành điểm thi đấu sòng phẳng
window.rankPointsMap = { 
    "Iron (Sắt)": 1, 
    "Bronze (Đồng)": 2, 
    "Silver (Bạc)": 3, 
    "Gold (Vàng)": 4, 
    "Platinum (Bạch Kim)": 5, 
    "Diamond (Kim Cương)": 6, 
    "Ascendant (Thượng Nhân)": 7, 
    "Immortal (Bất Tử)": 9, 
    "Radiant (Thách Đấu)": 10 
};

window.getTrackerScore = function(p) {
    if (!p) return { score: 0, tier: 'D', color: 'text-gray-500', bg: 'bg-gray-500' };
    
    // Evaluate Headshot %
    const hs = p.headshotPct || 0;
    let hsScore = 0;
    if (hs >= 35) hsScore = 500;
    else if (hs >= 25) hsScore = 400 + (hs - 25) * 10;
    else if (hs >= 15) hsScore = 200 + (hs - 15) * 20;
    else hsScore = hs * 13;
    
    // Evaluate Win Rate
    const wins = p.wins || 0;
    const losses = p.losses || 0;
    const total = wins + losses;
    const wr = total > 0 ? (wins / total) * 100 : 50;
    let wrScore = 0;
    if (wr >= 60) wrScore = 500;
    else if (wr >= 50) wrScore = 300 + (wr - 50) * 20;
    else if (wr >= 40) wrScore = 100 + (wr - 40) * 20;
    else wrScore = wr * 2.5;

    let score = Math.round(hsScore + wrScore);
    if (score > 1000) score = 1000;
    if (score < 0) score = 0;
    
    let tier = 'C';
    let color = 'text-gray-400';
    let bg = 'bg-gray-400';
    
    if (score >= 800) { tier = 'S'; color = 'text-yellow-400'; bg = 'bg-yellow-400'; }
    else if (score >= 600) { tier = 'A'; color = 'text-emerald-400'; bg = 'bg-emerald-400'; }
    else if (score >= 400) { tier = 'B'; color = 'text-blue-400'; bg = 'bg-blue-400'; }

    return { score, tier, color, bg };
};
