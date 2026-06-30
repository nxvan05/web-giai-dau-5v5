const prisma = require('../utils/prisma');

exports.getAll = async (req, res) => {
  const settings = await prisma.setting.findMany();
  res.json(settings);
};

exports.getSetting = async (req, res) => {
  const { key } = req.params;
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return res.status(404).json({ error: 'Setting not found' });
  res.json({ key: setting.key, value: setting.value });
};

exports.updateSetting = async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'Value is required' });
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) }
  });
  res.json({ key: setting.key, value: setting.value });
};

exports.resetTournament = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền reset giải đấu' });
    }
    
    // Clear tournament state
    await prisma.checkIn.deleteMany();
    await prisma.matchPlayerStat.deleteMany();
    await prisma.scoreReport.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.streamSession.deleteMany();
    await prisma.match.deleteMany();
    
    // Clear specific settings
    await prisma.setting.deleteMany({
      where: {
        OR: [
          { key: 'bracket' },
          { key: { startsWith: 'veto_' } }
        ]
      }
    });
    
    const { getIO } = require('../utils/socket');
    const io = getIO();
    if (io) io.emit('tournament:reset');
    
    res.json({ message: 'Giải đấu đã được reset thành công' });
  } catch (e) {
    next(e);
  }
};
