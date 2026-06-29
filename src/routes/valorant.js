const express = require('express');
const router = express.Router();

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

router.post('/lookup', async (req, res) => {
  try {
    const { riotId, region } = req.body;
    if (!riotId) return res.status(400).json({ error: 'Riot ID là bắt buộc (VD: ShadowStrike#VN)' });
    const parts = riotId.split('#');
    if (parts.length < 2) return res.status(400).json({ error: 'Sai định dạng. Phải là Tên#Tag (VD: ShadowStrike#VN)' });
    const name = encodeURIComponent(parts[0]);
    const tag = encodeURIComponent(parts.slice(1).join('#'));
    const reg = (region || 'ap').toLowerCase();

    const data = await new Promise((resolve, reject) => {
      const http = require('https');
      http.get(`https://api.henrikdev.xyz/valorant/v1/mmr/${reg}/${name}/${tag}`, (resp) => {
        let body = '';
        resp.on('data', chunk => body += chunk);
        resp.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (resp.statusCode !== 200) return reject(new Error(json.errors?.[0]?.message || 'Không tìm thấy người chơi'));
            resolve(json.data);
          } catch(e) { reject(new Error('Lỗi parse response')); }
        });
      }).on('error', reject);
    });

    const rankInfo = parseRank(data.current_data?.currenttierpatched);
    res.json({
      riotId: `${data.name}#${data.tag}`,
      rank: rankInfo?.display || 'Unknown',
      pts: rankInfo?.pts || 3,
      elo: data.current_data?.elo || data.current_data?.ranking_in_tier || 0,
      region: data.region || reg
    });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

module.exports = router;
