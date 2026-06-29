const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');
const { notifyPlayerRegistered } = require('./webhookController');
const { logAction } = require('../utils/audit');
const containsProfanity = require('../utils/profanity');

exports.getTeams = async (req, res) => {
  const team1 = await prisma.setting.findUnique({ where: { key: 'team1' } });
  const team2 = await prisma.setting.findUnique({ where: { key: 'team2' } });
  res.json({
    team1: team1 ? JSON.parse(team1.value) : [],
    team2: team2 ? JSON.parse(team2.value) : []
  });
};

exports.updateTeams = async (req, res) => {
  const { team1, team2 } = req.body;
  await prisma.setting.upsert({ where: { key: 'team1' }, update: { value: JSON.stringify(team1) }, create: { key: 'team1', value: JSON.stringify(team1) } });
  await prisma.setting.upsert({ where: { key: 'team2' }, update: { value: JSON.stringify(team2) }, create: { key: 'team2', value: JSON.stringify(team2) } });
  res.json({ message: 'Teams updated' });
};

exports.listAll = async (req, res, next) => {
  try {
    let authed = false;
    try {
      const jwt = require('jsonwebtoken');
      const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
      if (token) { jwt.verify(token, process.env.JWT_SECRET); authed = true; }
    } catch (_) {}
    const where = authed ? {} : { status: 'approved' };
    const teams = await prisma.team.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(teams);
  } catch (e) { next(e); }
};

exports.createTeam = async (req, res, next) => {
  try {
    const { name, rosterDiscordIds } = req.body;
    const captainDiscordId = req.discordUser.discordId;
    if (!name || !rosterDiscordIds || rosterDiscordIds.length !== 5) {
      return res.status(400).json({ error: 'Cần tên đội + 5 thành viên' });
    }
    if (containsProfanity(name)) return res.status(400).json({ error: 'Tên đội chứa từ ngữ không phù hợp' });
    const existing = await prisma.team.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Tên đội đã tồn tại' });
    const team = await prisma.team.create({
      data: { name, captainDiscordId, rosterJson: JSON.stringify(rosterDiscordIds), status: 'pending' }
    });
    const io = getIO();
    if (io) io.emit('team:created', { id: team.id, name: team.name });
    res.status(201).json(team);
  } catch (e) { next(e); }
};

exports.approveTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    const roster = JSON.parse(team.rosterJson || '[]');

    await prisma.$transaction(async (tx) => {
      for (const discordId of roster) {
        const player = await tx.player.findFirst({ where: { discordId } });
        if (player) {
          await tx.player.update({ where: { id: player.id }, data: { teamId: team.name } });
        }
      }
      await tx.team.update({ where: { id }, data: { status: 'approved' } });
    });

    const io = getIO();
    if (io) io.emit('team:approved', { id: team.id, name: team.name });
    try { const { createNotification } = require('../routes/notifications'); createNotification('team_approved', `Đội ${team.name} đã được duyệt`, { teamId: id, teamName: team.name }); } catch(e) {}
    res.json({ message: 'Đã duyệt đội ' + team.name });
  } catch (e) { next(e); }
};

exports.rejectTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.team.update({ where: { id }, data: { status: 'rejected' } });
    res.json({ message: 'Đã từ chối' });
  } catch (e) { next(e); }
};

exports.saveKDA = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const {
      team1Kills, team1Deaths, team1Assists,
      team2Kills, team2Deaths, team2Assists,
      team1Players, team2Players,
      team1PlayerStats, team2PlayerStats
    } = req.body;

    const kdaData = { team1Kills, team1Deaths, team1Assists, team2Kills, team2Deaths, team2Assists };
    await prisma.setting.upsert({
      where: { key: 'kda_' + matchId },
      update: { value: JSON.stringify(kdaData) },
      create: { key: 'kda_' + matchId, value: JSON.stringify(kdaData) }
    });

    if (Array.isArray(team1PlayerStats) && team1PlayerStats.length > 0) {
      for (const ps of team1PlayerStats) {
        if (!ps.discordId) continue;
        await prisma.matchPlayerStat.upsert({
          where: { id: `kda_${matchId}_${ps.discordId}` },
          update: { kills: ps.kills || 0, deaths: ps.deaths || 0, assists: ps.assists || 0, teamNumber: 1, playerName: ps.playerName || ps.discordId },
          create: { id: `kda_${matchId}_${ps.discordId}`, matchId, playerDiscordId: ps.discordId, playerName: ps.playerName || ps.discordId, kills: ps.kills || 0, deaths: ps.deaths || 0, assists: ps.assists || 0, teamNumber: 1 }
        });
      }
    } else if (Array.isArray(team1Players) && team1Players.length > 0 && team1Kills !== undefined) {
      const perPlayerKills = Math.round(team1Kills / team1Players.length);
      const perPlayerDeaths = Math.round(team1Deaths / team1Players.length);
      const perPlayerAssists = Math.round(team1Assists / team1Players.length);
      for (const discordId of team1Players) {
        if (!discordId) continue;
        await prisma.matchPlayerStat.upsert({
          where: { id: `kda_${matchId}_${discordId}` },
          update: { kills: perPlayerKills, deaths: perPlayerDeaths, assists: perPlayerAssists, teamNumber: 1 },
          create: { id: `kda_${matchId}_${discordId}`, matchId, playerDiscordId: discordId, playerName: discordId, kills: perPlayerKills, deaths: perPlayerDeaths, assists: perPlayerAssists, teamNumber: 1 }
        });
      }
    }

    if (Array.isArray(team2PlayerStats) && team2PlayerStats.length > 0) {
      for (const ps of team2PlayerStats) {
        if (!ps.discordId) continue;
        await prisma.matchPlayerStat.upsert({
          where: { id: `kda_${matchId}_${ps.discordId}` },
          update: { kills: ps.kills || 0, deaths: ps.deaths || 0, assists: ps.assists || 0, teamNumber: 2, playerName: ps.playerName || ps.discordId },
          create: { id: `kda_${matchId}_${ps.discordId}`, matchId, playerDiscordId: ps.discordId, playerName: ps.playerName || ps.discordId, kills: ps.kills || 0, deaths: ps.deaths || 0, assists: ps.assists || 0, teamNumber: 2 }
        });
      }
    } else if (Array.isArray(team2Players) && team2Players.length > 0 && team2Kills !== undefined) {
      const perPlayerKills = Math.round(team2Kills / team2Players.length);
      const perPlayerDeaths = Math.round(team2Deaths / team2Players.length);
      const perPlayerAssists = Math.round(team2Assists / team2Players.length);
      for (const discordId of team2Players) {
        if (!discordId) continue;
        await prisma.matchPlayerStat.upsert({
          where: { id: `kda_${matchId}_${discordId}` },
          update: { kills: perPlayerKills, deaths: perPlayerDeaths, assists: perPlayerAssists, teamNumber: 2 },
          create: { id: `kda_${matchId}_${discordId}`, matchId, playerDiscordId: discordId, playerName: discordId, kills: perPlayerKills, deaths: perPlayerDeaths, assists: perPlayerAssists, teamNumber: 2 }
        });
      }
    }

    const io = getIO();
    if (io) io.emit('kda:updated', { matchId });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.getKDA = async (req, res, next) => {
  try {
    const entry = await prisma.setting.findUnique({ where: { key: 'kda_' + req.params.matchId } });
    res.json(entry ? JSON.parse(entry.value) : null);
  } catch (e) { next(e); }
};
