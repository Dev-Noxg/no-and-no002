import { save } from '../../lib/db.js';
import { numOf } from '../../lib/utils.js';

const NEED = '↩️ منشن العضو أو رد على رسالته.';

export default [
  { name: 'طرد', aliases: ['kick'], desc: 'طرد عضو (منشن/رد)', botAdmin: true,
    async run({ sock, jid, target, partOf, reply }) {
      if (!target) return reply(NEED);
      const p = partOf(target);
      if (!p) return reply('❌ العضو مش في الجروب.');
      if (p.admin) return reply('⛔ مينفعش أطرد أدمن. نزّله الأول.');
      await sock.groupParticipantsUpdate(jid, [p.id], 'remove');
      reply(`👢 تم طرد @${numOf(target)}`, [target]);
    } },

  { name: 'حظر', aliases: ['ban'], desc: 'طرد وحظر عضو من الرجوع للجروب', botAdmin: true,
    async run({ sock, jid, target, partOf, g, reply }) {
      if (!target) return reply(NEED);
      const p = partOf(target);
      if (p?.admin) return reply('⛔ مينفعش أحظر أدمن.');
      const k = numOf(target);
      if (!g.banned.includes(k)) g.banned.push(k);
      save();
      if (p) await sock.groupParticipantsUpdate(jid, [p.id], 'remove');
      reply(`🚫 تم حظر @${k} من الجروب.`, [target]);
    } },

  { name: 'الغاء_حظر', aliases: ['unban'], desc: 'الغاء حظر عضو (منشن/رقم)',
    async run({ target, g, reply }) {
      if (!target) return reply('اكتب رقم العضو أو منشنه.');
      g.banned = g.banned.filter(n => n !== numOf(target)); save();
      reply(`✅ تم إلغاء حظر ${numOf(target)}`);
    } },

  { name: 'اضافة', aliases: ['add'], desc: 'اضافة رقم للجروب', botAdmin: true,
    async run({ sock, jid, target, reply }) {
      if (!target) return reply('اكتب الرقم بالصيغة الدولية.\nمثال: /اضافة 201012345678');
      const res = await sock.groupParticipantsUpdate(jid, [numOf(target) + '@s.whatsapp.net'], 'add');
      const st = res?.[0]?.status;
      if (st === '200') reply('✅ تمت الإضافة.');
      else if (st === '403') reply('⚠️ الرقم ده خصوصيته بتمنع الإضافة المباشرة. ابعتله رابط الجروب.');
      else if (st === '409') reply('ℹ️ العضو موجود في الجروب بالفعل.');
      else reply(`❌ مقدرتش أضيفه (كود ${st || 'غير معروف'}).`);
    } },

  { name: 'رفع', aliases: ['promote'], desc: 'ترقية عضو لأدمن', botAdmin: true,
    async run({ sock, jid, target, partOf, reply }) {
      if (!target) return reply(NEED);
      const p = partOf(target);
      if (!p) return reply('❌ العضو مش في الجروب.');
      if (p.admin) return reply('ℹ️ هو أدمن بالفعل.');
      await sock.groupParticipantsUpdate(jid, [p.id], 'promote');
      reply(`⬆️ تم رفع @${numOf(target)} أدمن.`, [target]);
    } },

  { name: 'تنزيل', aliases: ['demote'], desc: 'تنزيل أدمن لعضو', botAdmin: true,
    async run({ sock, jid, target, partOf, reply }) {
      if (!target) return reply(NEED);
      const p = partOf(target);
      if (!p?.admin) return reply('ℹ️ هو مش أدمن أصلًا.');
      await sock.groupParticipantsUpdate(jid, [p.id], 'demote');
      reply(`⬇️ تم تنزيل @${numOf(target)} لعضو عادي.`, [target]);
    } },

  { name: 'قفل', aliases: ['lock', 'close'], desc: 'قفل الجروب (الأدمن فقط يكتبوا)', botAdmin: true,
    async run({ sock, jid, reply }) { await sock.groupSettingUpdate(jid, 'announcement'); reply('🔒 تم قفل الجروب.'); } },

  { name: 'فتح', aliases: ['unlock', 'open'], desc: 'فتح الجروب للجميع', botAdmin: true,
    async run({ sock, jid, reply }) { await sock.groupSettingUpdate(jid, 'not_announcement'); reply('🔓 تم فتح الجروب.'); } },

  { name: 'تحذير', aliases: ['warn'], desc: 'تحذير عضو (3 تحذيرات = طرد)',
    async run({ sock, jid, target, partOf, g, restText, reply, isBotAdmin }) {
      if (!target) return reply(NEED);
      const p = partOf(target);
      if (p?.admin) return reply('⛔ مينفعش أحذّر أدمن.');
      const k = numOf(target);
      g.warns[k] = (g.warns[k] || 0) + 1;
      const n = g.warns[k];
      let msg = `⚠️ تحذير @${k} (${n}/3)${restText ? '\n📝 السبب: ' + restText : ''}`;
      if (n >= 3) {
        if (isBotAdmin && p) {
          await sock.groupParticipantsUpdate(jid, [p.id], 'remove');
          delete g.warns[k];
          msg += '\n🚫 وصل 3 تحذيرات وتم طرده.';
        } else msg += '\n🚫 وصل 3 تحذيرات (لازم أكون أدمن عشان أطرده).';
      }
      save();
      reply(msg, [target]);
    } },

  { name: 'حذف_تحذير', aliases: ['unwarn'], desc: 'ازالة تحذير (او الكل)',
    async run({ target, g, restText, reply }) {
      if (!target) return reply(NEED);
      const k = numOf(target);
      if (restText === 'الكل') delete g.warns[k];
      else g.warns[k] = Math.max(0, (g.warns[k] || 0) - 1);
      save();
      reply(`✅ تحذيرات @${k} الآن: ${g.warns[k] || 0}`, [target]);
    } },

  { name: 'التحذيرات', aliases: ['warns'], desc: 'عرض تحذيرات عضو أو الكل',
    async run({ target, g, reply }) {
      if (target) return reply(`⚠️ تحذيرات @${numOf(target)}: ${g.warns[numOf(target)] || 0}/3`, [target]);
      const e = Object.entries(g.warns).filter(([, n]) => n > 0);
      if (!e.length) return reply('✅ مفيش تحذيرات في الجروب.');
      reply('⚠️ *التحذيرات:*\n' + e.map(([k, n]) => `▫️ @${k}: ${n}/3`).join('\n'), e.map(([k]) => k + '@s.whatsapp.net'));
    } },

  { name: 'كتم', aliases: ['mute'], desc: 'كتم عضو (تتحذف رسائله)', botAdmin: true,
    async run({ target, partOf, g, reply }) {
      if (!target) return reply(NEED);
      if (partOf(target)?.admin) return reply('⛔ مينفعش أكتم أدمن.');
      const k = numOf(target);
      if (!g.muted.includes(k)) g.muted.push(k);
      save();
      reply(`🔇 تم كتم @${k}`, [target]);
    } },

  { name: 'الغاء_كتم', aliases: ['unmute'], desc: 'الغاء كتم عضو',
    async run({ target, g, reply }) {
      if (!target) return reply(NEED);
      g.muted = g.muted.filter(n => n !== numOf(target)); save();
      reply(`🔊 تم إلغاء كتم @${numOf(target)}`, [target]);
    } },

  { name: 'المكتومين', aliases: ['mutedlist'], desc: 'قائمة المكتومين',
    async run({ g, reply }) {
      if (!g.muted.length) return reply('✅ مفيش حد مكتوم.');
      reply('🔇 *المكتومين:*\n' + g.muted.map(k => `▫️ @${k}`).join('\n'), g.muted.map(k => k + '@s.whatsapp.net'));
    } },

  { name: 'حذف', aliases: ['delete', 'del'], desc: 'حذف رسالة (بالرد عليها)', botAdmin: true,
    async run({ sock, jid, quoted, reply }) {
      if (!quoted) return reply('↩️ ارد على الرسالة اللي عاوز تمسحها.');
      await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: quoted.id, participant: quoted.participant } });
    } },

  { name: 'منشن_الكل', aliases: ['tagall'], desc: 'منشن كل الأعضاء',
    async run({ meta, text, reply }) {
      const ps = meta.participants.map(p => p.id);
      reply(`📢 *${text || 'نداء للجميع'}*\n\n` + ps.map(i => `▫️ @${numOf(i)}`).join('\n'), ps);
    } },

  { name: 'اخفاء', aliases: ['hidetag'], desc: 'منشن مخفي لكل الأعضاء',
    async run({ sock, jid, meta, text, quotedText }) {
      await sock.sendMessage(jid, { text: text || quotedText || '📢', mentions: meta.participants.map(p => p.id) });
    } },

  { name: 'تغيير_اسم', aliases: ['setname'], desc: 'تغيير اسم الجروب', botAdmin: true,
    async run({ sock, jid, text, reply }) {
      if (!text) return reply('اكتب الاسم الجديد.');
      await sock.groupUpdateSubject(jid, text); reply('✅ تم تغيير الاسم.');
    } },

  { name: 'تغيير_وصف', aliases: ['setdesc'], desc: 'تغيير وصف الجروب', botAdmin: true,
    async run({ sock, jid, text, reply }) {
      if (!text) return reply('اكتب الوصف الجديد.');
      await sock.groupUpdateDescription(jid, text); reply('✅ تم تغيير الوصف.');
    } },

  { name: 'تغيير_صورة', aliases: ['setpp'], desc: 'تغيير صورة الجروب (ارد على صورة)', botAdmin: true,
    async run({ sock, jid, getMedia, reply }) {
      const media = await getMedia(['imageMessage']);
      if (!media) return reply('↩️ ارد على صورة أو ابعت صورة مع الأمر.');
      await sock.updateProfilePicture(jid, media.buffer); reply('✅ تم تغيير الصورة.');
    } },

  { name: 'تصفير_الرابط', aliases: ['revoke'], desc: 'اعادة ضبط رابط الجروب', botAdmin: true,
    async run({ sock, jid, reply }) {
      await sock.groupRevokeInvite(jid);
      reply(`🔗 الرابط الجديد:\nhttps://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`);
    } },
];
