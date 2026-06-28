const log = require('../utils/logger');
const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');
const { getIO } = require('../utils/socket');
const { notifyPlayerRegistered } = require('./webhookController');
const { logAction } = require('../utils/audit');

exports.getAll = async (req, res) => {
  const players = await prisma.player.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(players);
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  // admin auth: use body.discordId; discord auth: use JWT
  const discordId = req.discordUser ? req.discordUser.discordId : req.body.discordId;
  const { displayName, riotId, rank, role, type, pts } = req.body;

  if (!discordId) return res.status(400).json({ error: 'Thiếu Discord ID' });

  const existing = await prisma.player.findFirst({ where: { discordId } });
  if (existing) return res.status(409).json({ error: 'Discord ID này đã đăng ký rồi' });

  const data = {
    displayName, discordId, riotId, rank, role, type, pts: parseInt(pts) || 0
  };

  const player = await prisma.player.create({ data });
  notifyPlayerRegistered(player).catch(err => log.error('Caught error', { error: err.message }));
  logAction('player.create', displayName).catch(err => log.error('Caught error', { error: err.message }));
  const io = getIO();
  if (io) io.emit('player:created', player);
  res.status(201).json(player);
};

exports.updatePartial = async (req, res) => {
  const { id } = req.params;
  const allowed = ['displayName','discordId','riotId','rank','role','type','pts','teamId','elo','wins','losses','mvps'];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (['pts','elo','wins','losses','mvps'].includes(key)) data[key] = parseInt(req.body[key]);
      else data[key] = req.body[key];
    }
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });
  const player = await prisma.player.update({ where: { id }, data });
  res.json(player);
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { id } = req.params;
  const { displayName, discordId, riotId, rank, role, type, pts, teamId } = req.body;
  const data = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (discordId !== undefined) data.discordId = discordId;
  if (riotId !== undefined) data.riotId = riotId;
  if (rank !== undefined) data.rank = rank;
  if (role !== undefined) data.role = role;
  if (type !== undefined) data.type = type;
  if (pts !== undefined) data.pts = parseInt(pts);
  if (teamId !== undefined) data.teamId = teamId;
  const player = await prisma.player.update({ where: { id }, data });
  res.json(player);
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.player.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Player not found' });
    throw e;
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const player = await prisma.player.findFirst({ where: { discordId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ team1Name: player.teamId || '' }, { team2Name: player.teamId || '' }]
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const matchHistory = matches.map(m => ({
      id: m.id, team1Name: m.team1Name, team2Name: m.team2Name,
      score1: m.score1, score2: m.score2, winner: m.winner,
      map: m.map, status: m.status, scheduledAt: m.scheduledAt,
      isTeam1: m.team1Name === player.teamId,
      result: m.winner ? (m.winner === player.teamId ? 'win' : 'loss') : 'pending'
    }));

    const stats = await prisma.matchPlayerStat.aggregate({
      where: { playerDiscordId: discordId },
      _sum: { kills: true, deaths: true, assists: true }
    });

    const eloHistory = await prisma.eloHistory.findMany({
      where: { playerDiscordId: discordId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ player, matchHistory, eloHistory, kda: { kills: stats._sum.kills || 0, deaths: stats._sum.deaths || 0, assists: stats._sum.assists || 0 } });
  } catch (e) { next(e); }
};