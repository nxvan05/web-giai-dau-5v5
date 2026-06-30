const prisma = require('./prisma');

const ELO_K_FACTOR = 32;

/**
 * Calculate ELO delta for winner and loser based on average team ELO.
 * @param {number} winnerAvgElo - Average ELO of the winning team
 * @param {number} loserAvgElo - Average ELO of the losing team
 * @returns {{ winnerDelta: number, loserDelta: number }}
 */
function calculateEloDelta(winnerAvgElo, loserAvgElo) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserAvgElo - winnerAvgElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerAvgElo - loserAvgElo) / 400));
  return {
    winnerDelta: Math.round(ELO_K_FACTOR * (1 - expectedWinner)),
    loserDelta: Math.round(ELO_K_FACTOR * (0 - expectedLoser))
  };
}

/**
 * Apply ELO changes to all players on winning and losing teams.
 * Updates player elo, wins/losses count, and creates EloHistory records.
 * @param {string} matchId - The match ID
 * @param {string} team1Name - Team 1 name
 * @param {string} team2Name - Team 2 name
 * @param {string} winner - The winning team name
 */
async function applyEloChanges(matchId, team1Name, team2Name, winner) {
  const team1Players = await prisma.player.findMany({ where: { teamId: team1Name } });
  const team2Players = await prisma.player.findMany({ where: { teamId: team2Name } });

  if (!winner || team1Players.length === 0 || team2Players.length === 0) return;

  const t1AvgElo = Math.round(team1Players.reduce((s, p) => s + p.elo, 0) / team1Players.length);
  const t2AvgElo = Math.round(team2Players.reduce((s, p) => s + p.elo, 0) / team2Players.length);

  const { winnerDelta, loserDelta } = calculateEloDelta(
    winner === team1Name ? t1AvgElo : t2AvgElo,
    winner === team1Name ? t2AvgElo : t1AvgElo
  );

  const winningTeam = winner === team1Name ? team1Players : team2Players;
  const losingTeam = winner === team1Name ? team2Players : team1Players;

  for (const p of winningTeam) {
    const newElo = p.elo + winnerDelta;
    await prisma.player.update({ where: { id: p.id }, data: { elo: newElo, wins: { increment: 1 } } });
    await prisma.eloHistory.create({ data: { playerDiscordId: p.discordId, elo: newElo, delta: winnerDelta, matchId, reason: 'win' } });
  }
  for (const p of losingTeam) {
    const newElo = p.elo + loserDelta;
    await prisma.player.update({ where: { id: p.id }, data: { elo: newElo, losses: { increment: 1 } } });
    await prisma.eloHistory.create({ data: { playerDiscordId: p.discordId, elo: newElo, delta: loserDelta, matchId, reason: 'loss' } });
  }
}

module.exports = { calculateEloDelta, applyEloChanges, ELO_K_FACTOR };
