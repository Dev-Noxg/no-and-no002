import crypto from 'crypto';
import { rand, randInt, getBuffer, getJson } from '../../lib/utils.js';
import { evaluateMathExpression } from '../../lib/math.js';

const CONV = {
  'km-mi': v => v * 0.621371, 'mi-km': v => v * 1.609344,
  'kg-lb': v => v * 2.204623, 'lb-kg': v => v * 0.453592,
  'c-f': v => v * 9 / 5 + 32, 'f-c': v => (v - 32) * 5 / 9,
  'm-ft': v => v * 3.28084, 'ft-m': v => v * 0.3048,
  'cm-in': v => v * 0.393701, 'in-cm': v => v * 2.54,
  'l-gal': v => v * 0.264172, 'gal-l': v => v * 3.78541,
};

const fancy = (txt, up, lo) => [...txt].map(ch => {
  const c = ch.codePointAt(0);
  if (c >= 65 && c <= 90) return String.fromCodePoint(up + c - 65);
  if (c >= 97 && c <= 122) return String.fromCodePoint(lo + c - 97);
  return ch;
}).join('');

export default [
  { name: 'حاسبة', aliases: ['calc'], desc: 'حل عملية حسابية: /حاسبة 5*(3+2)',
    async run({ text, reply }) {
      if (!text) return reply('اكتب العملية. مثال: /حاسبة 12*(3+4)/2');
      try {
        const result = evaluateMathExpression(text);
        return reply(`🧮 ${text} = *${Math.round(result * 1e8) / 1e8}*`);
      } catch (error) {
        return reply(`❌ ${error.message}`);
      }
    } },

  { name: 'وقت', aliases: ['time'], desc: 'الوقت الآن في عدة مدن',
    async run({ reply }) {
      const zones = [['القاهرة', 'Africa/Cairo'], ['الرياض', 'Asia/Riyadh'], ['دبي', 'Asia/Dubai'], ['لندن', 'Europe/London'], ['نيويورك', 'America/New_York']];
      reply('🕒 *الوقت الآن*\n\n' + zones.map(([n, z]) => `▫️ ${n}: ${new Date().toLocaleTimeString('ar-EG', { timeZone: z, hour: '2-digit', minute: '2-digit' })}`).join('\n'));
    } },

  { name: 'تاريخ', aliases: ['date'], desc: 'التاريخ الميلادي والهجري',
    async run({ reply }) {
      const d = new Date();
      const opt = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      reply(`📅 *الميلادي:* ${d.toLocaleDateString('ar-EG', opt)}\n🌙 *الهجري:* ${d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', opt)}`);
    } },

  { name: 'ترجمة', aliases: ['translate', 'tr'], desc: 'ترجمة: /ترجمة en مرحبا (الافتراضي عربي)',
    async run({ args, quotedText, reply }) {
      let to = 'ar', words = args;
      if (/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(args[0] || '')) { to = args[0]; words = args.slice(1); }
      const t = words.join(' ') || quotedText;
      if (!t) return reply('اكتب النص أو ارد على رسالة.\nمثال: /ترجمة en صباح الخير');
      const j = await getJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(t)}`);
      reply(`🌐 (${j[2]} ← ${to})\n\n${j[0].map(x => x[0]).join('')}`);
    } },

  { name: 'طقس', aliases: ['weather'], desc: 'حالة الطقس: /طقس القاهرة',
    async run({ text, reply }) {
      const city = text || 'Cairo';
      const j = await getJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ar`);
      const c = j.current_condition[0];
      const desc = c.lang_ar?.[0]?.value || c.weatherDesc?.[0]?.value;
      reply(`🌤️ *طقس ${city}*\n\n🌡️ الحرارة: ${c.temp_C}° (تحس بـ ${c.FeelsLikeC}°)\n☁️ الحالة: ${desc}\n💧 الرطوبة: ${c.humidity}%\n💨 الرياح: ${c.windspeedKmph} كم/س`);
    } },

  { name: 'ويكيبيديا', aliases: ['wikipedia', 'wiki'], desc: 'ملخص عربي من ويكيبيديا',
    async run({ text, reply }) {
      if (!text) return reply('اكتب موضوع البحث بعد الأمر.\nمثال: /ويكيبيديا الطاقة الشمسية');
      const title = encodeURIComponent(text.trim().replace(/\s+/g, '_'));
      const result = await getJson(`https://ar.wikipedia.org/api/rest_v1/page/summary/${title}`, {
        headers: { 'user-agent': 'NoAndNoBot/2.1 (summary command)', accept: 'application/json' },
      });
      if (!result.extract) return reply('لم أجد ملخصًا عربيًا لهذا الموضوع.');
      const link = result.content_urls?.desktop?.page;
      return reply(`📚 *${result.title || text}*\n\n${result.extract.slice(0, 2500)}${link ? `\n\n${link}` : ''}`);
    } },

  { name: 'عملات', aliases: ['currency', 'fx'], desc: 'تحويل عملات: /عملات 100 USD EGP',
    async run({ args, reply }) {
      const amt = parseFloat(args[0]), from = (args[1] || '').toUpperCase(), to = (args[2] || '').toUpperCase();
      if (!amt || !from || !to) return reply('مثال: /عملات 100 USD EGP');
      const j = await getJson(`https://open.er-api.com/v6/latest/${from}`);
      const rate = j.rates?.[to];
      if (!rate) return reply('❌ عملة غير معروفة.');
      reply(`💱 ${amt} ${from} = *${(amt * rate).toFixed(2)}* ${to}`);
    } },

  { name: 'اختصار', aliases: ['shorten'], desc: 'اختصار رابط طويل',
    async run({ text, reply }) {
      if (!/^https?:\/\//i.test(text)) return reply('اكتب رابط يبدأ بـ http');
      const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(text)}`);
      reply(`🔗 ${await r.text()}`);
    } },

  { name: 'باركود', aliases: ['qr'], desc: 'تحويل نص/رابط لـ QR',
    async run({ text, send, reply }) {
      if (!text) return reply('اكتب النص أو الرابط بعد الأمر.');
      const { buffer } = await getBuffer(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`);
      await send({ image: buffer, caption: '✅ QR جاهز' });
    } },

  { name: 'عكس', aliases: ['reverse'], desc: 'عكس النص',
    async run({ text, quotedText, reply }) { const t = text || quotedText; reply(t ? [...t].reverse().join('') : 'اكتب نص.'); } },

  { name: 'زخرفة', aliases: ['decor'], desc: 'زخرفة النص عربي/انجليزي',
    async run({ text, reply }) {
      if (!text) return reply('اكتب النص بعد الأمر.');
      const ar = text.replace(/([\u0621-\u064A])(?=[\u0621-\u064A])/g, (m, c) => /[اأإآدذرزوؤ]/.test(c) ? c : c + 'ـ');
      reply(`✨ ${ar}\n\n${fancy(text, 0x1D4D0, 0x1D4EA)}\n${fancy(text, 0x1D56C, 0x1D586)}\n${fancy(text, 0x1D670, 0x1D68A)}`);
    } },

  { name: 'عد', aliases: ['count'], desc: 'عدد حروف وكلمات النص',
    async run({ text, quotedText, reply }) {
      const t = text || quotedText; if (!t) return reply('اكتب نص أو ارد على رسالة.');
      reply(`🔢 الحروف: ${[...t].length}\n📝 الكلمات: ${t.trim().split(/\s+/).length}\n📄 الأسطر: ${t.split('\n').length}`);
    } },

  { name: 'باسورد', aliases: ['password', 'pass', 'كلمة_سر'], desc: 'توليد كلمة سر قوية (الطول اختياري)',
    async run({ args, reply }) {
      const len = Math.min(64, Math.max(6, parseInt(args[0]) || 14));
      const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?';
      reply(`🔐 \`${Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('')}\``);
    } },

  { name: 'اختر', aliases: ['choose'], desc: 'اختيار عشوائي: /اختر شاي | قهوة | عصير',
    async run({ text, reply }) {
      const opts = text.split(/\s*[|،,]\s*|\s+او\s+/).filter(Boolean);
      if (opts.length < 2) return reply('افصل الاختيارات بـ | مثال: /اختر شاي | قهوة');
      reply(`🎯 اخترت لك: *${rand(opts)}*`);
    } },

  { name: 'عشوائي', aliases: ['random'], desc: 'رقم عشوائي: /عشوائي 1 100',
    async run({ args, reply }) {
      let a = parseInt(args[0]) || 1, b = parseInt(args[1]) || 100; if (a > b) [a, b] = [b, a];
      reply(`🎲 الرقم: *${randInt(a, b)}*`);
    } },

  { name: 'تحويل', aliases: ['convert'], desc: 'تحويل وحدات: /تحويل 10 km mi',
    async run({ args, reply }) {
      const v = parseFloat(args[0]), key = `${(args[1] || '').toLowerCase()}-${(args[2] || '').toLowerCase()}`;
      if (isNaN(v) || !CONV[key]) return reply(`مثال: /تحويل 10 km mi\nالمتاح: ${Object.keys(CONV).join(' , ')}`);
      reply(`📏 ${v} ${args[1]} = *${CONV[key](v).toFixed(3)}* ${args[2]}`);
    } },

  { name: 'ارقام', aliases: ['digits'], desc: 'تحويل الأرقام بين العربي والانجليزي',
    async run({ text, reply }) {
      if (!text) return reply('اكتب نص فيه أرقام.');
      const toAr = /[0-9]/.test(text);
      reply(toAr ? text.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : text.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    } },

  { name: 'تشفير', aliases: ['encode'], desc: 'تشفير نص Base64',
    async run({ text, reply }) { reply(text ? Buffer.from(text).toString('base64') : 'اكتب النص.'); } },

  { name: 'فك_تشفير', aliases: ['decode'], desc: 'فك تشفير Base64',
    async run({ text, reply }) { reply(text ? Buffer.from(text, 'base64').toString('utf8') : 'اكتب النص المشفر.'); } },

  { name: 'رابط_واتساب', aliases: ['walink'], desc: 'رابط شات مباشر: /رابط_واتساب 2010... النص',
    async run({ args, reply }) {
      const n = (args[0] || '').replace(/\D/g, '');
      if (!n) return reply('مثال: /رابط_واتساب 201012345678 أهلا');
      reply(`🔗 https://wa.me/${n}${args[1] ? '?text=' + encodeURIComponent(args.slice(1).join(' ')) : ''}`);
    } },

  { name: 'نسبة', aliases: ['percent'], desc: 'نسبة مئوية: /نسبة 25 200',
    async run({ args, reply }) {
      const a = parseFloat(args[0]), b = parseFloat(args[1]);
      if (isNaN(a) || isNaN(b) || !b) return reply('مثال: /نسبة 25 200  (25 كام في المية من 200)');
      reply(`📊 ${a} من ${b} = *${((a / b) * 100).toFixed(2)}%*\n🔸 ${a}% من ${b} = *${((a / 100) * b).toFixed(2)}*`);
    } },
];
