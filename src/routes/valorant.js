const express = require('express');
const router = express.Router();
const https = require('https');

const API_KEY = process.env.HENRIKDEV_API_KEY || '';

const RANK_MAP = {
  'Iron': 'Iron (Sắt)', 'Bronze': 'Bronze (Đồng)', 'Silver': 'Silver (Bạc)',
  'Gold': 'Gold (Vàng)', 'Platinum': 'Platinum (Bạch Kim)',
  'Diamond': 'Diamond (Kim Cương)', 'Ascendant': 'Ascendant (Thượng Nhân)',
  'Immortal': 'Immortal (Bất Tử)', 'Radiant': 'Radiant'
};
const RANK_PTS = { 'Iron':1, 'Bronze':2, 'Silver':3, 'Gold':4, 'Platinum':5, 'Diamond':6, 'Ascendant':7, 'Immortal':8, 'Radiant':9 };

function parseRank(tierPatched) {
  if (!tierPatched) return null;
  const base = tierPatched.split(' ')[0];
  return { display: RANK_MAP[base] || tierPatched, pts: RANK_PTS[base] || 3, base };
}

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

router.get('/lookup', (req, res) => {
  res.json({ status: 'ok', message: 'Valorant lookup route is working. Use POST with { riotId: "Name#Tag" }' });
});

router.post('/lookup', async (req, res) => {
  try {
    const { riotId, region } = req.body;
    if (!riotId) return res.status(400).json({ error: 'Riot ID là bắt buộc (VD: ShadowStrike#VN)' });
    const parts = riotId.split('#');
    if (parts.length < 2) return res.status(400).json({ error: 'Sai định dạng. Phải là Tên#Tag (VD: ShadowStrike#VN)' });
    const name = encodeURIComponent(parts[0]);
    const tag = encodeURIComponent(parts.slice(1).join('#'));
    const reg = (region || 'ap').toLowerCase();

    const data = await henrikRequest(`/valorant/v2/mmr/${reg}/${name}/${tag}`);

    // Ưu tiên peak rank (highest_rank) hơn current rank
    const rankSource = data.highest_rank?.patched_tier || data.current_data?.currenttierpatched;
    const rankInfo = parseRank(rankSource);
    res.json({
      riotId: `${data.name}#${data.tag}`,
      peakRank: data.highest_rank?.patched_tier || null,
      currentRank: data.current_data?.currenttierpatched || null,
      rank: rankInfo?.display || 'Unknown',
      pts: rankInfo?.pts || 3,
      elo: data.current_data?.elo || data.current_data?.ranking_in_tier || 0,
      region: data.region || reg
    });
  } catch (e) {
    const isApiKeyError = e.message.includes('API key') || e.message.includes('HENRIKDEV');
    res.status(isApiKeyError ? 500 : 404).json({ error: e.message });
  }
});

module.exports = router;
