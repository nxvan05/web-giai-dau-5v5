const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.joinRequest.deleteMany();
  await prisma.eloHistory.deleteMany();
  await prisma.matchPlayerStat.deleteMany();
  await prisma.scoreReport.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.notification.deleteMany();

  const ranks = ['Iron (Sắt)', 'Bronze (Đồng)', 'Silver (Bạc)', 'Gold (Vàng)', 'Platinum (Bạch Kim)', 'Diamond (Kim Cương)', 'Ascendant (Thượng Nhân)', 'Immortal (Bất Tử)'];
  const roles = ['Duelist', 'Initiator', 'Sentinel', 'Controller', 'Flex'];
  const types = ['Solo', 'Duo', 'Trio'];
  const names = [
    'ShadowStrike', 'PhoenixFire', 'NightHawk', 'StormBreaker', 'IcePhoenix',
    'DarkViper', 'CrimsonBlade', 'ThunderFury', 'SilverFang', 'GoldenEagle',
    'BlueDragon', 'RedPhoenix', 'BlackWidow', 'WhiteTiger', 'GreenArrow',
    'PurpleHaze', 'OrangeCrush', 'YellowJacket', 'PinkPanda', 'BrownBear',
    'GrayWolf', 'CyanStorm', 'MistShadow', 'LunarEclipse', 'SolarFlare',
    'NeonNights', 'CyberPunk', 'StarDust', 'MoonLight', 'SkyWalker'
  ];
  const tags = ['VN', 'SG', 'JP', 'KR', 'US', 'EU', 'PH', 'TH', 'ID', 'MY'];
  const players = [];

  for (let i = 0; i < 30; i++) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const rankPts = Math.min(ranks.indexOf(rank) + 1, 8);
    const player = await prisma.player.create({
      data: {
        displayName: names[i],
        discordId: '1000000' + String(i).padStart(7, '0'),
        riotId: names[i] + '#' + tags[Math.floor(Math.random() * tags.length)],
        rank,
        role: roles[Math.floor(Math.random() * roles.length)],
        type: types[Math.floor(Math.random() * types.length)],
        pts: rankPts,
        elo: 1000 + Math.floor(Math.random() * 500),
        wins: Math.floor(Math.random() * 10),
        losses: Math.floor(Math.random() * 10),
        mvps: Math.floor(Math.random() * 3),
      }
    });
    players.push(player);
  }
  console.log('Created ' + players.length + ' players');

  // Create 6 teams (Team A through F), 5 players each
  const teamNames = ['Alpha Esports', 'Bravo Squad', 'Cypher Crew', 'Delta Force', 'Echo Gaming', 'Fusion Five'];
  const teams = [];
  for (let i = 0; i < 6; i++) {
    const teamPlayers = players.slice(i * 5, i * 5 + 5);
    const captain = teamPlayers[0];
    const rosterIds = teamPlayers.map(p => p.discordId);
    const team = await prisma.team.create({
      data: {
        name: teamNames[i],
        captainDiscordId: captain.discordId,
        rosterJson: JSON.stringify(rosterIds),
        status: 'approved',
      }
    });
    teams.push(team);
    // Assign teamId to players
    for (const p of teamPlayers) {
      await prisma.player.update({ where: { id: p.id }, data: { teamId: team.name } });
    }
  }
  console.log('Created ' + teams.length + ' teams');

  // Create matches: group stage round-robin (Group A: teams 0,1,2; Group B: teams 3,4,5)
  const groups = [
    [teamNames[0], teamNames[1], teamNames[2]],
    [teamNames[3], teamNames[4], teamNames[5]]
  ];
  const maps = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];
  let matchIdx = 0;
  const startDate = new Date();
  startDate.setHours(startDate.getHours() + 1);

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const score1 = Math.floor(Math.random() * 13);
        const score2 = Math.floor(Math.random() * 13);
        const isCompleted = matchIdx < 4; // first 4 matches completed, rest pending
        const match = await prisma.match.create({
          data: {
            group: group === groups[0] ? 'A' : 'B',
            round: 'group',
            team1Name: group[i],
            team2Name: group[j],
            score1: isCompleted ? score1 : 0,
            score2: isCompleted ? score2 : 0,
            winner: isCompleted ? (score1 === score2 ? null : (score1 > score2 ? group[i] : group[j])) : null,
            map: maps[Math.floor(Math.random() * maps.length)],
            scheduledAt: new Date(startDate.getTime() + matchIdx * 3600000),
            status: isCompleted ? 'completed' : 'pending',
          }
        });
        matchIdx++;
      }
    }
  }
  console.log('Created ' + matchIdx + ' matches (' + (matchIdx - (matchIdx - 4)) + ' completed)');

  console.log('Done! Database seeded with 30 players, 6 teams, matches.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
