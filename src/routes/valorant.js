const express = require('express');
const router = express.Router();
const { henrikRequest, parseRank } = require('../utils/henrik');

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

    let accountData = null;
    try {
      accountData = await henrikRequest(`/valorant/v1/account/${name}/${tag}`);
    } catch(err) {}

    // Pts tính từ peak rank (cao nhất), rank hiển thị lấy từ current rank
    const peakRankSource = data.highest_rank?.patched_tier || data.current_data?.currenttierpatched || 'Unknown';
    const peakInfo = parseRank(peakRankSource);
    const currentRankSource = data.current_data?.currenttierpatched || data.highest_rank?.patched_tier || 'Unknown';
    const currentInfo = parseRank(currentRankSource);
    res.json({
      riotId: `${data.name}#${data.tag}`,
      peakRank: data.highest_rank?.patched_tier || null,
      currentRank: data.current_data?.currenttierpatched || null,
      rank: currentInfo?.display || 'Unknown',
      pts: peakInfo?.pts || 3,
      elo: data.current_data?.elo || data.current_data?.ranking_in_tier || 0,
      region: data.region || reg,
      cardUrl: accountData?.card?.large || null,
      accountLevel: accountData?.account_level || 0
    });
  } catch (e) {
    const isApiKeyError = e.message.includes('API key') || e.message.includes('HENRIKDEV');
    res.status(isApiKeyError ? 500 : 404).json({ error: e.message });
  }
});

module.exports = router;
