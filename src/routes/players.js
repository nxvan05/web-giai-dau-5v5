const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discordAuth = require('../middleware/discordAuth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const pc = require('../controllers/playerController');
const orAuth = require('../middleware/orAuth');
const { henrikRequest, fetchRankWithIcon, fetchHeadshotStats } = require('../utils/henrik');
const { getPointsFromRank } = require('../utils/rankPoints');

router.get('/', auth, pc.getAll);
router.get('/profile/:discordId', pc.getProfile);

// Get own profile (Discord JWT required)
router.get('/me', auth, async (req, res, next) => {
  try {
    let discordId = req.discordUser ? req.discordUser.discordId : null;
    // Allow admin password login to access /me
    if (!discordId && req.user && req.user.id) {
      if (req.query.discordId) {
        discordId = req.query.discordId;
      } else {
        const adminPlayer = await prisma.player.findFirst({
          where: { OR: [{ displayName: req.user.username }, { discordId: req.user.username }] }
        });
        if (adminPlayer) discordId = adminPlayer.discordId;
      }
      if (!discordId) {
        const first = await prisma.player.findFirst();
        if (first) discordId = first.discordId;
      }
    }
    if (!discordId) return res.status(401).json({ error: 'Vui lòng đăng nhập bằng Discord' });
    const player = await prisma.player.findFirst({ where: { discordId } });
    if (!player) return res.status(404).json({ error: 'Bạn chưa đăng ký tham gia giải' });
    const teamName = player.teamId || '';
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: teamName }, { team2Name: teamName }] },
      orderBy: { scheduledAt: 'desc' }, take: 20
    });
    const matchHistory = matches.map(m => ({
      id: m.id, team1Name: m.team1Name, team2Name: m.team2Name,
      score1: m.score1, score2: m.score2, winner: m.winner,
      map: m.map, status: m.status, scheduledAt: m.scheduledAt,
      isTeam1: m.team1Name === teamName,
      result: m.winner ? (m.winner === teamName ? 'win' : 'loss') : 'pending'
    }));
    const stats = await prisma.matchPlayerStat.aggregate({
      where: { playerDiscordId: discordId },
      _sum: { kills: true, deaths: true, assists: true }
    });
    const eloHistory = await prisma.eloHistory.findMany({
      where: { playerDiscordId: discordId },
      orderBy: { createdAt: 'asc' }, take: 30
    });
    const team = player.teamId ? await prisma.team.findUnique({ where: { name: player.teamId } }) : null;
    const totalPlayers = await prisma.player.count();
    const totalTeams = await prisma.team.count({ where: { status: 'approved' } });
    const totalMatches = await prisma.match.count();
    const playerRank = (await prisma.player.findMany({ orderBy: { elo: 'desc' }, select: { id: true } })).findIndex(p => p.id === player.id) + 1;
    // Luôn tính PTS động từ peak rank
    const { getPointsFromRank } = require('../utils/rankPoints');
    player.pts = getPointsFromRank(player.peakRank || player.rank);
    res.json({
      player, team,
      matchHistory, eloHistory,
      kda: { kills: stats._sum.kills || 0, deaths: stats._sum.deaths || 0, assists: stats._sum.assists || 0 },
      seasonStats: { totalPlayers, totalTeams, totalMatches, playerRank }
    });
  } catch (e) { next(e); }
});

// Update own profile (Discord JWT required) — rank locked once set
router.put('/me', discordAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','riotId','rank','role','mainAgents'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    return true;
  }),
  validate,
  async (req, res, next) => {
    try {
      const discordId = req.discordUser.discordId;
      const player = await prisma.player.findFirst({ where: { discordId } });
      if (!player) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
      const { displayName, riotId, rank, role, cardUrl, accountLevel, mainAgents } = req.body;
      const data = {};
      if (displayName !== undefined) data.displayName = displayName;
      if (riotId !== undefined) data.riotId = riotId;
      // Rank locked: if player already has a rank, ignore rank changes
      if (rank !== undefined && (!player.rank || player.rank === 'Unranked')) data.rank = rank;
      if (role !== undefined) data.role = role;
        if (cardUrl !== undefined) data.cardUrl = cardUrl;
        if (accountLevel !== undefined) data.accountLevel = parseInt(accountLevel);
        if (mainAgents !== undefined) data.mainAgents = mainAgents;
      const updated = await prisma.player.update({ where: { id: player.id }, data });
      res.json(updated);
    } catch (e) { next(e); }
  }
);

