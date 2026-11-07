import pino from 'pino';
import config from './config.js';
import { commands } from './lib/loader.js';
import { mainMenu, sectionMenu } from './lib/menu.js';
import { db, user, group, save } from './lib/db.js';
import { numOf, ids, randInt } from './lib/utils.js';
import { downloadMediaMessage } from './lib/baileys.js';
import { recordError } from './lib/diagnostics.js';

const logger = pino({ level: 'silent' });
const metaCache = new Map();

export async function getMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.t < 30000) return c.meta;
  const meta = await sock.groupMetadata(jid);
  metaCache.set(jid, { t: Date.now(), meta });
  return meta;
}
export const clearMeta = jid => metaCache.delete(jid);

function unwrap(msg) {
  let x = msg;
  for (let i = 0; i < 4; i++) {
    const inner = x?.ephemeralMessage?.message || x?.viewOnceMessage?.message ||
      x?.viewOnceMessageV2?.message || x?.documentWithCaptionMessage?.message;
    if (!inner) break;
    x = inner;
  }
  return x;
}

const getCI = msg => {
  const k = Object.keys(msg || {}).find(t => msg[t]?.contextInfo);
  return k ? msg[k].contextInfo : null;
};

const textOf = msg =>
  msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption ||
  msg?.videoMessage?.caption || msg?.documentMessage?.caption || '';

const LINK_RE = /(https?:\/\/|chat\.whatsapp\.com|wa\.me\/)\S+/i;

