import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import config from '../../config.js';
import { db, save } from '../../lib/db.js';
import { numOf } from '../../lib/utils.js';

const activeSubBots = new Map();

export default [
  {
    name: 'تنصيب',
    aliases: ['pair', 'subbot', 'ربط'],
    desc: 'ربط رقمك لتشغيل بوت فرعي (أو التحكم في الميزة للمطورين)',
    async run({ sock, sender, args, reply }) {
      const senderNum = numOf(sender);
      const isOwner = config.owners.includes(senderNum);
      const action = (args[0] || '').toLowerCase();

      // ==========================================
      // تحكم المطور في فتح وإغلاق الميزة
      // ==========================================
      if (isOwner && ['فتح', 'قفل', 'enable', 'disable', 'open', 'close'].includes(action)) {
        const enable = ['فتح', 'enable', 'open'].includes(action);
        db.settings.subbotEnabled = enable;
        save();
        return reply(`⚙️ تم ${enable ? 'تفعيل 🟢' : 'إيقاف 🔴'} ميزة التنصيب والربط العام للأعضاء.`);
      }

      // ==========================================
      // التحقق من حالة الميزة للأعضاء
      // ==========================================
      const isSubbotEnabled = db.settings.subbotEnabled ?? true; // تفعيل افتراضي
      if (!isSubbotEnabled && !isOwner) {
        return reply('⛔ ميزة التنصيب الفرعي مغلقة حالياً من قبل المطور.');
      }

      // ==========================================
      // بدء عملية الربط (لأعضاء أو للمطور)
      // ==========================================
      const targetNumber = args[0] && /^\d+$/.test(args[0]) ? args[0] : senderNum;

      if (!targetNumber || targetNumber.length < 10) {
        return reply('⚠️ يرجى كتابة الرقم الصحيح مع كود الدولة.\nمثال: `/تنصيب 201012345678`');
      }

      if (activeSubBots.has(targetNumber)) {
        return reply('⚠️ هناك عملية ربط جارية بالفعل لهذا الرقم، يرجى الانتظار.');
      }

      await reply(`⏳ جاري بدء جلسة التنصيب للرقم: +${targetNumber}\nسيتم استخراج كود الربط خلال لحظات...`);

      try {
        const sessionPath = path.join(process.cwd(), `sessions/sub_${targetNumber}`);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const subSock = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          logger: pino({ level: 'silent' })
        });

        activeSubBots.set(targetNumber, subSock);

        if (!subSock.authState.creds.registered) {
          setTimeout(async () => {
            try {
              let code = await subSock.requestPairingCode(targetNumber);
              code = code?.match(/.{1,4}/g)?.join('-') || code;
              await sock.sendMessage(sender, {
                text: `🔑 *كود ربط البوت الفرعي الخاص بك:*\n\`\`\`${code}\`\`\`\n\n📌 *خطوات الربط:*\n1. افتح واتساب من الهاتف المراد ربطه.\n2. اذهب إلى: الإعدادات > الأجهزة المرتبطة > ربط جهاز.\n3. اختر "الربط برقم الهاتف" وادخل الكود الموضح أعلاه.`
              });
            } catch (err) {
              reply('❌ تعذر الحصول على كود الربط، تأكد من صحة الرقم.');
              activeSubBots.delete(targetNumber);
            }
          }, 3000);
        }

        subSock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect } = update;
          if (connection === 'open') {
            await sock.sendMessage(sender, { text: `✅ *تم الربط بنجاح!* الرقم +${targetNumber} يعمل الآن كبوت فرعي.` });
            activeSubBots.delete(targetNumber);
          } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (!shouldReconnect) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            activeSubBots.delete(targetNumber);
          }
        });

        subSock.ev.on('creds.update', saveCreds);

      } catch (err) {
        activeSubBots.delete(targetNumber);
        reply(`❌ حدث خطأ أثناء إعداد الجلسة: ${err.message}`);
      }
    }
  }
];