// orAuth imported from middleware/orAuth.js

router.post('/', orAuth,
  body('displayName').trim().notEmpty().withMessage('Display name required'),
  body('riotId').trim().notEmpty().withMessage('Riot ID required'),
  validate,
  pc.create
);

router.put('/:id', orAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.patch('/:id', orAuth,
  body().custom((value, { req }) => {
    const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
    const hasFields = allowed.some(key => req.body[key] !== undefined);
    if (!hasFields) throw new Error('At least one field required');
    return true;
  }),
  validate,
  pc.updatePartial
);

router.delete('/:id', auth, pc.delete);

router.get('/lookup/:discordId', async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.params.discordId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (e) { next(e); }
});

router.post('/batch-lookup', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const players = await prisma.player.findMany({ where: { discordId: { in: ids } } });
    const map = {};
    for (const p of players) map[p.discordId] = p;
    res.json(map);
  } catch (e) { next(e); }
});

router.get('/free-agents', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: null },
      orderBy: { elo: 'desc' }
    });
    res.json(players);
  } catch (e) { next(e); }
});

router.get('/by-team/:teamName', async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: req.params.teamName }
    });
    res.json(players);
  } catch (e) { next(e); }
});

// Refresh rank from HenrikDev API (user self-service)
router.post('/refresh-rank', discordAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.discordUser.discordId } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    if (!player.riotId || player.riotId === 'Unknown#000') return res.status(400).json({ error: 'Chưa có Riot ID' });
    const parts = player.riotId.split('#');
    const name = parts[0];
    const tag = parts.slice(1).join('#');
    const rankData = await fetchRankWithIcon(name, tag, 'ap');
    if (!rankData) return res.status(404).json({ error: 'Không tìm thấy rank. Kiểm tra Riot ID và region.' });
    const newPts = require('../utils/rankPoints').getPointsFromRank(rankData.peakRank || rankData.rank);
    await prisma.player.update({ 
      where: { id: player.id }, 
      data: { 
        rank: rankData.rank, 
        peakRank: rankData.peakRank || player.peakRank || rankData.rank, 
        pts: newPts,
        rankIconUrl: rankData.iconUrl,
        rankIconLarge: rankData.iconLarge,
        peakIconUrl: rankData.peakIconUrl,
        peakIconLarge: rankData.peakIconLarge
      } 
    });
    res.json({ rank: rankData.rank, peakRank: rankData.peakRank || player.peakRank, pts: newPts, iconUrl: rankData.iconUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin refresh rank + stats for any player
router.post('/admin/refresh-rank/:id', orAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    if (!player.riotId || player.riotId === 'Unknown#000') return res.status(400).json({ error: 'Chưa có Riot ID' });
    const parts = player.riotId.split('#');
    const name = parts[0];
    const tag = parts.slice(1).join('#');
    const rankData = await fetchRankWithIcon(name, tag, 'ap');
    if (!rankData) return res.status(404).json({ error: 'Không tìm thấy rank' });
    const newPts = require('../utils/rankPoints').getPointsFromRank(rankData.peakRank || rankData.rank);
    await prisma.player.update({ 
      where: { id: player.id }, 
      data: { 
        rank: rankData.rank, 
        peakRank: rankData.peakRank || player.peakRank || rankData.rank, 
        pts: newPts,
        rankIconUrl: rankData.iconUrl,
        rankIconLarge: rankData.iconLarge,
        peakIconUrl: rankData.peakIconUrl,
        peakIconLarge: rankData.peakIconLarge
      } 
    });
    res.json({ rank: rankData.rank, peakRank: rankData.peakRank, pts: newPts, iconUrl: rankData.iconUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Refresh headshot stats from HenrikDev match history
router.post('/refresh-stats', discordAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findFirst({ where: { discordId: req.discordUser.discordId } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    if (!player.riotId || player.riotId === 'Unknown#000') return res.status(400).json({ error: 'Chưa có Riot ID' });
    const parts = player.riotId.split('#');
    const name = parts[0];
    const tag = parts.slice(1).join('#');
    const hsData = await fetchHeadshotStats(name, tag, 'ap', 5);
    if (!hsData) return res.status(404).json({ error: 'Không tìm thấy trận đấu nào để tính headshot %. Kiểm tra Riot ID.' });
    await prisma.player.update({
      where: { id: player.id },
      data: { headshotPct: hsData.headshotPct, shotsTotal: hsData.totalShots, matchStatsUpdatedAt: new Date() }
    });
    res.json({ headshotPct: hsData.headshotPct, totalShots: hsData.totalShots });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin refresh stats for any player
router.post('/admin/refresh-stats/:id', orAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    if (!player.riotId || player.riotId === 'Unknown#000') return res.status(400).json({ error: 'Chưa có Riot ID' });
    const parts = player.riotId.split('#');
    const name = parts[0];
    const tag = parts.slice(1).join('#');
    const hsData = await fetchHeadshotStats(name, tag, 'ap', 5);
    if (!hsData) return res.status(404).json({ error: 'Không tìm thấy trận đấu nào' });
    await prisma.player.update({
      where: { id: player.id },
      data: { headshotPct: hsData.headshotPct, shotsTotal: hsData.totalShots, matchStatsUpdatedAt: new Date() }
    });
    res.json({ headshotPct: hsData.headshotPct, totalShots: hsData.totalShots });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Evaluate a single player
router.post('/admin/evaluate/:id', orAuth, async (req, res, next) => {
  try {
    const { evaluatePlayer } = require('../utils/evaluation');
    const player = await prisma.player.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy người chơi' });
    
    const evaluation = evaluatePlayer(player);
    
    await prisma.player.update({
      where: { id: player.id },
      data: { adminEvaluation: evaluation.summary }
    });
    
    res.json(evaluation);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Evaluate all players
router.post('/admin/evaluate-all', orAuth, async (req, res, next) => {
  try {
    const { evaluatePlayer } = require('../utils/evaluation');
    const players = await prisma.player.findMany();
    let count = 0;
    
    for (const player of players) {
      const evaluation = evaluatePlayer(player);
      await prisma.player.update({
        where: { id: player.id },
        data: { adminEvaluation: evaluation.summary }
      });
      count++;
    }
    
    res.json({ ok: true, count, message: `Đã đánh giá thành công ${count} người chơi` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/import', auth, async (req, res, next) => {
  try {
    const { players } = req.body;
    if (!Array.isArray(players)) return res.status(400).json({ error: 'players array required' });
    let imported = 0;
    const errors = [];
    for (const p of players) {
      if (!p.discordId || !p.displayName) { errors.push({ discordId: p.discordId, error: 'Missing required fields' }); continue; }
      const existing = await prisma.player.findFirst({ where: { discordId: p.discordId } });
      if (existing) { errors.push({ discordId: p.discordId, error: 'Duplicate' }); continue; }
      await prisma.player.create({
        data: {
          displayName: p.displayName,
          discordId: p.discordId,
          riotId: p.riotId || 'Unknown#000',
          rank: p.rank || 'Silver (Bạc)',
          role: p.role || 'Flex',
          type: p.type || 'Solo',
          pts: parseInt(p.pts) || 3
        }
      });
      imported++;
    }
    res.json({ imported, errors });
  } catch (e) { next(e); }
});

// Tracker: full stats per match for a player
router.get('/tracker/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const player = await prisma.player.findFirst({ where: { discordId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const teamName = player.teamId || '';
    const matches = await prisma.match.findMany({
      where: { OR: [{ team1Name: teamName }, { team2Name: teamName }] },
      orderBy: { scheduledAt: 'desc' }, take: 50
    });

    // Fetch per-match stats from MatchPlayerStat
    const matchStats = await prisma.matchPlayerStat.findMany({
      where: { playerDiscordId: discordId }
    });
    const statsMap = {};
    for (const s of matchStats) statsMap[s.matchId] = s;

    const matchHistory = matches.map(m => {
      const myStat = statsMap[m.id];
      const isTeam1 = m.team1Name === teamName;
      return {
        id: m.id, team1Name: m.team1Name, team2Name: m.team2Name,
        score1: m.score1, score2: m.score2, winner: m.winner,
        map: m.map, status: m.status, scheduledAt: m.scheduledAt,
        isTeam1, result: m.winner ? (m.winner === teamName ? 'win' : 'loss') : 'pending',
        kills: myStat?.kills || 0, deaths: myStat?.deaths || 0, assists: myStat?.assists || 0,
        mvp: myStat?.mvp || false
      };
    });

    const totalStats = { kills: 0, deaths: 0, assists: 0, mvps: 0, matches: 0 };
    for (const m of matchHistory) {
      if (m.status === 'completed') {
        totalStats.kills += m.kills;
        totalStats.deaths += m.deaths;
        totalStats.assists += m.assists;
        if (m.mvp) totalStats.mvps++;
        totalStats.matches++;
      }
    }
    totalStats.kd = totalStats.deaths > 0 ? (totalStats.kills / totalStats.deaths).toFixed(2) : totalStats.kills.toFixed(2);

    const totalPlayers = await prisma.player.count();
    const playerRank = (await prisma.player.findMany({ orderBy: { elo: 'desc' }, select: { id: true } })).findIndex(p => p.id === player.id) + 1;

    res.json({ player, matchHistory, totalStats, seasonStats: { totalPlayers, playerRank } });
  } catch (e) { next(e); }
});

router.post('/auto-evaluate', auth, async (req, res, next) => {
  try {
    const { force } = req.body;
    const { getPointsFromRank } = require('../utils/rankPoints');
    
    // Fetch players. If not force, only fetch those without adminEvaluation
    const where = force ? {} : { adminEvaluation: { equals: '' } };
    const players = await prisma.player.findMany({ where });
    
    let updatedCount = 0;
    
    for (const p of players) {
      if (!force && p.adminEvaluation && p.adminEvaluation.trim() !== '') continue;
      
      let score = 0;
      
      // 1. Mức Rank (max ~80)
      const rankPts = getPointsFromRank(p.peakRank || p.rank); 
      // rankPts ranges from 1 to 10 (Iron to Radiant)
      // Scale: 1 -> 15, 10 -> 80
      score += 15 + ((rankPts - 1) / 9) * 65; 
      
      // 2. HS% (max 15)
      if (p.headshotPct && p.headshotPct > 15) {
        const bonus = Math.min(15, Math.floor(p.headshotPct - 15));
        score += bonus;
      }
      
      // 3. Elo (max 5)
      if (p.elo > 1200) {
        const eloBonus = Math.min(5, (p.elo - 1200) / 40);
        score += eloBonus;
      }
      
      // Limit to 100
      score = Math.min(100, score);
      
      // Determine Tier
      let tier = 'C';
      if (score >= 85) tier = 'S';
      else if (score >= 70) tier = 'A';
      else if (score >= 50) tier = 'B';
      
      const adminEval = `${tier} ${score.toFixed(1)}`;
      
      await prisma.player.update({
        where: { id: p.id },
        data: { adminEvaluation: adminEval }
      });
      
      updatedCount++;
    }
    
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('data:updated', { type: 'players' });
    
    res.json({ message: `Đã tự động chấm điểm cho ${updatedCount} tuyển thủ.` });
  } catch (e) {
    next(e);
  }
});

// Admin auto refresh all players from API
router.post('/admin/auto-refresh-all', orAuth, async (req, res, next) => {
  try {
    // Trả về response ngay để không bị timeout
    res.json({ success: true, message: 'Đang tiến hành quét API ngầm...' });
    
    // Chạy ngầm tiến trình
    const { getIO } = require('../utils/socket');
    const { fetchRankWithIcon, fetchHeadshotStats } = require('../utils/henrik');
    
    const players = await prisma.player.findMany({
      where: {
        riotId: { not: null, notIn: ['Unknown#000', ''] }
      }
    });
    
    const io = getIO();
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    
    // Hàm đánh giá C.Score (copy logic từ auto-evaluate)
    const evaluatePlayerScore = (player) => {
      let score = 0;
      let breakdown = [];
      const { getPointsFromRank } = require('../utils/rankPoints');
      const rankPts = getPointsFromRank(player.peakRank || player.rank);
      const rankScore = Math.min(80, 15 + ((rankPts - 1) / 9) * 65);
      score += rankScore;
      breakdown.push(`Rank: +${Math.round(rankScore)}`);

      if (player.headshotPct > 15) {
        const hsScore = Math.min(15, player.headshotPct - 15);
        score += hsScore;
        breakdown.push(`HS%: +${Math.round(hsScore)}`);
      }

      if (player.elo > 1200) {
        const eloScore = Math.min(5, Math.floor((player.elo - 1200) / 40));
        score += eloScore;
        breakdown.push(`Elo: +${eloScore}`);
      }
      const finalScore = Math.round(score * 10) / 10;
      let tier = 'C';
      if (finalScore >= 85) tier = 'S';
      else if (finalScore >= 70) tier = 'A';
      else if (finalScore >= 50) tier = 'B';
      return `${tier} ${finalScore}`;
    };

    (async () => {
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (io) {
          io.emit('broadcast:receive', { 
            type: 'progress',
            title: 'Auto Fetch API',
            message: `Đang quét: ${p.displayName} (${p.riotId}) - ${i+1}/${players.length}`,
            progress: Math.round(((i) / players.length) * 100)
          });
        }
        
        try {
          const parts = p.riotId.split('#');
          const name = parts[0];
          const tag = parts.slice(1).join('#');
          
          let updatedData = {};
          
          // Fetch Rank
          const rankData = await fetchRankWithIcon(name, tag, 'ap');
          if (rankData) {
            updatedData.rank = rankData.rank;
            updatedData.peakRank = rankData.peakRank || p.peakRank || rankData.rank;
            if (rankData.iconUrl) updatedData.rankIconUrl = rankData.iconUrl;
            if (rankData.peakIconUrl) updatedData.peakIconUrl = rankData.peakIconUrl;
          }
          await sleep(1500); // Wait 1.5s
          
          // Fetch HS%
          const hsData = await fetchHeadshotStats(name, tag, 'ap', 5, rankData?.puuid);
          if (hsData) {
            updatedData.headshotPct = hsData.headshotPct;
            updatedData.shotsTotal = hsData.totalShots;
            updatedData.matchStatsUpdatedAt = new Date();
          }
          
          // Auto evaluate
          if (Object.keys(updatedData).length > 0) {
            const merged = { ...p, ...updatedData };
            updatedData.adminEvaluation = evaluatePlayerScore(merged);
            await prisma.player.update({ where: { id: p.id }, data: updatedData });
          }
          
        } catch (err) {
          console.error(`Lỗi fetch API cho ${p.riotId}:`, err.message);
        }
        
        await sleep(1500); // Wait 1.5s
      }
      
      if (io) {
        io.emit('broadcast:receive', { 
          type: 'success',
          title: 'Hoàn tất Auto Fetch',
          message: `Đã cập nhật thông tin từ Riot API cho ${players.length} tuyển thủ!`,
          progress: 100
        });
        io.emit('data:updated', { type: 'players' });
      }
      
    })(); // Chạy ngầm
  } catch (e) {
    next(e);
  }
});

// Sync cá nhân Real-time
router.post('/:id/sync-riot', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fetchRankWithIcon, fetchHeadshotStats } = require('../utils/henrik');
    const { getIO } = require('../utils/socket');
    const { getPointsFromRank } = require('../utils/rankPoints');

    const p = await prisma.player.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'Player not found' });
    if (!p.riotId || p.riotId === 'Unknown#000') return res.status(400).json({ error: 'Riot ID không hợp lệ' });

    const parts = p.riotId.split('#');
    const name = parts[0];
    const tag = parts.slice(1).join('#');

    let updatedData = {};
    
    // Fetch Rank
    const rankData = await fetchRankWithIcon(name, tag, 'ap');
    if (rankData) {
      updatedData.rank = rankData.rank;
      updatedData.peakRank = rankData.peakRank || p.peakRank || rankData.rank;
      if (rankData.iconUrl) updatedData.rankIconUrl = rankData.iconUrl;
      if (rankData.peakIconUrl) updatedData.peakIconUrl = rankData.peakIconUrl;
    }

    // Fetch HS%
    const hsData = await fetchHeadshotStats(name, tag, 'ap', 5, rankData?.puuid);
    if (hsData) {
      updatedData.headshotPct = hsData.headshotPct;
      updatedData.shotsTotal = hsData.totalShots;
      updatedData.matchStatsUpdatedAt = new Date();
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ error: 'Không thể lấy dữ liệu từ Riot' });
    }

    const merged = { ...p, ...updatedData };
    
    // Auto evaluate C.Score
    let score = 0;
    const rankPts = getPointsFromRank(merged.peakRank || merged.rank);
    const rankScore = Math.min(80, 15 + ((rankPts - 1) / 9) * 65);
    score += rankScore;
    if (merged.headshotPct > 15) {
      score += Math.min(15, merged.headshotPct - 15);
    }
    if (merged.elo > 1200) {
      score += Math.min(5, Math.floor((merged.elo - 1200) / 40));
    }
    const finalScore = Math.round(score * 10) / 10;
    let tier = 'C';
    if (finalScore >= 85) tier = 'S';
    else if (finalScore >= 70) tier = 'A';
    else if (finalScore >= 50) tier = 'B';
    updatedData.adminEvaluation = `${tier} ${finalScore}`;

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: updatedData
    });

    const io = getIO();
    if (io) io.emit('data:updated', { type: 'players' });

    res.json({ success: true, message: 'Đồng bộ thành công!', player: updatedPlayer });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
