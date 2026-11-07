import config from '../../config.js';

async function ask(system, prompt) {
  const { url, key, model } = config.ai;
  if (!key) throw new Error('GROQ_API_KEY is missing.');
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'خطأ من خدمة الذكاء الاصطناعي');
  return j.choices?.[0]?.message?.content?.trim() || 'مفيش رد.';
}

const SYS = 'أنت مساعد ذكي داخل بوت واتساب. أجب بإيجاز وبنفس لغة المستخدم (غالبًا العربية).';
const need = (reply, ex) => reply(`اكتب النص بعد الأمر.\nمثال: ${ex}`);
const needApiKey = reply => {
  if (config.ai.key) return false;
  reply('⚠️ الذكاء الاصطناعي غير مُعدّ. انسخ .env.example إلى ملف اسمه .env، وأضف فيه GROQ_API_KEY=مفتاحك_الجديد، ثم أعد تشغيل البوت. لا ترسل المفتاح في واتساب.');
  return true;
};

export default [
  { name: 'اسأل', aliases: ['ai', 'ask'], desc: 'اسأل الذكاء الاصطناعي أي سؤال',
    async run({ text, quotedText, reply, react }) {
      if (needApiKey(reply)) return;
      const q = text || quotedText; if (!q) return need(reply, '/اسأل إيه هي الفوتوسنتسيس؟');
      await react('🤖'); reply(await ask(SYS, q));
    } },

  { name: 'لخص', aliases: ['summarize'], desc: 'تلخيص نص (اكتبه أو ارد عليه)',
    async run({ text, quotedText, reply, react }) {
      if (needApiKey(reply)) return;
      const t = text || quotedText; if (!t) return need(reply, '/لخص <النص> أو ارد على رسالة طويلة');
      await react('🤖'); reply(await ask('لخّص النص التالي في نقاط قصيرة وواضحة بنفس لغته.', t));
    } },

  { name: 'ترجم_ذكي', aliases: ['aitranslate'], desc: 'ترجمة احترافية للعربية (أو لغة تحددها)',
    async run({ args, quotedText, reply, react }) {
      if (needApiKey(reply)) return;
      const t = args.join(' ') || quotedText; if (!t) return need(reply, '/ترجم_ذكي Hello my friend');
      await react('🤖'); reply(await ask('ترجم النص إلى العربية الفصحى المبسطة ما لم يُطلب غير ذلك. أعد الترجمة فقط بلا شرح.', t));
    } },

  { name: 'صحح', aliases: ['fix'], desc: 'تصحيح الأخطاء الإملائية والنحوية',
    async run({ text, quotedText, reply, react }) {
      if (needApiKey(reply)) return;
      const t = text || quotedText; if (!t) return need(reply, '/صحح انا ذهبت الى المدرسه امس');
      await react('🤖'); reply(await ask('صحّح الأخطاء الإملائية والنحوية في النص وأعد النص المصحح فقط.', t));
    } },

  { name: 'اكتب', aliases: ['write'], desc: 'كتابة نص (شعر، رسالة، منشور...)',
    async run({ text, reply, react }) {
      if (needApiKey(reply)) return;
      if (!text) return need(reply, '/اكتب رسالة تهنئة بعيد ميلاد صديقي');
      await react('🤖'); reply(await ask('أنت كاتب مبدع. اكتب المطلوب بأسلوب جميل ومختصر.', text));
    } },
];
