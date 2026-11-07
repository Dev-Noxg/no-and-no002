import { save } from '../../lib/db.js';
import { numOf, parseToggle } from '../../lib/utils.js';

const onoff = v => (v ? 'مفعّل ✅' : 'متوقف ❌');
const usage = n => `اكتب: /${n} تشغيل  أو  /${n} ايقاف`;

export default [
  { name: 'معلومات_الجروب', aliases: ['groupinfo', 'ginfo'], desc: 'معلومات الجروب',
    async run({ meta, reply }) {
      const admins = meta.participants.filter(p => p.admin).length;
      const date = new Date(meta.creation * 1000).toLocaleDateString('ar-EG');
      reply(`👥 *${meta.subject}*\n\n🆔 ${meta.id}\n👤 الأعضاء: ${meta.participants.length}\n🛡️ الأدمنية: ${admins}\n📅 التأسيس: ${date}\n` +
        `📝 الوصف:\n${meta.desc || 'لا يوجد'}`);
    } },

  { name: 'الرابط', aliases: ['link', 'invite'], desc: 'رابط دعوة الجروب', botAdmin: true,
    async run({ sock, jid, reply }) { reply(`🔗 https://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`); } },

  { name: 'الادمنية', aliases: ['admins'], desc: 'قائمة أدمنية الجروب',
    async run({ meta, reply }) {
      const a = meta.participants.filter(p => p.admin).map(p => p.id);
      reply('🛡️ *الأدمنية:*\n' + a.map(i => `▫️ @${numOf(i)}`).join('\n'), a);
    } },

  { name: 'القوانين', aliases: ['rules'], desc: 'عرض قوانين الجروب',
    async run({ g, reply }) { reply(g.rules ? `📜 *قوانين الجروب*\n\n${g.rules}` : 'ℹ️ لسه مفيش قوانين متسجلة.'); } },

  { name: 'ضبط_القوانين', aliases: ['setrules'], desc: 'تسجيل قوانين الجروب', admin: true,
    async run({ g, text, reply }) {
      if (!text) return reply('اكتب القوانين بعد الأمر.');
      g.rules = text; save(); reply('✅ تم حفظ القوانين.');
    } },

  { name: 'ترحيب', aliases: ['welcome'], desc: 'تشغيل/ايقاف رسالة الترحيب', admin: true,
    async run({ g, args, reply }) {
      const v = parseToggle(args[0]); if (v === null) return reply(usage('ترحيب'));
      g.welcome = v; save(); reply(`👋 الترحيب: ${onoff(v)}`);
    } },

  { name: 'ضبط_ترحيب', aliases: ['setwelcome'], desc: 'تغيير نص الترحيب ({user} {group} {count})', admin: true,
    async run({ g, text, reply }) {
      if (!text) return reply('اكتب نص الترحيب. المتغيرات: {user} {group} {count}\nمثال: /ضبط_ترحيب نورت يا {user} في {group}');
      g.welcomeMsg = text; save(); reply('✅ تم حفظ نص الترحيب.');
    } },

  { name: 'توديع', aliases: ['goodbye', 'bye'], desc: 'تشغيل/ايقاف رسالة التوديع', admin: true,
    async run({ g, args, reply }) {
      const v = parseToggle(args[0]); if (v === null) return reply(usage('توديع'));
      g.bye = v; save(); reply(`👋 التوديع: ${onoff(v)}`);
    } },

  { name: 'ضبط_توديع', aliases: ['setbye'], desc: 'تغيير نص التوديع', admin: true,
    async run({ g, text, reply }) {
      if (!text) return reply('اكتب نص التوديع. المتغيرات: {user} {group} {count}');
      g.byeMsg = text; save(); reply('✅ تم حفظ نص التوديع.');
    } },

  { name: 'منع_الروابط', aliases: ['antilink'], desc: 'تشغيل/ايقاف منع الروابط', admin: true,
    async run({ g, args, reply, isBotAdmin }) {
      const v = parseToggle(args[0]); if (v === null) return reply(usage('منع_الروابط'));
      g.antilink = v; save();
      reply(`🔗 منع الروابط: ${onoff(v)}${v && !isBotAdmin ? '\n⚠️ لازم أكون أدمن عشان أحذف الروابط.' : ''}`);
    } },

  { name: 'منع_كلمة', aliases: ['addbadword'], desc: 'اضافة كلمة ممنوعة', admin: true,
    async run({ g, text, reply }) {
      if (!text) return reply('اكتب الكلمة بعد الأمر.');
      if (!g.badwords.includes(text)) g.badwords.push(text);
      save(); reply(`🚫 تمت إضافة "${text}" للكلمات الممنوعة.`);
    } },

  { name: 'سماح_كلمة', aliases: ['delbadword'], desc: 'ازالة كلمة من الممنوعات', admin: true,
    async run({ g, text, reply }) {
      g.badwords = g.badwords.filter(w => w !== text); save();
      reply(`✅ تم السماح بـ "${text}"`);
    } },

  { name: 'قائمة_المنع', aliases: ['badwords'], desc: 'عرض الكلمات الممنوعة',
    async run({ g, reply }) { reply(g.badwords.length ? '🚫 *الكلمات الممنوعة:*\n' + g.badwords.map(w => `▫️ ${w}`).join('\n') : '✅ مفيش كلمات ممنوعة.'); } },

  { name: 'اعدادات_الجروب', aliases: ['gsettings'], desc: 'عرض إعدادات الجروب الحالية',
    async run({ g, reply }) {
      reply(`⚙️ *إعدادات الجروب*\n\n👋 الترحيب: ${onoff(g.welcome)}\n👋 التوديع: ${onoff(g.bye)}\n🔗 منع الروابط: ${onoff(g.antilink)}\n` +
        `🎮 الألعاب: ${onoff(g.games)}\n🚫 كلمات ممنوعة: ${g.badwords.length}\n🔇 مكتومين: ${g.muted.length}\n⛔ محظورين: ${g.banned.length}`);
    } },

  { name: 'وضع_الالعاب', aliases: ['gamesmode'], desc: 'تشغيل/ايقاف الألعاب في الجروب', admin: true,
    async run({ g, args, reply }) {
      const v = parseToggle(args[0]); if (v === null) return reply(usage('وضع_الالعاب'));
      g.games = v; save(); reply(`🎮 الألعاب: ${onoff(v)}`);
    } },

  { name: 'استقبال_الإذاعة', aliases: ['broadcast_optin'], desc: 'السماح بوصول إذاعات المطور للمجموعة', admin: true,
    async run({ g, args, reply }) {
      const value = parseToggle(args[0]);
      if (value === null) return reply('اكتب: /استقبال_الإذاعة تشغيل أو /استقبال_الإذاعة إيقاف');
      g.broadcastEnabled = value;
      save();
      return reply(value
        ? '✅ هذه المجموعة وافقت على استقبال الإعلانات من المطور.'
        : '✅ تم إيقاف استقبال الإعلانات لهذه المجموعة.');
    } },

  { name: 'نداء_الادمن', aliases: ['calladmins'], desc: 'استدعاء أدمنية الجروب',
    async run({ meta, text, pushName, reply }) {
      const a = meta.participants.filter(p => p.admin).map(p => p.id);
      reply(`🚨 *${pushName}* بينادي الأدمنية${text ? ':\n' + text : ''}\n\n` + a.map(i => `@${numOf(i)}`).join(' '), a);
    } },
];
