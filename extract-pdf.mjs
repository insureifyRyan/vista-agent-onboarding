import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';

const data = new Uint8Array(readFileSync(process.argv[2]));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
console.log(`pages: ${doc.numPages}\n`);

for (let p = 1; p <= doc.numPages; p += 1) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  // Rebuild lines by y position so wording stays readable
  const rows = new Map();
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x: item.transform[4], s: item.str });
  }
  const lines = [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((q) => q.s).join('').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  console.log(`\n=========== PAGE ${p} ===========`);
  console.log(lines.join('\n'));
}
