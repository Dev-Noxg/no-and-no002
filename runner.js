import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./index.js', import.meta.url));
let child;
let stopping = false;

function launch() {
  child = spawn(process.execPath, [entry], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.once('error', error => {
    console.error('تعذر تشغيل البوت:', error.message);
    process.exitCode = 1;
  });

  child.once('exit', code => {
    if (stopping) return;
    if (code === 75) {
      console.log('إعادة تشغيل البوت بطلب من المطور...');
      setTimeout(launch, 1500);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    child?.kill(signal);
  });
}

launch();
