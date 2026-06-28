const log = require('../utils/logger');
const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');
const { logAction } = require('../utils/audit');

exports.getCurrentStream = async (req, res) => {
  const session = await prisma.streamSession.findFirst({
    where: { status: 'live' },
    orderBy: { startedAt: 'desc' }
  });
  if (!session) {
    return res.json({ live: false, match: null, casters: [], session: null });
  }
  const match = await prisma.match.findUnique({ where: { id: session.matchId } });
  const casters = JSON.parse(session.casters || '[]');
  res.json({ live: true, match, casters, session });
};

exports.setCurrentStream = async (req, res) => {
  const { matchId } = req.body;
  if (!matchId) return res.status(400).json({ error: 'matchId is required' });
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  await prisma.streamSession.updateMany({
    where: { status: 'live' },
    data: { status: 'ended', endedAt: new Date() }
  });
  const session = await prisma.streamSession.create({
    data: { matchId, status: 'live' }
  });
  logAction('stream.start', `${match.team1Name} vs ${match.team2Name}`).catch(err => log.error('Caught error', { error: err.message }));
  const io = getIO();
  if (io) io.emit('stream:started', { session, match, casters: [] });
  res.status(201).json({ session, match, casters: [] });
};

exports.stopStream = async (req, res) => {
  const { id } = req.params;
  await prisma.streamSession.update({
    where: { id },
    data: { status: 'ended', endedAt: new Date() }
  });
  logAction('stream.stop', `Session ${id}`).catch(err => log.error('Caught error', { error: err.message }));
  const io = getIO();
  if (io) io.emit('stream:stopped', { sessionId: id });
  res.json({ message: 'Stream ended' });
};

exports.updateStreamScore = async (req, res) => {
  const { matchId, score1, score2 } = req.body;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      score1: score1 ?? match.score1,
      score2: score2 ?? match.score2
    }
  });
  const io = getIO();
  if (io) io.emit('stream:score', { matchId, score1: updated.score1, score2: updated.score2 });
  res.json(updated);
};

exports.addCaster = async (req, res) => {
  const { name, discordId, role, avatarUrl } = req.body;
  if (!name) return res.status(400).json({ error: 'Caster name is required' });
  const caster = await prisma.caster.create({
    data: { name, discordId, role: role || 'caster', avatarUrl }
  });
  const io = getIO();
  if (io) io.emit('caster:added', caster);
  res.status(201).json(caster);
};

exports.removeCaster = async (req, res) => {
  const { id } = req.params;
  await prisma.caster.delete({ where: { id } });
  const io = getIO();
  if (io) io.emit('caster:removed', { id });
  res.status(204).send();
};

exports.getAllCasters = async (req, res) => {
  const casters = await prisma.caster.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(casters);
};

exports.assignCasterToStream = async (req, res) => {
  const { sessionId, casterId } = req.body;
  const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const casters = JSON.parse(session.casters || '[]');
  if (!casters.includes(casterId)) {
    casters.push(casterId);
  }
  const updated = await prisma.streamSession.update({
    where: { id: sessionId },
    data: { casters: JSON.stringify(casters) }
  });
  const io = getIO();
  if (io) io.emit('stream:casters', { sessionId, casters });
  res.json(updated);
};

exports.removeCasterFromStream = async (req, res) => {
  const { sessionId, casterId } = req.body;
  const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const casters = JSON.parse(session.casters || '[]').filter(id => id !== casterId);
  const updated = await prisma.streamSession.update({
    where: { id: sessionId },
    data: { casters: JSON.stringify(casters) }
  });
  const io = getIO();
  if (io) io.emit('stream:casters', { sessionId, casters });
  res.json(updated);
};

exports.getCasterById = async (req, res) => {
  const { id } = req.params;
  const caster = await prisma.caster.findUnique({ where: { id } });
  if (!caster) return res.status(404).json({ error: 'Caster not found' });
  res.json(caster);
};

exports.getStreamArchive = async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      where: { streamUrl: { not: null }, status: 'completed' },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
    res.json(matches.filter(m => m.streamUrl));
  } catch (e) { next(e); }
};
