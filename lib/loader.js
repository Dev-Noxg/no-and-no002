import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'commands');
export const commands = new Map(); // الاسم أو الاسم المستعار -> الأمر

// صلاحيات افتراضية لكل قسم
const DEFAULTS = {
  admin: { group: true, admin: true },
  groups: { group: true },
  owner: { owner: true },
};

export async function loadCommands() {
  commands.clear();
  for (const section of fs.readdirSync(dir)) {
    const sdir = path.join(dir, section);
    if (!fs.statSync(sdir).isDirectory()) continue;
    for (const file of fs.readdirSync(sdir).filter(f => f.endsWith('.js'))) {
      const imported = (await import(pathToFileURL(path.join(sdir, file)).href)).default;
      for (const mod of [].concat(imported)) {
        mod.section = section;
        for (const [k, v] of Object.entries(DEFAULTS[section] || {})) mod[k] ??= v;
        for (const n of [mod.name, ...(mod.aliases || [])]) {
          const key = n.toLowerCase();
          if (commands.has(key)) {
            console.warn(`تعارض في اسم الأمر "${n}" داخل ${file}؛ تم الإبقاء على التسجيل الأول.`);
            continue;
          }
          commands.set(key, mod);
        }
      }
    }
  }
}

export const uniqueCommands = () => [...new Set(commands.values())];
