import { db, user, save } from '../../lib/db.js';
import { proposals } from '../../lib/state.js';
import { numOf, money, bar } from '../../lib/utils.js';

const need = lv => Math.pow(lv, 2) * 40; // XP اللازم للوصول للمستوى التالي

export default [
  { name: 'بروفايل', aliases: ['profile', 'me'], desc: 'الملف الشخصي (لك أو لعضو)',
    async run({ target, sender, g, reply }) {
      const who = target || sender;
      const u = user(who);
      const w = g?.warns?.[numOf(who)] || 0;
      reply(`🧑 *الملف الشخصي*\n\n📱 @${numOf(who)}${u.nick ? '\n🏷️ اللقب: ' + u.nick : ''}\n📝 البايو: ${u.bio || 'فارغ'}\n` +
        `⭐ المستوى: ${u.level} (${u.xp} XP)\n💰 الفلوس: ${money(u.money)} | 🏦 البنك: ${money(u.bank)}\n` +
        `💬 الرسائل: ${u.msgs}\n💍 الحالة: ${u.married ? 'متزوج من @' + u.married : 'أعزب'}\n⚠️ التحذيرات: ${w}/3`,
        [who, ...(u.married ? [u.married + '@s.whatsapp.net'] : [])]);
    } },

  { name: 'ايدي', aliases: ['id'], desc: 'رقم الشخص ومعرف الشات',
    async run({ target, sender, jid, reply }) {
      reply(`🆔 الشخص: ${numOf(target || sender)}\n💬 الشات: ${jid}`);
    } },

  { name: 'صورة', aliases: ['pp', 'avatar'], desc: 'صورة البروفايل لعضو',
    async run({ sock, target, sender, send, reply }) {
      try {
        const url = await sock.profilePictureUrl(target || sender, 'image');
        await send({ image: { url }, caption: `🖼️ صورة @${numOf(target || sender)}`, mentions: [target || sender] });
      } catch { reply('❌ مفيش صورة ظاهرة أو الخصوصية مانعة.'); }
    } },

  { name: 'بايو', aliases: ['setbio'], desc: 'اكتب نبذة عنك في ملفك',
    async run({ u, text, reply }) {
      if (!text) return reply('اكتب النبذة بعد الأمر.');
      if (text.length > 100) return reply('❌ أقصى طول 100 حرف.');
      u.bio = text; save(); reply('✅ تم حفظ البايو.');
    } },

  { name: 'مستوى', aliases: ['level', 'rank'], desc: 'مستواك ونقاط الخبرة',
    async run({ u, reply }) {
      const nxt = need(u.level);
      reply(`⭐ المستوى: *${u.level}*\n✨ الخبرة: ${u.xp}/${nxt}\n${bar(u.xp, nxt)}`);
    } },

  { name: 'المتصدرين', aliases: ['top', 'leaderboard'], desc: 'أعلى 10 في الخبرة',
    async run({ reply }) {
      const top = Object.entries(db.users).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
      if (!top.length) return reply('لسه مفيش بيانات.');
      const medals = ['🥇', '🥈', '🥉'];
      reply('🏆 *المتصدرين*\n\n' + top.map(([k, u], i) => `${medals[i] || '▫️'} @${k} — مستوى ${u.level} (${u.xp} XP)`).join('\n'),
        top.map(([k]) => k + '@s.whatsapp.net'));
    } },

  { name: 'غياب', aliases: ['afk'], desc: 'تفعيل وضع الغياب',
    async run({ u, text, reply }) {
      u.afk = { reason: text || 'بدون سبب', since: Date.now() }; save();
      reply(`💤 تم تفعيل الغياب: ${u.afk.reason}`);
    } },

  { name: 'لقب', aliases: ['nick'], desc: 'اختار لقب لنفسك',
    async run({ u, text, reply }) {
      if (!text) return reply('اكتب اللقب بعد الأمر.');
      if (text.length > 20) return reply('❌ أقصى طول 20 حرف.');
      u.nick = text; save(); reply(`🏷️ لقبك الجديد: ${text}`);
    } },

  { name: 'زواج', aliases: ['marry'], desc: 'اطلب الزواج من عضو (منشن)', group: true,
    async run({ sender, target, u, jid, reply }) {
      if (!target) return reply('↩️ منشن اللي عاوز تتجوزه.');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تتجوز نفسك.');
      if (u.married) return reply('💍 إنت متزوج بالفعل!');
      if (user(target).married) return reply('💔 هو/هي متزوج بالفعل.');
      proposals.set(jid + numOf(target), { from: sender, until: Date.now() + 120000 });
      reply(`💍 @${numOf(sender)} بيطلب إيد @${numOf(target)}\nاكتب */موافقة* خلال دقيقتين.`, [sender, target]);
    } },

  { name: 'موافقة', aliases: ['accept'], desc: 'قبول طلب زواج', group: true,
    async run({ sender, jid, u, reply }) {
      const p = proposals.get(jid + numOf(sender));
      if (!p || p.until < Date.now()) return reply('ℹ️ مفيش طلب زواج ليك.');
      const other = user(p.from);
      u.married = numOf(p.from); other.married = numOf(sender);
      proposals.delete(jid + numOf(sender)); save();
      reply(`🎉💍 مبروك! @${numOf(p.from)} و @${numOf(sender)} اتجوزوا!`, [p.from, sender]);
    } },

  { name: 'طلاق', aliases: ['divorce'], desc: 'انهاء الزواج',
    async run({ u, reply }) {
      if (!u.married) return reply('ℹ️ إنت مش متزوج.');
      const o = db.users[u.married]; if (o) o.married = null;
      u.married = null; save(); reply('💔 تم الطلاق.');
    } },

  { name: 'ميلادي', aliases: ['setbirthday'], desc: 'سجل تاريخ ميلادك (يوم/شهر/سنة)',
    async run({ u, text, reply }) {
      const m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
      if (!m) return reply('اكتب التاريخ كده: /ميلادي 15/6/2000');
      const [, d, mo, y] = m.map(Number);
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1930 || y > new Date().getFullYear()) return reply('❌ تاريخ غير صحيح.');
      u.birthday = { d, m: mo, y }; save(); reply('🎂 تم حفظ تاريخ ميلادك.');
    } },

  { name: 'عمري', aliases: ['age'], desc: 'عمرك وكام يوم على عيد ميلادك',
    async run({ u, reply }) {
      if (!u.birthday) return reply('سجل ميلادك الأول: /ميلادي 15/6/2000');
      const { d, m, y } = u.birthday, now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisYear = new Date(now.getFullYear(), m - 1, d);
      let age = now.getFullYear() - y;
      if (thisYear > today) age--;
      const next = thisYear < today ? new Date(now.getFullYear() + 1, m - 1, d) : thisYear;
      const days = Math.round((next - today) / 86400000);
      reply(`🎂 عمرك: *${age}* سنة\n🎉 باقي *${days}* يوم على عيد ميلادك.`);
    } },

  { name: 'رقمي', aliases: ['mynumber'], desc: 'عرض رقمك',
    async run({ sender, reply }) { reply(`📱 رقمك: +${numOf(sender)}`); } },
];
