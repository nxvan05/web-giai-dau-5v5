const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const playersData = [
  { discordId: '1361867896854417469', displayName: 'vuhai5820', riotId: 'Ivan cutonhưphíc#vuhai', rank: 'Gold (Vàng)', role: 'Sentinel', type: 'Solo', peakRank: 'Platinum 3', elo: 1300, pts: 4 },
  { discordId: '903535571278909470', displayName: '._.kur0._.', riotId: 'Kuro tap aim#kuro', rank: 'Gold (Vàng)', role: 'Flex', type: 'Solo', peakRank: 'Platinum 2', elo: 1300, pts: 4 },
  { discordId: '1218952439567224832', displayName: 'zinvtl', riotId: 'ZinVTL#2713', rank: 'Platinum (Bạch Kim)', role: 'Duelist', type: 'Trio', peakRank: 'Platinum 3', elo: 1500, pts: 5 },
  { discordId: '968403219812319242', displayName: 'levi.akm1309', riotId: '14ngaybenem#TH15', rank: 'Gold (Vàng)', role: 'Controller', type: 'Solo', peakRank: 'Platinum 2', elo: 1300, pts: 4 },
  { discordId: '750319707323760690', displayName: 'uchihamoka', riotId: 'MokaBuồn#moka', rank: 'Gold (Vàng)', role: 'Sentinel', type: 'Duo', peakRank: 'Platinum 2', elo: 1300, pts: 4 },
  { discordId: '1469654176907661424', displayName: 'minhvu2907', riotId: 'nhanh la dc#3972', rank: 'Platinum (Bạch Kim)', role: 'Sentinel', type: 'Solo', peakRank: 'Diamond 2', elo: 1500, pts: 5 },
  { discordId: '1325798925311017020', displayName: 'anhthuanhthuuw', riotId: 'go youn jung#who', rank: 'Platinum (Bạch Kim)', role: 'Duelist', type: 'Solo', peakRank: 'Ascendant 1', elo: 1500, pts: 5 },
  { discordId: '1325784689750970410', displayName: 'nts_luxirious', riotId: 'Yi si tình#23727', rank: 'Gold (Vàng)', role: 'Flex', type: 'Solo', peakRank: 'Diamond 1', elo: 1300, pts: 4 },
  { discordId: '1325677278071357533', displayName: 'luong911_17931', riotId: 'xDucluong#9999', rank: 'Diamond (Kim Cương)', role: 'Controller', type: 'Solo', peakRank: 'Diamond 3', elo: 1700, pts: 6 },
  { discordId: '759272152393318410', displayName: 'nguyenxuanvan', riotId: 'evan#2908', rank: 'Gold (Vàng)', role: 'Duelist', type: 'Solo', peakRank: 'Diamond 1', elo: 1300, pts: 4 },
  { discordId: '940997626734714952', displayName: 'chunn_1911', riotId: 'Chunnn#mvp', rank: 'Ascendant (Thượng Nhân)', role: 'Duelist', type: 'Solo', peakRank: 'Immortal 3', elo: 1900, pts: 7 },
  { discordId: '811966122655350866', displayName: 'huy_mai', riotId: 'TQ ThợSănTrẻEm', rank: 'Platinum (Bạch Kim)', role: 'Sentinel', type: 'Solo', peakRank: '', elo: 1500, pts: 5 },
  { discordId: '868888411086417951', displayName: 'quyenchill', riotId: 'QuyenChill#888', rank: 'Ascendant (Thượng Nhân)', role: 'Duelist', type: 'Solo', peakRank: 'Ascendant 2', elo: 1900, pts: 7 },
  { discordId: '532201751689035787', displayName: 'dontcare2419', riotId: 'Dash Vào Tym Em #1610', rank: 'Ascendant (Thượng Nhân)', role: 'Duelist', type: 'Trio', peakRank: '', elo: 1900, pts: 7 }
];

const teamsData = [
  { name: 'BFK', color: '#F97316', teamType: 'trio', status: 'approved', captainDiscordId: '1218952439567224832', rosterIds: ["1218952439567224832","1361867896854417469"] },
  { name: 'OwO', color: '#EAB308', teamType: 'duo', status: 'approved', captainDiscordId: '750319707323760690', rosterIds: ["750319707323760690","968403219812319242"] },
  { name: 'HighEgo', color: '#F97316', teamType: 'trio', status: 'approved', captainDiscordId: '532201751689035787', rosterIds: ["532201751689035787","1325798925311017020"] },
  { name: 'LowEgo', color: '#EAB308', teamType: 'duo', status: 'approved', captainDiscordId: '1325784689750970410', rosterIds: ["1325784689750970410","1469654176907661424"] }
];

async function main() {
  console.log('Phục hồi dữ liệu từ văn bản bị lỗi...');
  
  for (const p of playersData) {
    const existing = await prisma.player.findUnique({ where: { discordId: p.discordId } });
    if (!existing) {
      await prisma.player.create({ data: p });
      console.log('✅ Đã thêm người chơi:', p.displayName);
    }
  }

  for (const t of teamsData) {
    const existing = await prisma.team.findUnique({ where: { name: t.name } });
    if (!existing) {
      await prisma.team.create({
        data: {
          name: t.name,
          captainDiscordId: t.captainDiscordId,
          status: t.status,
          teamType: t.teamType,
          color: t.color,
          rosterJson: JSON.stringify(t.rosterIds)
        }
      });
      console.log('✅ Đã thêm đội:', t.name);
    }
    
    // Assign teamId to players
    for (const dId of t.rosterIds) {
      await prisma.player.update({
        where: { discordId: dId },
        data: { teamId: t.name }
      });
    }
  }

  console.log('==============================');
  console.log('🎉 Phục hồi dữ liệu hoàn tất!');
  console.log('==============================');
}

main().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
