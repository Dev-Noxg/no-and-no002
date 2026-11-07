const MAX_LOGS = 200;
const logs = [];
const errors = [];

function clean(value) {
  return String(value ?? '')
    .replace(/gsk_[A-Za-z0-9_-]{12,}/g, '[مخفي]')
    .replace(/(Bearer\s+)[^\s"'`]+/gi, '$1[مخفي]')
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, '$1[مخفي]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

function append(list, entry) {
  list.push(entry);
  if (list.length > MAX_LOGS) list.shift();
}

export function recordLog(level, message) {
  const entry = `${new Date().toLocaleString('ar-EG')} [${level}] ${clean(message)}`;
  append(logs, entry);
  if (level === 'ERROR') append(errors, entry);
  if (level === 'ERROR') console.error(entry);
}

export function recordError(error, context = '') {
  const detail = error instanceof Error ? error.message : String(error);
  recordLog('ERROR', `${context ? `${context}: ` : ''}${detail}`);
}

export const recentLogs = (limit = 20) => logs.slice(-limit);
export const recentErrors = (limit = 20) => errors.slice(-limit);
