const MAX_STRING_LENGTH = 500;

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>\"']/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, MAX_STRING_LENGTH)
    .trim();
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = { sanitizeBody, sanitizeString };
