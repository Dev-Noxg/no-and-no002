import { randomUUID } from 'node:crypto';
import { db, save } from '../../lib/db.js';
import { rand } from '../../lib/utils.js';

const challenges = [
  'اتكلم بالفصحى لمدة 10 دقائق.',
  'اكتب رسالة من غير ما تستخدم حرف الألف.',
  'شارك معلومة جديدة اتعلمتها الأسبوع ده.',
  'اكتب جملة إيجابية لكل الموجودين في المجموعة.',
  'احكِ موقفًا مضحكًا حصل لك، من غير ذكر أسماء.',
  'جرّب يومًا كاملًا من غير تأجيل مهمة مهمة.',
];

const snippets = {
  javascript: 'const greet = name => `أهلًا ${name}`;\nconsole.log(greet("العالم"));',
  js: 'const greet = name => `أهلًا ${name}`;\nconsole.log(greet("العالم"));',
  python: 'def greet(name):\n    return f"أهلًا {name}"\n\nprint(greet("العالم"))',
  typescript: 'type User = { name: string };\nconst greet = (user: User): string => `أهلًا ${user.name}`;',
  html: '<!doctype html>\n<html lang="ar" dir="rtl">\n  <meta charset="utf-8">\n  <title>صفحة جديدة</title>\n</html>',
  sql: 'SELECT name, created_at\nFROM users\nORDER BY created_at DESC\nLIMIT 10;',
};

const help = 'استخدم: /ملاحظة أضف <النص> أو /ملاحظة قائمة أو /ملاحظة حذف <رقم>';

export default [
  {
    name: 'تحدي',
    aliases: ['challenge'],
    desc: 'تحدٍّ عشوائي لطيف',
    async run({ reply }) {
      return reply(`🎯 تحدي اليوم:\n${rand(challenges)}`);
    },
  },
  {
    name: 'مفتاح',
    aliases: ['snippet', 'code_template'],
    desc: 'قالب كود آمن للغة محددة',
    async run({ args, reply }) {
      const language = (args[0] || '').toLowerCase();
      if (!language) return reply(`اكتب اسم اللغة.\nالمتاح: ${[...new Set(Object.keys(snippets))].join('، ')}`);
      const snippet = snippets[language];
      if (!snippet) return reply('❌ اللغة غير مدعومة. المتاح: JavaScript، Python، TypeScript، HTML، SQL.');
      return reply(`🧩 قالب ${language}:\n\n\`\`\`\n${snippet}\n\`\`\``);
    },
  },
  {
    name: 'ملاحظة',
    aliases: ['note', 'notes'],
    desc: 'دفتر ملاحظات مشترك للمجموعة',
    group: true,
    async run({ args, g, reply }) {
      const action = (args[0] || '').toLowerCase();
      const content = args.slice(1).join(' ').trim();
      if (['أضف', 'اضف', 'add'].includes(action)) {
        if (!content) return reply(help);
        if (g.notes.length >= 100) return reply('وصلت المجموعة للحد الأقصى وهو 100 ملاحظة.');
        g.notes.push({ text: content.slice(0, 500), createdAt: Date.now() });
        save();
        return reply(`✅ تمت إضافة الملاحظة رقم ${g.notes.length}.`);
      }
      if (['قائمة', 'list', 'عرض'].includes(action)) {
        if (!g.notes.length) return reply('لا توجد ملاحظات محفوظة.');
        const items = g.notes.slice(-30).map((item, i) => `${g.notes.length - Math.min(g.notes.length, 30) + i + 1}. ${item.text}`);
        return reply(`📝 *ملاحظات المجموعة*\n\n${items.join('\n')}`);
      }
      if (['حذف', 'delete', 'remove'].includes(action)) {
        const index = Number(args[1]) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= g.notes.length) return reply('اكتب رقم ملاحظة صحيحًا للحذف.');
        g.notes.splice(index, 1);
        save();
        return reply('🗑️ تم حذف الملاحظة.');
      }
      return reply(help);
    },
  },
  {
    name: 'قرعة',
    aliases: ['draw'],
    desc: 'اختيار عشوائي من قائمة',
    async run({ text, reply }) {
      const options = text.split(/\s*[|،,]\s*/).map(value => value.trim()).filter(Boolean);
      if (options.length < 2) return reply('افصل الاختيارات بعلامة |.\nمثال: /قرعة شاي | قهوة | عصير');
      return reply(`🎲 الاختيار: *${rand(options)}*`);
    },
  },
  {
    name: 'رسالة_للمستقبل',
    aliases: ['future_note', 'futuremessage'],
    desc: 'إرسال تذكير خاص في موعد لاحق',
    async run({ args, jid, isGroup, reply }) {
      if (isGroup) return reply('لحماية خصوصيتك، أرسل الأمر للبوت في محادثة خاصة فقط.');
      const match = args.join(' ').match(/^(\d{1,4})(m|h|d)\s+([\s\S]+)$/i);
      if (!match) return reply('اكتب المدة ثم الرسالة.\nمثال: /رسالة_للمستقبل 2h افتكر أراجع الدرس');
      const amount = Number(match[1]);
      const unitMs = { m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()];
      const delay = amount * unitMs;
      if (delay < 60000 || delay > 365 * 86400000) return reply('الموعد يجب أن يكون بعد دقيقة وحتى سنة.');
      if (db.scheduledMessages.length >= 200) return reply('قائمة التذكيرات ممتلئة مؤقتًا.');
      const message = match[3].trim().slice(0, 1000);
      if (!message) return reply('اكتب نص الرسالة.');
      const mine = db.scheduledMessages.filter(item => item.sender === jid);
      if (mine.length >= 20) return reply('لديك 20 رسالة مؤجلة بالفعل؛ احذف بعضها أو انتظر إرسالها.');
      db.scheduledMessages.push({
        id: randomUUID(),
        sender: jid,
        text: message,
        dueAt: Date.now() + delay,
        createdAt: Date.now(),
        attempts: 0,
      });
      save();
      return reply(`✅ حفظت الرسالة، وسأرسلها لك على الخاص بعد ${amount}${match[2].toLowerCase()}. لن تُنشر في المجموعة.`);
    },
  },
];
