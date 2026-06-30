const fs = require('fs');
const path = require('path');

const dcPath = path.join(__dirname, 'src', 'controllers', 'discordController.js');
let dc = fs.readFileSync(dcPath, 'utf8');

// Replace the token parsing to be safer
const tokenParseRegex = /const tokenData = await tokenResp\.json\(\);/;
const newTokenParse = `
      let tokenData;
      const tokenText = await tokenResp.text();
      try {
          tokenData = JSON.parse(tokenText);
      } catch (e) {
          console.error('Discord Token Error Response:', tokenText);
          return res.redirect(FRONTEND_URL + '?discord=denied');
      }
`;
dc = dc.replace(tokenParseRegex, newTokenParse);

// Replace the user parsing to be safer
const userParseRegex = /const discordUser = await userResp\.json\(\);/;
const newUserParse = `
      let discordUser;
      const userText = await userResp.text();
      try {
          discordUser = JSON.parse(userText);
      } catch (e) {
          console.error('Discord User Error Response:', userText);
          return res.redirect(FRONTEND_URL + '?discord=denied');
      }
`;
dc = dc.replace(userParseRegex, newUserParse);

fs.writeFileSync(dcPath, dc, 'utf8');
console.log('Fixed discordController.js');
