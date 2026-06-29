const BLOCKED = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'cunt', 'dick', 'porn', 'sex', 'hentai', 'wtf', 'stfu', 'địt', 'đụ', 'lồn', 'buồi', 'cặc', 'đĩ', 'chó', 'cái l`, 'mẹ m`, 'ngu', 'súc vật', 'loz', 'clgt', 'vkl', 'dkm', 'dmm', 'dm'];

module.exports = function containsProfanity(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const word of BLOCKED) {
    const normalized = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normalized)) return true;
  }
  return false;
};
