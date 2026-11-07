import config from '../config.js';
import sections from './sections.js';
import { uniqueCommands } from './loader.js';
import { fmtDur } from './utils.js';

const startedAt = Date.now();

export function mainMenu(pushName = 'صديقي') {
  const all = uniqueCommands();
  const date = new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  let t = `╭──────────────╮\n`;
  t += `┃ 🔮 البوت ⟵ *${config.botName}* ❄️\n`;
  t += `┃ 🍃 اهلا ⟵ ${pushName}\n`;
  t += `┃ 🎯 عدد الاوامر ⟵ ${all.length}\n`;
  t += `┃ 🎗️ حالة البوت ⟵ مستقر 🟢\n`;
  t += `┃ 👨‍💻 المطور ⟵ ${config.developer}\n`;
  t += `┃ 🚀 التشغيل ⟵ ${fmtDur(Date.now() - startedAt)}\n`;
  t += `┃ 📅 التاريخ ⟵ ${date}\n`;
  t += `╰──────────────╯\n\n`;
  t += `📁 *الاقسام:*\n`;
  sections.forEach((s, i) => {
    const n = all.filter(c => c.section === s.key).length;
    t += `*${i + 1}.* ${s.emoji} ${s.name} • ${n} أمر\n`;
  });
  t += `\nاكتب: *${config.prefix}اوامر <رقم القسم>*\nمثال: ${config.prefix}اوامر 2\n\n_BY ┊ ${config.developer}_`;
  return t;
}

export function sectionMenu(num) {
  const s = sections[num - 1];
  if (!s) return `❌ رقم القسم غير صحيح. اكتب ${config.prefix}اوامر لعرض الأقسام.`;
  const list = uniqueCommands().filter(c => c.section === s.key);
  let t = `${s.emoji} *${s.name}* • ${list.length} أمر\n_${s.desc}_\n\n`;
  t += list.length
    ? list.map(c => `${c.owner ? '👑' : c.admin ? '🛡️' : '▫️'} ${config.prefix}${c.name} — ${c.desc || ''}`).join('\n')
    : 'لسه مفيش أوامر في القسم ده.';
  t += `\n\n👑 للمطور • 🛡️ للأدمن`;
  return t;
}
