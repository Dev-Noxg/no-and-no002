import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import config from '../../config.js';
import { getBuffer, isUrl, money } from '../../lib/utils.js';

const TMP = path.join(os.tmpdir(), 'no-and-no-bot');
fs.mkdirSync(TMP, { recursive: true });
const BIN = () => (fs.existsSync('./yt-dlp.exe') ? './yt-dlp.exe' : config.ytdlp);
const MAX = 95 * 1024 * 1024;

function ytdlp(args, timeout = 300000) {
  return new Promise((res, rej) => {
    execFile(BIN(), args, { timeout, maxBuffer: 50 * 1024 * 1024, windowsHide: true }, (err, out, errout) => {
      if (!err) return res(out);
      if (err.code === 'ENOENT') return rej(new Error('yt-dlp مش موجود. نزّل yt-dlp.exe وحطه جوه مجلد البوت (اقرأ الشرح).'));
      rej(new Error(String(errout || err.message).split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 200)));
    });
  });
}

const pick = (kind, q) => (isUrl(q) ? q : `ytsearch1:${q}`);

async function fetchFile(kind, query) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const fmt = kind === 'audio'
    ? 'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio'
    : 'best[ext=mp4][filesize<80M]/best[ext=mp4]/best[filesize<80M]/best';
  await ytdlp(['-f', fmt, '--no-playlist', '--max-filesize', '90M', '--no-warnings', '-o', path.join(TMP, `${stamp}.%(ext)s`), pick(kind, query)]);
  const f = fs.readdirSync(TMP).find(x => x.startsWith(stamp));
  if (!f) throw new Error('فشل التحميل (الملف كبير أو غير متاح).');
  return path.join(TMP, f);
}

async function sendDownloaded(c, kind, query, label) {
  const { send, reply, react } = c;
  if (!query) return reply(`اكتب رابط${kind === 'audio' || label === 'يوتيوب' ? ' أو اسم' : ''} بعد الأمر.`);
  await react('⏳');
  const file = await fetchFile(kind, query);
  try {
    const buf = fs.readFileSync(file), ext = path.extname(file).slice(1).toLowerCase();
    if (buf.length > MAX) return reply('❌ الملف أكبر من 95MB.');
    if (kind === 'audio') {
      if (ext === 'm4a' || ext === 'mp4') await send({ audio: buf, mimetype: 'audio/mp4' });
      else if (ext === 'mp3') await send({ audio: buf, mimetype: 'audio/mpeg' });
      else await send({ document: buf, mimetype: 'audio/' + ext, fileName: path.basename(file) });
    } else if (buf.length > 60 * 1024 * 1024 || ext !== 'mp4') {
      await send({ document: buf, mimetype: 'video/' + (ext || 'mp4'), fileName: path.basename(file) });
    } else await send({ video: buf, caption: `✅ ${label}` });
    await react('✅');
  } finally { fs.rmSync(file, { force: true }); }
}

const site = (name, regex, kind = 'video') => ({
  name: name.ar, aliases: [name.en], desc: `تحميل من ${name.ar}`,
  async run(c) {
    if (!regex.test(c.text)) return c.reply(`اكتب رابط ${name.ar} بعد الأمر.`);
    await sendDownloaded(c, kind, c.text, name.ar);
  },
});

export default [
  { name: 'تحميل', aliases: ['dl', 'download'], desc: 'تحميل ملف من رابط مباشر',
    async run({ text, send, reply, react }) {
      if (!isUrl(text)) return reply('اكتب رابط مباشر لملف.\nمثال: /تحميل https://site.com/file.pdf');
      await react('⏳');
      const { buffer, mime } = await getBuffer(text);
      const name = decodeURIComponent(new URL(text).pathname.split('/').pop() || 'file');
      if (mime.startsWith('image/')) await send({ image: buffer });
      else if (mime.startsWith('video/')) await send({ video: buffer });
      else if (mime.startsWith('audio/')) await send({ audio: buffer, mimetype: mime });
      else await send({ document: buffer, mimetype: mime || 'application/octet-stream', fileName: name });
      await react('✅');
    } },

  { name: 'يوتيوب', aliases: ['yt', 'ytv'], desc: 'تحميل فيديو يوتيوب (رابط أو اسم)',
    async run(c) { await sendDownloaded(c, 'video', c.text, 'يوتيوب'); } },

  { name: 'اغنية', aliases: ['play', 'song'], desc: 'تحميل أغنية/صوت من يوتيوب (اسم أو رابط)',
    async run(c) { await sendDownloaded(c, 'audio', c.text, 'يوتيوب'); } },

  { name: 'فيديو', aliases: ['video'], desc: 'تحميل فيديو من أي رابط مدعوم',
    async run(c) {
      if (!isUrl(c.text)) return c.reply('اكتب رابط الفيديو.');
      await sendDownloaded(c, 'video', c.text, 'فيديو');
    } },

  { name: 'صوت', aliases: ['audio'], desc: 'استخراج الصوت من أي رابط',
    async run(c) {
      if (!isUrl(c.text)) return c.reply('اكتب رابط الفيديو.');
      await sendDownloaded(c, 'audio', c.text, 'صوت');
    } },

  site({ ar: 'تيك', en: 'tiktok' }, /tiktok\.com/i),
  site({ ar: 'انستا', en: 'instagram' }, /instagram\.com/i),
  site({ ar: 'فيسبوك', en: 'facebook' }, /(facebook\.com|fb\.watch)/i),
  site({ ar: 'تويتر', en: 'twitter' }, /(twitter\.com|x\.com)/i),
  site({ ar: 'ساوند', en: 'soundcloud' }, /soundcloud\.com/i, 'audio'),

  { name: 'بحث_يوتيوب', aliases: ['yts'], desc: 'بحث في يوتيوب (أول 5 نتائج)',
    async run({ text, reply }) {
      if (!text) return reply('اكتب كلمة البحث.');
      const out = await ytdlp(['--flat-playlist', '--no-warnings', '--print', '%(title)s | %(duration_string)s | https://youtu.be/%(id)s', `ytsearch5:${text}`], 60000);
      reply('🔎 *نتائج البحث:*\n\n' + out.trim().split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n\n'));
    } },

  { name: 'معلومات_فيديو', aliases: ['vinfo'], desc: 'معلومات فيديو من رابط',
    async run({ text, reply }) {
      if (!isUrl(text)) return reply('اكتب رابط الفيديو.');
      const j = JSON.parse(await ytdlp(['--dump-single-json', '--no-playlist', '--skip-download', '--no-warnings', text], 90000));
      reply(`🎬 *${j.title}*\n\n👤 القناة: ${j.uploader || '-'}\n⏱️ المدة: ${j.duration_string || '-'}\n👁️ المشاهدات: ${money(j.view_count)}\n📅 التاريخ: ${j.upload_date || '-'}`);
    } },

  { name: 'لقطة', aliases: ['ss', 'screenshot'], desc: 'لقطة شاشة لموقع',
    async run({ text, send, reply, react }) {
      if (!isUrl(text)) return reply('اكتب رابط الموقع. مثال: /لقطة https://google.com');
      await react('⏳');
      const { buffer } = await getBuffer(`https://image.thum.io/get/width/1280/crop/800/${text}`);
      await send({ image: buffer, caption: `📸 ${text}` });
    } },
];
