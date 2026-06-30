const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'src', 'server.js');
let serverJs = fs.readFileSync(serverJsPath, 'utf8');

const injection = `require('dns').setDefaultResultOrder('ipv4first');\n`;

if (!serverJs.includes('setDefaultResultOrder')) {
    serverJs = injection + serverJs;
    fs.writeFileSync(serverJsPath, serverJs, 'utf8');
    console.log('Injected IPv4 fallback into server.js');
}
