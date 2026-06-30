const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.admin.findFirst();
  if (admin) {
    console.log('Admin username in DB:', admin.username);
    const isValid = await bcrypt.compare('evankk123', admin.password);
    console.log('Is evankk123 valid for this user?', isValid);
    
    if (!isValid) {
      console.log('Resetting password to evankk123...');
      const hash = await bcrypt.hash('evankk123', 12);
      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: hash }
      });
      console.log('Password successfully reset to evankk123.');
    }
  } else {
    console.log('NO ADMIN FOUND IN DB! Creating one...');
    const hash = await bcrypt.hash('evankk123', 12);
    await prisma.admin.create({ data: { username: 'evan', password: hash } });
    console.log('Admin account created with username: evan, pass: evankk123');
  }
}

checkAdmin().catch(console.error).finally(() => prisma.$disconnect());
