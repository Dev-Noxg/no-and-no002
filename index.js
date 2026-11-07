import pino from 'pino';
import readline from 'readline';
import { loadCommands, uniqueCommands } from './lib/loader.js';
import { handle } from './handler.js';
import { onParticipants } from './lib/events.js';
import config from './config.js';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from './lib/baileys.js';
import { startScheduler } from './lib/scheduler.js';
import { recordError, recordLog } from './lib/diagnostics.js';

const ask = q => new Promise(r => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, a => { rl.close(); r(a.trim()); });
});

let starting = false;
let reconnectTimer;
let reconnectAttempt = 0;

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30000, 3000 * 2 ** reconnectAttempt++);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    start();
  }, delay);
}

async function start() {
  if (starting) return;
  starting = true;
  try {
    await loadCommands();
    recordLog('INFO', `تم تحميل ${uniqueCommands().length} أمر`);

    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingRequested = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !sock.authState.creds.registered && !pairingRequested) {
        pairingRequested = true;
        try {
          const number = (config.botNumber || await ask('اكتب رقم البوت بالصيغة الدولية بدون +: ')).replace(/\D/g, '');
          const code = await sock.requestPairingCode(number);
          console.log(`\n🔑 كود الربط: ${code}\nواتساب > الأجهزة المرتبطة > ربط جهاز > ربط برقم الهاتف\n`);
        } catch (error) {
          recordError(error, 'فشل طلب كود الربط');
          pairingRequested = false;
        }
      }

      if (connection === 'open') {
        starting = false;
        reconnectAttempt = 0;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        recordLog('INFO', 'تم الاتصال بواتساب');
        startScheduler(sock);
      }

      if (connection === 'close') {
        starting = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          recordLog('ERROR', 'تم تسجيل الخروج؛ أعد ربط الجهاز من جديد.');
        } else {
          recordLog('WARN', 'انقطع الاتصال؛ ستتم إعادة المحاولة.');
          scheduleReconnect();
        }
      }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) handle(sock, m).catch(error => recordError(error, 'معالجة رسالة'));
    });

    sock.ev.on('group-participants.update', ({ id, participants, action }) => {
      onParticipants(sock, id, participants, action).catch(error => recordError(error, 'تحديث أعضاء المجموعة'));
    });
  } catch (error) {
    starting = false;
    recordError(error, 'فشل بدء البوت');
    scheduleReconnect();
  }
}

process.on('uncaughtException', error => {
  recordError(error, 'خطأ غير معالج');
  process.exit(1);
});
process.on('unhandledRejection', reason => {
  recordError(reason, 'وعد غير معالج');
  process.exit(1);
});

start();
