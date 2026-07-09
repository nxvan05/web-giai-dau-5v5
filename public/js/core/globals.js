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
