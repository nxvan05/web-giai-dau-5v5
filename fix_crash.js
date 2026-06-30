const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// Find where drawTeam is defined
const drawTeamStart = content.indexOf('const drawTeam = (arr, id, ptsId, stId, num) => {');
const drawTeamEnd = content.indexOf("drawTeam(team2, 'team2-slots', 'team2-total-points', 'team2-status', 2);");

if (drawTeamStart !== -1 && drawTeamEnd !== -1) {
    // Also include the line for drawTeam(team2, ...)
    const endStr = "drawTeam(team2, 'team2-slots', 'team2-total-points', 'team2-status', 2);\n          }";
    
    // We just want to replace the whole block up to the end of the renderAdmin function with just the closing bracket of renderAdmin
    const startStrToReplace = content.substring(drawTeamStart, content.indexOf('}', drawTeamEnd + 100)); // Be careful with bracket matching.
}

// Safer approach: Regex
const newContent = content.replace(/const drawTeam = \([\s\S]*?drawTeam\(team2,[^\n]+\n/m, '');
fs.writeFileSync(appJsPath, newContent, 'utf8');
console.log('Fixed app.js dead code crash');
