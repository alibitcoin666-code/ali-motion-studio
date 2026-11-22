/**
 * Build public/course/<name>.json (+ card images) from an unpacked course folder or a .zip.
 * Usage: npx tsx scripts/build-course.ts <folder|zip> [name]
 */
import fs from 'node:fs';
import path from 'node:path';
import {unzipSync, strFromU8} from 'fflate';
import {parseCourse} from '../src/course/parse';

const src = process.argv[2];
const name = process.argv[3] || 'pianova';
if (!src) throw new Error('usage: build-course <folder|zip> [name]');
const files: Record<string, string> = {};
const imgs: Record<string, Uint8Array> = {};
const take = (rel: string, data: Uint8Array) => {
  if (/__MACOSX|__pycache__|\/fonts\//.test(rel)) return;
  if (/\.(md|txt|csv|ya?ml)$/i.test(rel)) files[rel] = strFromU8(data);
  else if (/\.(png|jpe?g|webp)$/i.test(rel) && /_card\./.test(rel)) imgs[path.basename(rel)] = data;
};
if (src.endsWith('.zip')) {
  const z = unzipSync(new Uint8Array(fs.readFileSync(src)));
  for (const [k, v] of Object.entries(z)) if (!k.endsWith('/')) take(k, v);
} else {
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else take(path.relative(src, p), new Uint8Array(fs.readFileSync(p)));
    }
  };
  walk(src);
}
const outDir = path.join('public', 'course', name);
fs.mkdirSync(outDir, {recursive: true});
const images: Record<string, string> = {};
for (const [n, d] of Object.entries(imgs)) {
  fs.writeFileSync(path.join(outDir, n), d);
  images[n] = `course/${name}/${n}`;
}
const course = parseCourse(files, images);
fs.writeFileSync(path.join('public', 'course', `${name}.json`), JSON.stringify(course));
console.log(`lessons=${course.lessons.length} curiosity=${course.curiosity.length} friday=${course.friday.length} calendar=${course.calendar.length} images=${Object.keys(images).length}`);
const l = course.lessons[0];
console.log(JSON.stringify({title: l.title, dateFa: l.dateFa, dateG: l.dateG, time: l.time, seg: l.narration.length, motion: l.motion.length, quiz: l.quiz, ex: l.exercise, succ: l.success}, null, 1));
