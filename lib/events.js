import { group } from './db.js';
import { numOf } from './utils.js';
import { clearMeta } from '../handler.js';

const fill = (tpl, { user, subject, count }) =>
  tpl.replaceAll('{user}', '@' + numOf(user)).replaceAll('{group}', subject).replaceAll('{count}', count);

export async function onParticipants(sock, id, participants, action) {
  clearMeta(id);
  const g = group(id);
  let meta;
  try { meta = await sock.groupMetadata(id); } catch { return; }
  const list = participants.map(p => (typeof p === 'string' ? p : p.phoneNumber || p.id));

  for (const p of list) {
    if (action === 'add') {
      if (g.banned.includes(numOf(p))) {
        await sock.groupParticipantsUpdate(id, [p], 'remove').catch(() => {});
        await sock.sendMessage(id, { text: `🚫 @${numOf(p)} محظور من الجروب وتم طرده.`, mentions: [p] });
        continue;
      }
      if (g.welcome) {
        const tpl = g.welcomeMsg || '👋 أهلا بيك يا {user} في *{group}* 🌹\nأنت العضو رقم {count}';
        await sock.sendMessage(id, { text: fill(tpl, { user: p, subject: meta.subject, count: meta.participants.length }), mentions: [p] });
      }
    }
    if (action === 'remove' && g.bye) {
      const tpl = g.byeMsg || '👋 {user} غادر *{group}*. مع السلامة!';
      await sock.sendMessage(id, { text: fill(tpl, { user: p, subject: meta.subject, count: meta.participants.length }), mentions: [p] });
    }
  }
}
