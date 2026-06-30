const BLOCKED = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'cunt', 'dick', 'porn', 'sex', 'hentai', 'wtf', 'stfu', 'dit', 'du', 'lon', 'buoi', 'cac', 'di', 'cho', 'suc vat', 'loz', 'clgt', 'vkl', 'dkm', 'dmm', 'dm'];

// Pre-compile regex patterns with word boundaries for performance
const BLOCKED_PATTERNS = BLOCKED.map(word => new RegExp('(?:^|\\s|[^a-z0-9])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|\\s|[^a-z0-9])', 'i'));

module.exports = function containsProfanity(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(' ' + lower + ' ')) return true;
  }
  return false;
};
