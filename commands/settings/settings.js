import os from 'os';
import config from '../../config.js';
import { uniqueCommands } from '../../lib/loader.js';
import { db } from '../../lib/db.js';
import { fmtDur, money } from '../../lib/utils.js';

export default [
  { name: 'بنج', aliases: ['ping'], desc: 'اختبار سرعة استجابة البوت',
    async run({ reply, react }) {
      const t = Date.now();
      await react('🏓');
      await reply(`🏓 pong\n⚡ ${Date.now() - t}ms`);
    } },

  { name: 'وقت_التشغيل', aliases: ['runtime', 'uptime'], desc: 'مدة تشغيل البوت',
    async run({ reply }) { reply(`🚀 البوت شغال من: ${fmtDur(process.uptime() * 1000)}`); } },

  { name: 'معلومات_البوت', aliases: ['botinfo'], desc: 'معلومات تفصيلية عن البوت',
    async run({ reply }) {
      const mem = (process.memoryUsage().rss / 1048576).toFixed(0);
      reply(`🤖 *${config.botName}*\n\n👨‍💻 المطور: ${config.developer}\n🎯 الأوامر: ${uniqueCommands().length}\n` +
        `🟢 Node.js: ${process.version}\n💾 الذاكرة: ${mem}MB\n🖥️ النظام: ${os.platform()}\n` +
        `👥 المستخدمين: ${Object.keys(db.users).length}\n💬 الجروبات المسجلة: ${Object.keys(db.groups).length}`);
    } },

  { name: 'المطور', aliases: ['owner', 'dev'], desc: 'جهة اتصال المطور',
    async run({ send }) {
      const num = config.owners[0];
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.developer}\nTEL;type=CELL;waid=${num}:+${num}\nEND:VCARD`;
      await send({ contacts: { displayName: config.developer, contacts: [{ vcard }] } });
    } },

  { name: 'عدد_الاوامر', aliases: ['cmdcount'], desc: 'عدد أوامر البوت',
    async run({ reply }) { reply(`🎯 عدد الأوامر: *${uniqueCommands().length}*`); } },

  { name: 'ابلاغ', aliases: ['report'], desc: 'ابلاغ المطور عن مشكلة',
    async run({ sock, text, sender, reply }) {
      if (!text) return reply('اكتب المشكلة بعد الأمر.\nمثال: /ابلاغ الأمر كذا مش شغال');
      await sock.sendMessage(config.owners[0] + '@s.whatsapp.net', { text: `🐞 *بلاغ جديد*\nمن: wa.me/${sender.split('@')[0]}\n\n${text}` });
      reply('✅ تم إرسال بلاغك للمطور. شكرًا ليك!');
    } },

  { name: 'اقتراح', aliases: ['suggest'], desc: 'ارسال اقتراح للمطور',
    async run({ sock, text, sender, reply }) {
      if (!text) return reply('اكتب اقتراحك بعد الأمر.\nمثال: /اقتراح ضيف أمر كذا');
      await sock.sendMessage(config.owners[0] + '@s.whatsapp.net', { text: `💡 *اقتراح جديد*\nمن: wa.me/${sender.split('@')[0]}\n\n${text}` });
      reply('✅ وصل اقتراحك للمطور. شكرًا!');
    } },

  { name: 'احصائيات', aliases: ['botstats'], desc: 'إحصائيات البوت',
    async run({ reply }) {
      const users = Object.values(db.users);
      const total = users.reduce((s, u) => s + (u.msgs || 0), 0);
      reply(`📊 *إحصائيات*\n\n👥 المستخدمين: ${users.length}\n💬 الرسائل المسجلة: ${money(total)}\n🏘️ الجروبات: ${Object.keys(db.groups).length}\n🚫 المحظورين: ${db.settings.banned.length}\n⏱️ التشغيل: ${fmtDur(process.uptime() * 1000)}`);
    } },
];
