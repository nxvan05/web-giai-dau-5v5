const BLOCKED = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'cunt', 'dick', 'porn', 'sex', 'hentai', 'wtf', 'stfu', 'dit', 'du', 'lon', 'buoi', 'cac', 'di', 'cho', 'suc vat', 'loz', 'clgt', 'vkl', 'dkm', 'dmm', 'dm'];

module.exports = function containsProfanity(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '');
  for (const word of BLOCKED) {
    if (lower.includes(word)) return true;
  }
  return false;
};
