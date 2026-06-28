const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const prisma = require('../utils/prisma');
const log = require('../utils/logger');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

async function registerCommands() {
  if (!TOKEN || !process.env.DISCORD_CLIENT_ID) return;
  const commands = [
    {
      name: 'checkin',
      description: 'Check-in cho trận đấu sắp tới',
      options: [{
        type: 3,
        name: 'match_id',
        description: 'ID trận đấu (xem trong lịch)',
        required: true,
      }],
    },
    {
      name: 'profile',
      description: 'Xem thông tin tuyển thủ',
      options: [{
        type: 3,
        name: 'discord_id',
        description: 'Discord ID (để trống để xem của bạn)',
        required: false,
      }],
    },
    {
      name: 'schedule',
      description: 'Xem lịch thi đấu hôm nay',
    },
    {
      name: 'register',
      description: 'Hướng dẫn đăng ký giải đấu',
    },
    {
      name: 'standings',
      description: 'Xem bảng xếp hạng hiện tại',
    },
    {
      name: 'my_matches',
      description: 'Xem trận đấu sắp tới của bạn',
    },
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID), { body: commands });
      log.info('Discord slash commands registered (guild)');
    } else {
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
      log.info('Discord slash commands registered (global)');
    }
  } catch (e) {
    log.error('Failed to register Discord commands', { error: e.message });
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'checkin': await handleCheckin(interaction); break;
      case 'profile': await handleProfile(interaction); break;
      case 'schedule': await handleSchedule(interaction); break;
      case 'register': await handleRegister(interaction); break;
      case 'standings': await handleStandings(interaction); break;
      case 'my_matches': await handleMyMatches(interaction); break;
    }
  } catch (e) {
    log.error('Command error', { command: interaction.commandName, error: e.message });
    if (!interaction.replied) {
      await interaction.reply({ content: 'Có lỗi xảy ra, vui lòng thử lại sau.', ephemeral: true });
    }
  }
});

async function getPlayerByDiscordId(discordId) {
  return prisma.player.findFirst({ where: { discordId } });
}

async function handleCheckin(interaction) {
  const matchId = interaction.options.getString('match_id');
  const discordId = interaction.user.id;
  const player = await getPlayerByDiscordId(discordId);

  if (!player) {
    return interaction.reply({ content: 'Bạn chưa đăng ký giải đấu. Dùng `/register` để xem hướng dẫn.', ephemeral: true });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return interaction.reply({ content: 'Không tìm thấy trận đấu.', ephemeral: true });

  const existing = await prisma.checkIn.findFirst({
    where: { matchId, discordId },
  });

  if (existing) {
    await prisma.checkIn.delete({ where: { id: existing.id } });
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('checkin:updated', { matchId });
    return interaction.reply({ content: `✅ Đã huỷ check-in cho ${match.team1Name} vs ${match.team2Name}`, ephemeral: true });
  }

  await prisma.checkIn.create({
    data: { matchId, discordId, playerName: player.displayName, status: 'confirmed' },
  });

  const { getIO } = require('../utils/socket');
  const io = getIO();
  if (io) io.emit('checkin:updated', { matchId });

  await interaction.reply({
    content: `✅ Check-in thành công cho **${match.team1Name} vs ${match.team2Name}**!`,
    ephemeral: true,
  });
}

async function handleProfile(interaction) {
  let discordId = interaction.options.getString('discord_id') || interaction.user.id;
  const player = await getPlayerByDiscordId(discordId);

  if (!player) {
    return interaction.reply({
      content: discordId === interaction.user.id
        ? 'Bạn chưa đăng ký giải đấu. Dùng `/register` để xem hướng dẫn.'
        : 'Không tìm thấy tuyển thủ với Discord ID này.',
      ephemeral: true,
    });
  }

  const embed = {
    color: 0xff4655,
    title: player.displayName,
    thumbnail: { url: `https://cdn.discordapp.com/avatars/${discordId}/${interaction.user.avatar}.png` },
    fields: [
      { name: 'Riot ID', value: player.riotId, inline: true },
      { name: 'Rank', value: player.rank, inline: true },
      { name: 'Vai trò', value: player.role, inline: true },
      { name: 'Elo', value: `${player.elo}`, inline: true },
      { name: 'W/L', value: `${player.wins}W - ${player.losses}L`, inline: true },
      { name: 'MVP', value: `${player.mvps}`, inline: true },
    ],
    footer: { text: 'Evan Cup' },
    timestamp: new Date().toISOString(),
  };

  await interaction.reply({ embeds: [embed] });
}

async function handleSchedule(interaction) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: today, lt: tomorrow },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (matches.length === 0) {
    return interaction.reply({ content: '📅 Hôm nay không có trận đấu nào.', ephemeral: true });
  }

  const lines = matches.map(m => {
    const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'TBD';
    const status = m.status === 'completed' ? '✅' : '⏳';
    return `${status} **${m.team1Name}** vs **${m.team2Name}** — ${time}`;
  });

  await interaction.reply({ content: `📅 **Lịch thi đấu hôm nay (${today.toLocaleDateString('vi-VN')}):**\n\n${lines.join('\n')}` });
}

