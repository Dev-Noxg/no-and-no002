import 'dotenv/config';

export default {
  botName: 'no and no',
  developer: 'no and no',
  prefix: '/',
  botNumber: '201036042537',      // رقم البوت (المربوط بكود الربط)
  owners: ['201225622948', '201924162879501'],       // رقم المطور (اللي بتبعت منه أوامر المطور)

  // أوامر الذكاء الاصطناعي: أي خدمة بنفس شكل OpenAI (OpenAI, OpenRouter, Groq, ...)
  // خزّن المفتاح في GROQ_API_KEY داخل Replit Secrets، ولا تضعه هنا.
  ai: {
    url: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },

  // أوامر تحميل يوتيوب/تيك توك/انستا...: حط ملف yt-dlp.exe جوه مجلد البوت
  ytdlp: 'yt-dlp',
};
