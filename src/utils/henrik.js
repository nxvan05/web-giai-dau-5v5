const https = require('https');

const API_KEY = process.env.HENRIKDEV_API_KEY || '';

const RANK_MAP = {
  'Iron': 'Iron (Sắt)', 'Bronze': 'Bronze (Đồng)', 'Silver': 'Silver (Bạc)',
  'Gold': 'Gold (Vàng)', 'Platinum': 'Platinum (Bạch Kim)',
  'Diamond': 'Diamond (Kim Cương)', 'Ascendant': 'Ascendant (Thượng Nhân)',
  'Immortal': 'Immortal (Bất Tử)', 'Radiant': 'Radiant'
};

const RANK_PTS = { 'Iron':1, 'Bronze':2, 'Silver':3, 'Gold':4, 'Platinum':5, 'Diamond':6, 'Ascendant':7, 'Immortal':8, 'Radiant':9 };

/**
 * Parse a rank tier string into display name and points.
 * @param {string} tierPatched - e.g. "Gold 2"
 * @returns {{ display: string, pts: number, base: string } | null}
 */
function parseRank(tierPatched) {
  if (!tierPatched) return null;
  const base = tierPatched.split(' ')[0];
  return { display: RANK_MAP[base] || tierPatched, pts: RANK_PTS[base] || 3, base };
}

/**
 * Make a GET request to the HenrikDev API.
 * Uses query param `api_key` for authentication (v4 compatible).
 * @param {string} path - API path, e.g. `/valorant/v2/mmr/ap/Name/Tag`
 * @returns {Promise<object>} Parsed JSON data
 */
function henrikRequest(path) {
  return new Promise((resolve, reject) => {
    const querySep = path.includes('?') ? '&' : '?';
    const fullPath = API_KEY ? path + querySep + 'api_key=' + API_KEY : path;
    const opts = {
      hostname: 'api.henrikdev.xyz',
      path: fullPath,
      method: 'GET',
      headers: { 'User-Agent': 'EvanCup/1.0' }
    };
    const req = https.get(opts, (resp) => {
      let body = '';
      resp.on('data', chunk => body += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (resp.statusCode === 401) return reject(new Error('Thiếu API key. Thêm HENRIKDEV_API_KEY vào .env'));
          if (resp.statusCode === 403) return reject(new Error('API key không hợp lệ. Vào https://dashboard.henrikdev.xyz/ tạo key mới và cập nhật .env'));
          if (resp.statusCode !== 200) return reject(new Error(json.errors?.[0]?.message || 'Không tìm thấy người chơi'));
          resolve(json.data);
        } catch(e) { reject(new Error('Lỗi parse response')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = { henrikRequest, parseRank, RANK_MAP, RANK_PTS };
