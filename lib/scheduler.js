import { db, save } from './db.js';
import { recordError } from './diagnostics.js';

let interval;
const sending = new Set();

export function startScheduler(sock) {
  if (interval) clearInterval(interval);
  interval = setInterval(async () => {
    const due = db.scheduledMessages.filter(item =>
      item && Number(item.dueAt) <= Date.now() && !sending.has(item.id),
    );

    for (const item of due) {
      sending.add(item.id);
      try {
        await sock.sendMessage(item.sender, {
          text: `⏰ رسالتك اللي حفظتها للمستقبل:\n\n${item.text}`,
        });
        db.scheduledMessages = db.scheduledMessages.filter(saved => saved.id !== item.id);
        save();
      } catch (error) {
        item.attempts = (item.attempts || 0) + 1;
        recordError(error, 'تعذر إرسال رسالة مستقبلية');
        if (item.attempts >= 3) {
          db.scheduledMessages = db.scheduledMessages.filter(saved => saved.id !== item.id);
          save();
        }
      } finally {
        sending.delete(item.id);
      }
    }
  }, 15000);
  interval.unref?.();
}
