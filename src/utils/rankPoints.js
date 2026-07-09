/**
 * Map Rank string to Point value
 */
const RANK_POINTS_MAP = {
    "Iron": 1,
    "Sắt": 1,
    "Bronze": 2,
    "Đồng": 2,
    "Silver": 3,
    "Bạc": 3,
    "Gold": 4,
    "Vàng": 4,
    "Platinum": 5,
    "Bạch Kim": 5,
    "Diamond": 6,
    "Kim Cương": 6,
    "Ascendant": 7,
    "Siêu Việt": 7,
    "Thượng Nhân": 7,
    "Immortal": 9,
    "Bất Tử": 9,
    "Radiant": 10,
    "Thách Đấu": 10
};

/**
 * Parses a rank string (e.g. "Diamond 1 (Kim Cương)") and returns the corresponding points
 * @param {string} rankStr 
 * @returns {number}
 */
function getPointsFromRank(rankStr) {
    if (!rankStr || typeof rankStr !== 'string') return 3; // Default
    
    // Check for exact matches or partial matches
    for (const [key, value] of Object.entries(RANK_POINTS_MAP)) {
        if (rankStr.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return 3; // Default to Silver/3 if unknown
}

module.exports = {
    getPointsFromRank,
    RANK_POINTS_MAP
};
