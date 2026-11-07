export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const rand = a => a[Math.floor(Math.random() * a.length)];
export const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const numOf = j => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
export const ids = p => [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean);
export const money = n => Math.floor(Number(n) || 0).toLocaleString('en-US');
export const isUrl = s => /^https?:\/\/\S+$/i.test(s || '');
export const bar = (v, max, len = 10) => {
  const f = Math.max(0, Math.min(len, Math.round((v / max) * len)));
  return '█'.repeat(f) + '░'.repeat(len - f);
};

export function parseToggle(a) {
  a = String(a || '').toLowerCase();
  if (['on', 'تشغيل', 'تفعيل', 'فتح', '1', 'نعم'].includes(a)) return true;
  if (['off', 'ايقاف', 'إيقاف', 'تعطيل', 'قفل', '0', 'لا'].includes(a)) return false;
  return null;
}

export function fmtDur(ms) {
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const out = [];
  if (d) out.push(`${d} يوم`);
  if (h) out.push(`${h} ساعة`);
  if (m) out.push(`${m} دقيقة`);
  if (s || !out.length) out.push(`${s} ثانية`);
  return out.join(' و');
}

// توحيد النص العربي للمقارنة
export const normAr = s => String(s).toLowerCase()
  .replace(/[\u064B-\u0652\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ').trim();

export async function getBuffer(url, max = 95 * 1024 * 1024) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const len = Number(r.headers.get('content-length') || 0);
  if (len > max) throw new Error('الملف كبير جدًا (أكتر من 95MB)');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) throw new Error('الملف كبير جدًا (أكتر من 95MB)');
  return { buffer: buf, mime: (r.headers.get('content-type') || '').split(';')[0], headers: r.headers };
}

export async function getJson(url, opts) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
    ...opts,
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
