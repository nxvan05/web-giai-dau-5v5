const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Mật khẩu: evankk123
    const hash = await bcrypt.hash('evankk123', 12);
    const admin = await prisma.admin.create({
      data: {
        username: 'evan',
        password: hash
      }
    });
    console.log('✅ Đã tạo Admin thành công!');
    console.log('   Tên đăng nhập: evan');
    console.log('   Mật khẩu: evankk123');
    console.log('   ID:', admin.id);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('❌ Tên đăng nhập "evan" đã tồn tại. Hãy dùng tên khác.');
    } else {
      console.error('❌ Lỗi:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();