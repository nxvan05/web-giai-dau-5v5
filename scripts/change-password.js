const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function changePassword() {
  console.log('\n=== CẬP NHẬT MẬT KHẨU ADMIN ===');
  
  const admin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.log('❌ Lỗi: Không tìm thấy tài khoản admin mặc định!');
    process.exit(1);
  }

  rl.question('Nhập mật khẩu mới cho admin: ', async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Lỗi: Mật khẩu quá ngắn (phải có ít nhất 6 ký tự).');
      process.exit(1);
    }
    
    rl.question('Nhập lại mật khẩu mới: ', async (confirmPassword) => {
      if (newPassword !== confirmPassword) {
        console.log('❌ Lỗi: Mật khẩu nhập lại không khớp!');
        process.exit(1);
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await prisma.admin.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
      });

      console.log('✅ Đổi mật khẩu thành công! Giờ bạn có thể dùng mật khẩu mới để đăng nhập.');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

changePassword().catch(e => {
  console.error(e);
  process.exit(1);
});
