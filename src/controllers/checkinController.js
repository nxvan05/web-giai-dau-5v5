const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');

exports.getCheckins = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const checkins = await prisma.checkIn.findMany({
      where: { matchId },
      select: { discordId: true, playerName: true, status: true }
    });
    res.json(checkins);
  } catch (e) {
    next(e);
  }
};

exports.toggleCheckin = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { discordId, playerName } = req.body;
    if (!discordId) return res.status(400).json({ error: 'discordId required' });
    const authedDiscordId = req.user?.discordId || req.discordUser?.discordId;
    if (req.user?.role !== 'admin' && authedDiscordId !== discordId) {
      return res.status(403).json({ error: 'Chỉ được check-in cho chính mình' });
    }

    const player = await prisma.player.findFirst({ where: { discordId } });
    if (!player) return res.status(404).json({ error: 'Không tìm thấy VĐV' });

    const existing = await prisma.checkIn.findFirst({
      where: { matchId, discordId }
    });

    if (existing) {
      await prisma.checkIn.update({
        where: { id: existing.id },
        data: { status: existing.status === 'confirmed' ? 'cancelled' : 'confirmed' }
      });
    } else {
      await prisma.checkIn.create({
        data: { matchId, playerId: player.id, discordId, playerName: playerName || player.displayName }
      });
    }

    const all = await prisma.checkIn.findMany({ where: { matchId } });
    const io = getIO();
    if (io) io.emit('checkin:updated', { matchId, count: all.length, checkins: all });
    res.json({ count: all.length, checkins: all });
  } catch (e) {
    next(e);
  }
};

exports.removeCheckin = async (req, res, next) => {
  try {
    const { matchId, discordId } = req.params;
    await prisma.checkIn.deleteMany({ where: { matchId, discordId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
