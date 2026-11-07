import fs from 'fs';
import { numOf } from './utils.js';

export const dbFile = new URL('../database/db.json', import.meta.url);
export const db = { users: {}, groups: {}, settings: {} };
try { Object.assign(db, JSON.parse(fs.readFileSync(dbFile, 'utf8'))); } catch {}
db.users ??= {}; db.groups ??= {}; db.settings ??= {};
db.settings.banned ??= []; db.settings.mode ??= 'public';
db.settings.maintenance ??= false;
db.scheduledMessages ??= [];

let timer;
export const saveNow = () => {
  try {
    fs.mkdirSync(new URL('../database/', import.meta.url), { recursive: true });
    fs.writeFileSync(dbFile, JSON.stringify(db));
  } catch (e) { console.error('db save:', e.message); }
};
export const save = () => { clearTimeout(timer); timer = setTimeout(saveNow, 1000); };
process.on('exit', saveNow);
process.on('SIGINT', () => { saveNow(); process.exit(0); });

export function user(jid) {
  const u = (db.users[numOf(jid)] ??= {});
  u.money ??= 100; u.bank ??= 0; u.xp ??= 0; u.level ??= 1; u.msgs ??= 0;
  u.bio ??= ''; u.nick ??= ''; u.inv ??= {}; u.cd ??= {};
  u.afk ??= null; u.married ??= null; u.birthday ??= null;
  return u;
}

export function group(jid) {
  const g = (db.groups[jid] ??= {});
  g.welcome ??= false; g.bye ??= false; g.welcomeMsg ??= ''; g.byeMsg ??= '';
  g.antilink ??= false; g.rules ??= ''; g.badwords ??= []; g.games ??= true;
  g.muted ??= []; g.banned ??= []; g.warns ??= {};
  g.notes ??= []; g.broadcastEnabled ??= false;
  return g;
}

// يرجّع الوقت المتبقي (ms) لو لسه في انتظار، أو 0 ويبدأ العد من جديد
export function cooldown(u, key, ms) {
  const left = (u.cd[key] || 0) + ms - Date.now();
  if (left > 0) return left;
  u.cd[key] = Date.now();
  return 0;
}