export async function handle(sock, m) {
  if (!m.message || m.key.fromMe) return;
  const jid = m.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;
  m.message = unwrap(m.message);

  const isGroup = jid.endsWith('@g.us');
  const raw = (isGroup ? [m.key.participant, m.key.participantAlt] : [jid, m.key.remoteJidAlt]).filter(Boolean);
  let sender = raw.find(s => s.endsWith('@s.whatsapp.net')) || raw[0];
  const sn = raw.map(numOf);

  let meta = null, isAdmin = false, isBotAdmin = false;
  const pid = j => meta?.participants.find(p => ids(p).map(numOf).includes(numOf(j)))?.id || j;
  const partOf = j => meta?.participants.find(p => ids(p).map(numOf).includes(numOf(j))) || null;
  const canon = j => {
    const p = partOf(j);
    return p ? (p.phoneNumber || p.jid || (p.id.endsWith('@s.whatsapp.net') ? p.id : j)) : j;
  };

  if (isGroup) {
    try { meta = await getMeta(sock, jid); } catch { return; }
    const sp = partOf(sender) || meta.participants.find(p => ids(p).map(numOf).some(n => sn.includes(n)));
    if (sp) { isAdmin = !!sp.admin; sender = canon(sp.id); sn.push(numOf(sender)); }
    const me = [sock.user?.id, sock.user?.lid].filter(Boolean).map(numOf);
    isBotAdmin = !!meta.participants.find(p => ids(p).map(numOf).some(n => me.includes(n)))?.admin;
  }

  const isOwner = sn.some(n => config.owners.includes(n));
  if (!isOwner && db.settings.banned.includes(numOf(sender))) return;
  if (!isOwner && db.settings.mode === 'private') return;

  const text = textOf(m.message).trim();
  const ci = getCI(m.message);
  const mentioned = (ci?.mentionedJid || []).map(canon);
  const u = user(sender);
  const g = isGroup ? group(jid) : null;

  const reply = (t, mentions) =>
    sock.sendMessage(jid, mentions ? { text: t, mentions } : { text: t }, { quoted: m });
  const send = content => sock.sendMessage(jid, content, { quoted: m });
  const react = emoji => sock.sendMessage(jid, { react: { text: emoji, key: m.key } }).catch(() => {});

  // ===== حماية المجموعات (قبل الأوامر) =====
  if (isGroup && !isAdmin && !isOwner) {
    if (g.muted.includes(numOf(sender))) {
      if (isBotAdmin) await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
      return;
    }
    if (g.antilink && LINK_RE.test(text)) {
      if (isBotAdmin) {
        await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
        await reply(`🚫 ممنوع الروابط هنا يا @${numOf(sender)}`, [sender]);
      }
      return;
    }
    if (g.badwords.length && g.badwords.some(w => text.includes(w))) {
      if (isBotAdmin) {
        await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
        await reply(`🚫 كلمة ممنوعة يا @${numOf(sender)}`, [sender]);
      }
      return;
    }
  }

  // ===== الغياب (AFK) =====
  if (u.afk && !(text.startsWith(config.prefix + 'غياب'))) {
    u.afk = null; save();
    reply(`👋 رجعت يا @${numOf(sender)}، تم إلغاء الغياب.`, [sender]);
  }
  for (const j of mentioned) {
    const t = db.users[numOf(j)];
    if (t?.afk) reply(`💤 @${numOf(j)} غايب\n📝 ${t.afk.reason}\n⏱️ من ${Math.round((Date.now() - t.afk.since) / 60000)} دقيقة`, [j]);
  }

  // ===== نقاط الخبرة =====
  u.msgs++;
  if (Date.now() - (u.lastXp || 0) > 15000) {
    u.lastXp = Date.now();
    u.xp += randInt(2, 6);
    const lv = Math.floor(Math.sqrt(u.xp / 40)) + 1;
    if (lv > u.level) {
      u.level = lv;
      if (isGroup) reply(`🎉 مبروك @${numOf(sender)} وصلت للمستوى *${lv}*`, [sender]);
    }
  }
  save();

  // ===== الأوامر =====
  if (!text.startsWith(config.prefix)) return;
  if (db.settings.maintenance && !isOwner) {
    return reply('🛠️ البوت تحت الصيانة والتحديث حاليًا. حاول مرة أخرى لاحقًا.');
  }
  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const name = (args.shift() || '').toLowerCase();
  if (!name) return;

  if (['اوامر', 'الاوامر', 'menu', 'help', 'قائمة', 'القائمة'].includes(name)) {
    return reply(args[0] ? sectionMenu(parseInt(args[0])) : mainMenu(m.pushName));
  }

  const cmd = commands.get(name);
  if (!cmd) return;

  if (cmd.owner && !isOwner) return reply('⛔ الأمر ده للمطور فقط.');
  if (cmd.group && !isGroup) return reply('⛔ الأمر ده للمجموعات فقط.');
  if (cmd.admin && !(isAdmin || isOwner)) return reply('⛔ الأمر ده للأدمن فقط.');
  if (cmd.botAdmin && !isBotAdmin) return reply('⚠️ لازم تخليني أدمن في الجروب الأول.');
  if (cmd.section === 'games' && isGroup && g.games === false) return reply('🎮 الألعاب متوقفة في الجروب ده.');

  // الهدف: منشن أو رد أو رقم
  let tRaw = mentioned[0] || (ci?.participant ? canon(ci.participant) : null);
  const a0 = (args[0] || '').replace(/[\s+]/g, '');
  const numArg = /^\d{7,15}$/.test(a0);
  if (!tRaw && numArg) tRaw = a0 + '@s.whatsapp.net';
  const target = tRaw || null;
  const rest = (args[0]?.startsWith('@') || (numArg && target)) ? args.slice(1) : args;

  const quotedMsg = ci?.quotedMessage ? unwrap(ci.quotedMessage) : null;
  const quoted = quotedMsg ? { id: ci.stanzaId, participant: ci.participant, message: quotedMsg } : null;
  const quotedText = quotedMsg ? textOf(quotedMsg) : '';

  const getMedia = async (types = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage']) => {
    let src = m, node = types.find(t => m.message[t]);
    if (!node && quotedMsg) {
      node = types.find(t => quotedMsg[t]);
      if (node) src = { key: { remoteJid: jid, id: ci.stanzaId, participant: ci.participant }, message: quotedMsg };
    }
    if (!node) return null;
    const buffer = await downloadMediaMessage(src, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
    return { buffer, type: node, mime: src.message[node].mimetype || '' };
  };

  const c = {
    sock, m, cmd, jid, sender, isGroup, isAdmin, isBotAdmin, isOwner, meta,
    args, text: args.join(' '), rest, restText: rest.join(' '),
    target, mentioned, quoted, quotedText, pushName: m.pushName || 'عضو',
    reply, send, react, getMedia, pid, partOf, u, g, prefix: config.prefix,
    senderIds: [...new Set(sn)],
  };

  try {
    await cmd.run(c);
  } catch (e) {
    recordError(e, `الأمر ${name}`);
    reply('⚠️ حصل خطأ أثناء تنفيذ الأمر. تم تسجيله للمطور.');
  }
}
