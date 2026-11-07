import sharp from 'sharp';
import { getBuffer, isUrl } from '../../lib/utils.js';

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const toSticker = buf => sharp(buf).resize(512, 512, { fit: 'contain', background: CLEAR }).webp().toBuffer();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function image(getMedia, reply, types = ['imageMessage', 'stickerMessage']) {
  const media = await getMedia(types);
  if (!media) { reply('↩️ ارد على صورة أو ابعت صورة مع الأمر.'); return null; }
  return media.buffer;
}

export default [
  { name: 'ملصق', aliases: ['sticker', 's'], desc: 'تحويل صورة لملصق (ارد على صورة)',
    async run({ getMedia, send, reply }) {
      const b = await image(getMedia, reply); if (!b) return;
      await send({ sticker: await toSticker(b) });
    } },

  { name: 'لصورة', aliases: ['toimg'], desc: 'تحويل ملصق لصورة (ارد على ملصق)',
    async run({ getMedia, send, reply }) {
      const media = await getMedia(['stickerMessage']);
      if (!media) return reply('↩️ ارد على ملصق.');
      await send({ image: await sharp(media.buffer).png().toBuffer(), caption: '✅' });
    } },

  { name: 'ملصق_نص', aliases: ['ttp'], desc: 'ملصق من نص مكتوب',
    async run({ text, send, reply }) {
      if (!text) return reply('اكتب النص. مثال: /ملصق_نص صباح الخير');
      const words = text.split(/\s+/); const lines = []; let cur = '';
      for (const w of words) { if ((cur + ' ' + w).trim().length > 14) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
      if (cur) lines.push(cur);
      const L = lines.slice(0, 6), size = Math.min(110, Math.floor(440 / L.length)), top = 256 - ((L.length - 1) * size) / 2;
      const tspans = L.map((l, i) => `<text x="256" y="${top + i * size}" font-size="${size * 0.8}" text-anchor="middle" dominant-baseline="middle" font-family="Tahoma, Arial, sans-serif" font-weight="bold" fill="#fff" stroke="#000" stroke-width="${size / 14}" paint-order="stroke">${esc(l)}</text>`).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${tspans}</svg>`;
      await send({ sticker: await sharp(Buffer.from(svg)).webp().toBuffer() });
    } },

  { name: 'ملصق_دائري', aliases: ['round'], desc: 'ملصق دائري من صورة',
    async run({ getMedia, send, reply }) {
      const b = await image(getMedia, reply); if (!b) return;
      const img = await sharp(b).resize(512, 512, { fit: 'cover' }).toBuffer();
      const mask = Buffer.from('<svg width="512" height="512"><circle cx="256" cy="256" r="256"/></svg>');
      await send({ sticker: await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).webp().toBuffer() });
    } },

  { name: 'ملصق_رابط', aliases: ['urlsticker'], desc: 'ملصق من رابط صورة',
    async run({ text, send, reply }) {
      if (!isUrl(text)) return reply('اكتب رابط صورة مباشر.');
      await send({ sticker: await toSticker((await getBuffer(text)).buffer) });
    } },

  { name: 'ابيض_واسود', aliases: ['gray'], desc: 'تحويل الصورة لأبيض وأسود',
    async run({ getMedia, send, reply }) {
      const b = await image(getMedia, reply, ['imageMessage']); if (!b) return;
      await send({ image: await sharp(b).grayscale().jpeg().toBuffer(), caption: '⚫⚪' });
    } },

  { name: 'تغبيش', aliases: ['blur'], desc: 'تغبيش الصورة (قوة 1-30 اختياري)',
    async run({ getMedia, args, send, reply }) {
      const b = await image(getMedia, reply, ['imageMessage']); if (!b) return;
      const s = Math.min(30, Math.max(1, parseInt(args[0]) || 8));
      await send({ image: await sharp(b).blur(s).jpeg().toBuffer(), caption: '🌫️' });
    } },

  { name: 'قلب', aliases: ['mirror'], desc: 'قلب الصورة أفقيًا (مرآة)',
    async run({ getMedia, send, reply }) {
      const b = await image(getMedia, reply, ['imageMessage']); if (!b) return;
      await send({ image: await sharp(b).flop().jpeg().toBuffer(), caption: '🪞' });
    } },
];