async function handleRegister(interaction) {
  const embed = {
    color: 0x00f2fe,
    title: '📝 Đăng ký Evan Cup',
    description: 'Để đăng ký tham gia giải đấu, làm theo các bước sau:',
    fields: [
      { name: 'Bước 1', value: 'Vào tab **Form Đăng Ký** trên website giải đấu.', inline: false },
      { name: 'Bước 2', value: 'Điền thông tin: Discord ID, Riot ID, Rank, Vai trò.', inline: false },
      { name: 'Bước 3', value: 'Chọn hình thức: Solo, Duo hoặc Trio.', inline: false },
      { name: 'Bước 4', value: 'Nhấn **Gửi Đơn** và chờ Admin duyệt.', inline: false },
      { name: 'Link', value: process.env.FRONTEND_URL || 'http://localhost:5000', inline: false },
    ],
    footer: { text: 'Evan Cup • Giới hạn 21 điểm/đội' },
  };

  await interaction.reply({ embeds: [embed] });
}

async function handleStandings(interaction) {
  const players = await prisma.player.findMany({
    where: { teamId: { not: null } },
    orderBy: { elo: 'desc' },
    take: 10,
  });

  if (players.length === 0) {
    return interaction.reply({ content: 'Chưa có dữ liệu bảng xếp hạng.', ephemeral: true });
  }

  const lines = players.map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${p.displayName}** — ${p.elo} Elo (${p.wins}W/${p.losses}L)`;
  });

  await interaction.reply({ content: `🏆 **Bảng Xếp Hạng Elo (Top 10):**\n\n${lines.join('\n')}` });
}

async function handleMyMatches(interaction) {
  const discordId = interaction.user.id;
  const player = await getPlayerByDiscordId(discordId);

  if (!player || !player.teamId) {
    return interaction.reply({ content: 'Bạn chưa có đội hoặc chưa đăng ký.', ephemeral: true });
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ team1Name: player.teamId }, { team2Name: player.teamId }],
      scheduledAt: { gte: new Date() },
      status: { not: 'completed' },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  });

  if (matches.length === 0) {
    return interaction.reply({ content: 'Bạn không có trận đấu sắp tới.', ephemeral: true });
  }

  const lines = matches.map(m => {
    const time = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('vi-VN') : 'TBD';
    return `⚔️ **${m.team1Name}** vs **${m.team2Name}** — ${time}`;
  });

  await interaction.reply({ content: `🔔 **Trận đấu sắp tới của ${player.displayName}:**\n\n${lines.join('\n')}` });
}

async function sendDM(discordId, content) {
  try {
    const user = await client.users.fetch(discordId);
    if (user) await user.send(content);
    return true;
  } catch (e) {
    log.warn('Failed to send DM', { discordId, error: e.message });
    return false;
  }
}

async function sendChannelMessage(channelId, content) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel) await channel.send(content);
  } catch (e) {
    log.warn('Failed to send channel message', { channelId, error: e.message });
  }
}

async function start() {
  if (!TOKEN) {
    log.warn('DISCORD_BOT_TOKEN not set, Discord bot disabled');
    return;
  }

  client.once('ready', () => {
    log.info(`Discord bot logged in as ${client.user.tag}`);
  });

  try {
    await client.login(TOKEN);
    await registerCommands();
  } catch (e) {
    log.error('Discord bot failed to start', { error: e.message });
  }
}

module.exports = { start, sendDM, sendChannelMessage, client };
