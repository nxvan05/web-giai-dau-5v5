const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function setupSecrets() {
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    console.log('.env file not found, creating a new one...');
  }

  // Generate strong JWT secret
  const newJwtSecret = crypto.randomBytes(64).toString('hex');
  const newApiToken = crypto.randomBytes(32).toString('hex');

  let updated = false;

  // Replace or add JWT_SECRET
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${newJwtSecret}`);
    updated = true;
  } else {
    envContent += `\nJWT_SECRET=${newJwtSecret}`;
    updated = true;
  }

  // Output new Admin API Token for user
  console.log('\n=============================================');
  console.log('✅ BẢO MẬT ĐÃ ĐƯỢC THIẾT LẬP!');
  console.log('=============================================');
  console.log('Bạn vừa tạo một JWT_SECRET siêu mạnh (512-bit) để mã hoá phiên đăng nhập.');
  
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  console.log('Đã cập nhật file .env thành công!\n');

  console.log('⚠️ BƯỚC TIẾP THEO BẠN CẦN LÀM:');
  console.log('1. Mở file .env');
  console.log('2. Cập nhật DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, và DISCORD_BOT_TOKEN.');
  console.log('3. Khởi động lại Server (npm run dev)');
  console.log('=============================================\n');
}

setupSecrets();
