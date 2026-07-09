/**
 * EvanCup Composite Player Evaluation System
 */

// Mapping of ranks to a 0-100 linear scale for scoring
const RANK_EVAL_MAP = {
  "Iron 1": 5, "Iron 2": 10, "Iron 3": 15,
  "Bronze 1": 20, "Bronze 2": 25, "Bronze 3": 30,
  "Silver 1": 35, "Silver 2": 40, "Silver 3": 45,
  "Gold 1": 50, "Gold 2": 53, "Gold 3": 56,
  "Platinum 1": 60, "Platinum 2": 63, "Platinum 3": 66,
  "Diamond 1": 70, "Diamond 2": 73, "Diamond 3": 76,
  "Ascendant 1": 80, "Ascendant 2": 83, "Ascendant 3": 86,
  "Immortal 1": 90, "Immortal 2": 93, "Immortal 3": 96,
  "Radiant": 100,
  "Unranked": 10
};

function normalizeRank(rankStr) {
  if (!rankStr || typeof rankStr !== 'string') return 10;
  if (RANK_EVAL_MAP[rankStr]) return RANK_EVAL_MAP[rankStr];
  
  const baseMap = {
    "Iron": 10, "Bronze": 25, "Silver": 40, "Gold": 53, 
    "Platinum": 63, "Diamond": 73, "Ascendant": 83, "Immortal": 93, "Radiant": 100
  };
  
  for (const [key, val] of Object.entries(baseMap)) {
    if (rankStr.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 10;
}

function normalizeElo(elo) {
  if (!elo || isNaN(elo)) return 10;
  const clamped = Math.max(800, Math.min(1800, elo));
  return ((clamped - 800) / 1000) * 100;
}

function normalizeHS(hsPct) {
  if (hsPct === undefined || hsPct === null || isNaN(hsPct)) return 10;
  const clamped = Math.max(5, Math.min(45, hsPct));
  return ((clamped - 5) / 40) * 100;
}

function getTier(composite) {
  if (composite >= 90) return 'S';
  if (composite >= 80) return 'A';
  if (composite >= 65) return 'B';
  if (composite >= 45) return 'C';
  return 'D';
}

function evaluatePlayer(player) {
  const rankScore = normalizeRank(player.rank);
  const peakScore = normalizeRank(player.peakRank);
  const eloScore = normalizeElo(player.elo);
  const hsScore = normalizeHS(player.headshotPct);
  
  const composite = (rankScore * 0.3) + (peakScore * 0.3) + (eloScore * 0.2) + (hsScore * 0.2);
  const finalScore = Math.round(composite);
  const tier = getTier(finalScore);
  const summary = `${tier} (${finalScore}đ) — R:${Math.round(rankScore)} P:${Math.round(peakScore)} E:${Math.round(eloScore)} HS:${Math.round(hsScore)}`;
  
  return { score: finalScore, tier, summary, breakdown: { rankScore, peakScore, eloScore, hsScore } };
}

module.exports = { evaluatePlayer };
