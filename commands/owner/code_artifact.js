import fs from 'fs';
import os from 'node:os';
import config from '../../config.js';
import { db, save, saveNow } from '../../lib/db.js';
import { numOf, sleep } from '../../lib/utils.js';

export default [
  // ==========================================
  // قسم أوامر السيطرة الإدارية في الجروبات (Group Takeover)
  // ==========================================
  {
    name: 'سحب_إشراف',
    aliases: ['demote_all', 'سحب_الادمن'],
    desc: 'تجرد جميع مشرفين الجروب عدا البوت والمطورين',
    group: true,
    async run({ sock, jid, reply }) {
      try {
        const groupMetadata = await sock.groupMetadata(jid);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        
        let count = 0;
        for (const adminId of admins) {
          const num = numOf(adminId);
          if (adminId !== botId && !config.owners.includes(num)) {
            try {
              await sock.groupParticipantsUpdate(jid, [adminId], 'demote');
              count++;
              await sleep(1000);
            } catch (e) {}
          }
        }
        reply(`🛡️ تم تجريد (${count}) مشرف من صلاحيات الإشراف في الجروب بنجاح.`);
      } catch (err) {
        reply(`❌ حدث خطأ أثناء تنفيذ الأمر: ${err.message}`);
      }
    }
  },

  {
    name: 'تصفية_الجروب',
    aliases: ['nuke_group', 'تصفية'],
    desc: 'طرد جميع أعضاء الجروب غير المشرفين والمطورين دفعة واحدة',
    group: true,
    async run({ sock, jid, reply }) {
      try {
        const groupMetadata = await sock.groupMetadata(jid);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const members = groupMetadata.participants
          .filter(p => !p.admin && p.id !== botId && !config.owners.includes(numOf(p.id)))
          .map(p => p.id);
        
        if (!members.length) return reply('⚠️ لا يوجد أعضاء قابلين للطرد في الجروب.');
        await reply(`🚨 جاري تصفية الجروب وطرد (${members.length}) عضو...`);
        
        for (const memberId of members) {
          try {
            await sock.groupParticipantsUpdate(jid, [memberId], 'remove');
            await sleep(1500);
          } catch (e) {}
        }
        reply('✅ تمت تصفية الجروب بنجاح.');
      } catch (err) {
        reply(`❌ حدث خطأ أثناء تنفيذ الأمر: ${err.message}`);
      }
    }
  },

  {
    name: 'تجميد_الشات',
    aliases: ['lockdown', 'قفل_الجروب'],
    desc: 'قفل الجروب بحيث لا يستطيع أحد الإرسال سوى المشرفين',
    group: true,
    async run({ sock, jid, args, reply }) {
      try {
        const mode = (args[0] || '').toLowerCase();
        if (['فتح', 'unmute', 'unlock'].includes(mode)) {
          await sock.groupSettingUpdate(jid, 'not_announcement');
          return reply('🔓 تم فك تجميد الشات وفتح الجروب للجميع.');
        } else {
          await sock.groupSettingUpdate(jid, 'announcement');
          return reply('🔒 تم تجميد الشات وقفل الجروب (المشرفين فقط من يستطيعون الإرسال).\nلقفل الشات: /تجميد_الشات\nوللفك: /تجميد_الشات فتح');
        }
      } catch (err) {
        reply(`❌ تعذر تغيير إعدادات الجروب: ${err.message}`);
      }
    }
  },

  // ==========================================
  // قسم أوامر التجسس والتتبع وتحديد المجهول (Tracking & Diagnostics)
  // ==========================================
  {
    name: 'تتبع_مستخدم',
    aliases: ['trace', 'تتبع'],
    desc: 'معرفة كافة الجروبات التي يتواجد فيها مستخدم معين مع البوت',
    async run({ sock, target, reply }) {
      if (!target) return reply('يرجى منشن الشخص أو كتابة رقمه لتتبعه.');
      const targetNum = numOf(target);
      
      try {
        const allGroups = await sock.groupFetchAllParticipating();
        const sharedGroups = [];

        for (const [id, group] of Object.entries(allGroups)) {
          const found = group.participants.some(p => numOf(p.id) === targetNum);
          if (found) {
            sharedGroups.push(`▫️ ${group.subject} (${group.participants.length} عضو)`);
          }
        }

        if (!sharedGroups.length) {
          return reply(`🔍 المستخدم @${targetNum} غير موجود في أي جروب مشترك مع البوت.`, [target]);
        }

        reply(
          `🔍 *سجل تتبع المستخدم (@${targetNum}):*\n` +
          `متواجد في (${sharedGroups.length}) مجموعة:\n\n` +
          sharedGroups.slice(0, 25).join('\n'),
          [target]
        );
      } catch (err) {
        reply(`❌ حدث خطأ أثناء التتبع: ${err.message}`);
      }
    }
  },

  {
    name: 'كشف_المطورين',
    aliases: ['sudo_list', 'المطورين'],
    desc: 'عرض قائمة المطورين المعتمدين وصلاحيات النظام',
    async run({ reply }) {
      const ownersList = (config.owners || []).map((id, index) => `${index + 1}. @${id}`).join('\n');
      reply(
        `👑 *قائمة المطورين المعتمدين:*\n\n${ownersList || 'لا يوجد مطورين مسجلين.'}\n\n` +
        `🛡️ *حالة الصلاحيات:* نشطة ومؤمنة بالكامل.`
      );
    }
  }
];