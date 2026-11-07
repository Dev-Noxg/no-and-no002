// أوامر تحكم للمطور — ضعها في commands/owner/owner_power.js
// المطور بيتجاوز كل صلاحيات الأدمن تلقائيًا، لكن البوت نفسه لازم يكون أدمن في الجروب.

export default [
  {
    name: 'ادمني',
    aliases: ['promoteme', 'ترقيني'],
    desc: 'ترقيتك لأدمن في الجروب (لازم البوت يكون أدمن)',
    owner: true,
    group: true,
    botAdmin: true,
    async run({ sock, jid, sender, partOf, reply }) {
      const p = partOf(sender);
      if (p?.admin) return reply('✅ إنت أدمن بالفعل.');
      await sock.groupParticipantsUpdate(jid, [p?.id || sender], 'promote');
      reply('👑 اتعملت أدمن في الجروب.');
    },
  },
  {
    name: 'حالة_الجروب',
    aliases: ['gstate'],
    desc: 'تقرير سريع عن حالة الجروب والبوت فيه',
    owner: true,
    group: true,
    async run({ jid, meta, g, isBotAdmin, reply }) {
      reply(
        `📊 *حالة الجروب*\n\n` +
        `🆔 ${jid}\n` +
        `👥 الأعضاء: ${meta.participants.length}\n` +
        `🤖 البوت أدمن: ${isBotAdmin ? 'نعم ✅' : 'لا ❌'}\n` +
        `👋 الترحيب: ${g.welcome ? 'مفعّل' : 'متوقف'}\n` +
        `🔗 منع الروابط: ${g.antilink ? 'مفعّل' : 'متوقف'}\n` +
        `🔇 مكتومين: ${g.muted.length}\n` +
        `⛔ محظورين: ${g.banned.length}\n` +
        `🚫 كلمات ممنوعة: ${g.badwords.length}`
      );
    },
  },
];
