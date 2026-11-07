import fs from 'fs';
import os from 'node:os';
import { statfsSync } from 'node:fs';
import config from '../../config.js';
import { db, user, save, saveNow, dbFile } from '../../lib/db.js';
import { numOf, sleep, money, parseToggle, fmtDur } from '../../lib/utils.js';
import { recentErrors, recentLogs, recordLog } from '../../lib/diagnostics.js';

const amountOf = (rest) => parseInt(rest.find(x => /^\d+$/.test(x) && x.length < 12));

export default [
  { name: 'حظر_عام', aliases: ['gban', 'block'], desc: 'منع شخص من استخدام البوت',
    async run({ target, reply }) {
      if (!target) return reply('منشن الشخص أو اكتب رقمه.');
      const k = numOf(target);
      if (config.owners.includes(k)) return reply('⛔ مينفعش تحظر مطور.');
      if (!db.settings.banned.includes(k)) db.settings.banned.push(k);
      save(); reply(`🚫 تم حظر ${k} من استخدام البوت.`);
    } },

  { name: 'الغاء_حظر_عام', aliases: ['ungban', 'unblock', 'رفع_حظر'], desc: 'الغاء حظر شخص من البوت',
    async run({ target, reply }) {
      if (!target) return reply('منشن الشخص أو اكتب رقمه.');
      db.settings.banned = db.settings.banned.filter(n => n !== numOf(target));
      save(); reply(`✅ تم إلغاء حظر ${numOf(target)}.`);
    } },

  { name: 'المحظورين', aliases: ['banlist'], desc: 'قائمة المحظورين من البوت',
    async run({ reply }) {
      reply(db.settings.banned.length ? '🚫 *المحظورين:*\n' + db.settings.banned.map(n => `▫️ ${n}`).join('\n') : '✅ مفيش محظورين.');
    } },

  { name: 'اذاعة', aliases: ['إذاعة', 'broadcast', 'bc'], desc: 'إعلان للمجموعات التي فعّلت استقبال الإذاعات',
    async run({ sock, args, reply }) {
      if ((args[0] || '').toLowerCase() !== 'تأكيد' || !args.slice(1).join(' ').trim()) {
        return reply('الإذاعة تصل فقط للمجموعات التي فعّلت استقبالها. للتأكيد اكتب:\n/إذاعة تأكيد <نص الإعلان>');
      }
      const all = await sock.groupFetchAllParticipating();
      const ids = Object.keys(all).filter(id => db.groups[id]?.broadcastEnabled);
      if (!ids.length) return reply('لا توجد مجموعات مفعّلة لاستقبال الإذاعات.');
      const batch = ids.slice(0, 15);
      const text = args.slice(1).join(' ').trim().slice(0, 1500);
      await reply(`📡 سيتم إرسال الإعلان إلى ${batch.length} مجموعة وافقت على الاستقبال${ids.length > batch.length ? ` من أصل ${ids.length}` : ''}.`);
      let ok = 0;
      for (const id of batch) {
        try { await sock.sendMessage(id, { text: `📢 *إعلان من ${config.developer}*\n\n${text}` }); ok++; }
        catch (error) { recordLog('WARN', `تعذر إرسال إذاعة إلى مجموعة: ${error.message}`); }
        await sleep(3000);
      }
      reply(`✅ تم الإرسال إلى ${ok}/${batch.length} مجموعة.`);
    } },

  { name: 'الجروبات', aliases: ['groups', 'chats', 'قائمة_الجروبات'], desc: 'قائمة الجروبات اللي البوت فيها',
    async run({ sock, reply }) {
      const gs = Object.values(await sock.groupFetchAllParticipating());
      reply(`🏘️ *الجروبات (${gs.length})*\n\n` + gs.slice(0, 40).map((g, i) => `${i + 1}. ${g.subject} — ${g.participants.length} عضو\n   ${g.id}`).join('\n'));
    } },

  { name: 'مغادرة', aliases: ['leave'], desc: 'خروج البوت من جروب (داخل الجروب أو بالـ id)',
    async run({ sock, jid, isGroup, args, reply }) {
      const id = args[0]?.endsWith('@g.us') ? args[0] : (isGroup ? jid : null);
      if (!id) return reply('اكتبها داخل الجروب، أو: /مغادرة <id الجروب>');
      await sock.sendMessage(id, { text: '👋 مع السلامة!' }).catch(() => {});
      await sock.groupLeave(id);
    } },

  { name: 'إعادة_تشغيل', aliases: ['restart', 'reboot'], desc: 'إعادة تشغيل البوت',
    async run({ reply }) {
      await reply('🔄 جاري إعادة تشغيل البوت...');
      saveNow();
      setTimeout(() => process.exit(75), 1000);
    } },

  { name: 'ايقاف', aliases: ['إيقاف', 'shutdown', 'stop'], desc: 'إيقاف البوت',
    async run({ reply }) {
      await reply('🔴 جاري إيقاف البوت...');
      saveNow();
      setTimeout(() => process.exit(0), 1000);
    } },

  { name: 'حالة_السيرفر', aliases: ['stats', 'serverstats'], desc: 'حالة الذاكرة والتخزين ومدة التشغيل',
    async run({ reply }) {
      let diskText = 'غير متاح';
      try {
        const disk = statfsSync(process.cwd());
        const free = disk.bavail * disk.bsize;
        diskText = `${(free / 1024 ** 3).toFixed(2)} GB متاح`;
      } catch {}
      const memory = process.memoryUsage();
      return reply(
        `🖥️ *حالة السيرفر*\n` +
        `⏱️ مدة التشغيل: ${fmtDur(process.uptime() * 1000)}\n` +
        `🧠 ذاكرة العملية: ${(memory.rss / 1024 ** 2).toFixed(1)} MB\n` +
        `💾 ذاكرة النظام المتاحة: ${(os.freemem() / 1024 ** 3).toFixed(2)} GB\n` +
        `📦 مساحة التخزين: ${diskText}`,
      );
    } },

  { name: 'صيانة', aliases: ['maintenance'], desc: 'تشغيل أو إيقاف وضع الصيانة',
    async run({ args, reply }) {
      const value = parseToggle(args[0]);
      if (value === null) return reply(`وضع الصيانة: ${db.settings.maintenance ? 'مفعّل' : 'متوقف'}\nاكتب: /صيانة تشغيل أو /صيانة ايقاف`);
      db.settings.maintenance = value;
      save();
      return reply(`🛠️ وضع الصيانة ${value ? 'مفعّل' : 'متوقف'}.`);
    } },

  { name: 'جلب_لوج', aliases: ['logs'], desc: 'عرض آخر سجلات التشغيل',
    async run({ reply }) {
      const entries = recentLogs(15);
      return reply(entries.length ? `📋 *آخر السجلات*\n\n${entries.join('\n')}` : 'لا توجد سجلات منذ بدء التشغيل.');
    } },

  { name: 'أخطاء', aliases: ['errors'], desc: 'عرض آخر الأخطاء',
    async run({ reply }) {
      const entries = recentErrors(15);
      return reply(entries.length ? `⚠️ *آخر الأخطاء*\n\n${entries.join('\n')}` : '✅ لا توجد أخطاء مسجلة منذ بدء التشغيل.');
    } },

  { name: 'فحص', aliases: ['health'], desc: 'فحص أساسي للبوت والخدمات',
    async run({ reply }) {
      return reply(`✅ البوت يعمل\n🤖 أوامر محمّلة: ${new Set((await import('../../lib/loader.js')).commands.values()).size}\n🧠 الذكاء الاصطناعي: ${config.ai.key ? 'مُعدّ' : 'غير مُعدّ'}`);
    } },

  { name: 'وضع_البوت', aliases: ['mode'], desc: 'عام (للكل) أو خاص (للمطور فقط)',
    async run({ args, reply }) {
      const a = args[0];
      if (['عام', 'public'].includes(a)) db.settings.mode = 'public';
      else if (['خاص', 'private'].includes(a)) db.settings.mode = 'private';
      else return reply(`الوضع الحالي: ${db.settings.mode === 'public' ? 'عام' : 'خاص'}\nاكتب: /وضع_البوت عام  أو  /وضع_البوت خاص`);
      save(); reply(`✅ وضع البوت الآن: ${db.settings.mode === 'public' ? 'عام 🌍' : 'خاص 🔒'}`);
    } },

  { name: 'اضافة_فلوس', aliases: ['addmoney'], desc: 'اضافة فلوس لعضو',
    async run({ target, sender, rest, reply }) {
      const n = amountOf(rest); const t = target || sender;
      if (!n) return reply('مثال: /اضافة_فلوس @user 500');
      user(t).money += n; save(); reply(`✅ تمت إضافة ${money(n)} لـ @${numOf(t)}`, [t]);
    } },

  { name: 'خصم_فلوس', aliases: ['removemoney'], desc: 'خصم فلوس من عضو',
    async run({ target, sender, rest, reply }) {
      const n = amountOf(rest); const t = target || sender;
      if (!n) return reply('مثال: /خصم_فلوس @user 500');
      const u = user(t); u.money = Math.max(0, u.money - n); save();
      reply(`✅ تم خصم ${money(n)} من @${numOf(t)}`, [t]);
    } },

  { name: 'تصفير_مستخدم', aliases: ['resetuser'], desc: 'مسح بيانات مستخدم',
    async run({ target, reply }) {
      if (!target) return reply('منشن الشخص أو اكتب رقمه.');
      delete db.users[numOf(target)]; save(); reply(`🗑️ تم مسح بيانات ${numOf(target)}.`);
    } },

  { name: 'نسخة_احتياطية', aliases: ['backup'], desc: 'ارسال ملف قاعدة البيانات',
    async run({ send }) {
      saveNow();
      await send({ document: fs.readFileSync(dbFile), mimetype: 'application/json', fileName: `backup-${Date.now()}.json` });
    } },

  { name: 'حالة_البوت', aliases: ['setstatus'], desc: 'تغيير حالة (بايو) رقم البوت',
    async run({ sock, text, reply }) {
      if (!text) return reply('اكتب الحالة الجديدة.');
      await sock.updateProfileStatus(text); reply('✅ تم تغيير الحالة.');
    } },

  { name: 'اسم_البوت', aliases: ['setbotname'], desc: 'تغيير اسم رقم البوت',
    async run({ sock, text, reply }) {
      if (!text) return reply('اكتب الاسم الجديد.');
      await sock.updateProfileName(text); reply('✅ تم تغيير الاسم.');
    } },

  { name: 'صورة_البوت', aliases: ['setbotpp'], desc: 'تغيير صورة رقم البوت (ارد على صورة)',
    async run({ sock, getMedia, reply }) {
      const media = await getMedia(['imageMessage']);
      if (!media) return reply('↩️ ارد على صورة أو ابعت صورة مع الأمر.');
      await sock.updateProfilePicture(sock.user.id, media.buffer); reply('✅ تم تغيير صورة البوت.');
    } },

  { name: 'ارسل', aliases: ['sendmsg'], desc: 'ارسال رسالة لرقم: /ارسل 2010... النص',
    async run({ sock, args, reply }) {
      const num = (args[0] || '').replace(/\D/g, '');
      const msg = args.slice(1).join(' ');
      if (!num || !msg) return reply('مثال: /ارسل 201012345678 أهلا');
      await sock.sendMessage(num + '@s.whatsapp.net', { text: msg }); reply('✅ تم الإرسال.');
    } },

  { name: 'زرف', aliases: ['destroy', 'nuke'], desc: 'معطل لحماية أعضاء المجموعة', group: true,
    async run({ reply }) { return reply('⛔ هذا الأمر معطّل لأنه كان يطرد كل أعضاء المجموعة ويغيّر إعداداتها بشكل لا يمكن التراجع عنه.'); } },
];