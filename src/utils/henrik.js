const https = require('https');

const API_KEY = process.env.HENRIKDEV_API_KEY || '';

const RANK_MAP = {
  'Iron': 'Iron (Sắt)', 'Bronze': 'Bronze (Đồng)', 'Silver': 'Silver (Bạc)',
  'Gold': 'Gold (Vàng)', 'Platinum': 'Platinum (Bạch Kim)',
  'Diamond': 'Diamond (Kim Cương)', 'Ascendant': 'Ascendant (Thượng Nhân)',
  'Immortal': 'Immortal (Bất Tử)', 'Radiant': 'Radiant'
};

const RANK_PTS = { 'Iron':1, 'Bronze':2, 'Silver':3, 'Gold':4, 'Platinum':5, 'Diamond':6, 'Ascendant':7, 'Immortal':9, 'Radiant':10 };

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
      headers: { 'User-Agent': 'EvanCup/1.0' },
      timeout: 10000
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
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Safe version of henrikRequest that returns null on failure instead of throwing.
 */
async function safeHenrikRequest(path) {
  try { return await henrikRequest(path); } catch (e) { return null; }
}

/**
 * Find a player's data within a v4 match response.
 * v4 structure: match.players[] (not .all_players), teams keyed by UUID.
 */
function findMeInMatch(match, name, tag, puuid = null) {
  const players = match?.players || [];
  if (puuid) {
    const found = players.find(p => p.puuid === puuid);
    if (found) return found;
  }
  // Fallback to name/tag with basic normalization
  const norm = str => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase() : '';
  const nName = norm(name);
  const nTag = norm(tag);
  return players.find(p => norm(p.name) === nName && norm(p.tag) === nTag);
}

/**
 * Find the team object matching a player's team_id within a v4 match.
 */
function findPlayerTeam(match, teamId) {
  const teams = match?.teams || {};
  for (const key of Object.keys(teams)) {
    if (teams[key].team_id === teamId) return teams[key];
  }
  return null;
}

/**
 * Fetch recent matches and aggregate headshot stats for a player.
 * @param {string} name - Riot ID name
 * @param {string} tag - Riot ID tag
 * @param {string} region - Region (ap, na, eu, etc.)
 * @param {number} [maxMatches=5] - Number of recent matches to parse
 * @param {string} [puuid] - Optional PUUID to ensure accurate matching
 * @returns {Promise<{ headshotPct: number, totalShots: number } | null>}
 */
async function fetchHeadshotStats(name, tag, region, maxMatches = 5, puuid = null) {
  const data = await safeHenrikRequest(`/valorant/v4/matches/${region || 'ap'}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  if (!data || !Array.isArray(data)) return null;
  let totalHs = 0, totalBody = 0, totalLeg = 0, matchesCount = 0;
  for (const match of data) {
    if (matchesCount >= maxMatches) break;
    const me = findMeInMatch(match, name, tag, puuid);
    if (me?.stats) {
      totalHs += me.stats.headshots || 0;
      totalBody += me.stats.bodyshots || 0;
      totalLeg += me.stats.legshots || 0;
      matchesCount++;
    }
  }
  const totalShots = totalHs + totalBody + totalLeg;
  if (totalShots === 0) return null;
  return { headshotPct: Math.round((totalHs / totalShots) * 10000) / 100, totalShots };
}

/**
 * Fetch MMR data and extract rank + icon URLs.
 * @param {string} name - Riot ID name
 * @param {string} tag - Riot ID tag
 * @param {string} region - Region
 * @returns {Promise<{ rank: string, pts: number, peakRank: string|null, iconUrl: string|null, iconLarge: string|null } | null>}
 */
async function fetchRankWithIcon(name, tag, region) {
  const data = await safeHenrikRequest(`/valorant/v2/mmr/${region || 'ap'}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  if (!data?.current_data) return null;
  const parsed = parseRank(data.current_data.currenttierpatched);
  const peakParsed = data.highest_rank?.patched_tier ? parseRank(data.highest_rank.patched_tier) : null;
  return {
    puuid: data.puuid,
    rank: parsed ? parsed.display : (data.current_data.currenttierpatched || 'Unranked'),
    pts: parsed?.pts || 3,
    peakRank: peakParsed ? peakParsed.display : null,
    iconUrl: data.current_data.images?.small || '',
    iconLarge: data.current_data.images?.large || '',
    peakIconUrl: data.highest_rank?.images?.small || data.current_data.images?.small || '',
    peakIconLarge: data.highest_rank?.images?.large || data.current_data.images?.large || ''
  };
}

/**
 * Fetch recent competitive matches and aggregate Valorant season stats for a player.
 * Uses v4 endpoint — filters for Competitive mode on the client side.
 * @param {string} name - Riot ID name
 * @param {string} tag - Riot ID tag
 * @param {string} region - Region (ap, na, eu, etc.)
 * @param {number} [maxMatches=15] - Fetch this many, then filter for Competitive
 * @returns {Promise<{ kills: number, deaths: number, assists: number, headshotPct: number, wins: number, losses: number, matches: number, kd: string, kad: string } | null>}
 */
async function fetchValorantSeasonStats(name, tag, region, maxMatches = 15) {
  const data = await safeHenrikRequest(`/valorant/v4/matches/${region || 'ap'}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=${maxMatches}`);
  if (!data || !Array.isArray(data)) return null;
  let kills = 0, deaths = 0, assists = 0;
  let totalHs = 0, totalBody = 0, totalLeg = 0;
  let wins = 0, losses = 0, matches = 0;
  for (const match of data) {
    // Only count competitive matches
    if (match?.metadata?.queue?.name !== 'Competitive') continue;
    const me = findMeInMatch(match, name, tag);
    if (!me?.stats) continue;
    kills += me.stats.kills || 0;
    deaths += me.stats.deaths || 0;
    assists += me.stats.assists || 0;
    totalHs += me.stats.headshots || 0;
    totalBody += me.stats.bodyshots || 0;
    totalLeg += me.stats.legshots || 0;
    const teamObj = findPlayerTeam(match, me.team_id);
    if (teamObj) {
      if (teamObj.won) wins++;
      else losses++;
    }
    matches++;
  }
  const totalShots = totalHs + totalBody + totalLeg;
  const headshotPct = totalShots > 0 ? Math.round((totalHs / totalShots) * 10000) / 100 : 0;
  const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
  const kad = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);
  return { kills, deaths, assists, headshotPct, wins, losses, matches, kd, kad };
}

module.exports = { henrikRequest, safeHenrikRequest, parseRank, fetchHeadshotStats, fetchRankWithIcon, fetchValorantSeasonStats, RANK_MAP, RANK_PTS };
