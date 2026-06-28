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
