const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Fix Logo
content = content.replace('src="image_f5cea1.jpg"', 'src="/logo.png"');

// 2. Fix Fonts
const oldFonts = `    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet">`;

const newFonts = `    <!-- Font self-hosted (không phụ thuộc CDN) -->
    <link rel="stylesheet" href="/fonts/fonts.css" />`;

if (content.includes(oldFonts)) {
    content = content.replace(oldFonts, newFonts);
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Fixed index.html');
