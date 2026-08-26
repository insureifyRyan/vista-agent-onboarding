/**
 * Export the ad creatives from the design handoff at true pixel size.
 *
 *   node --experimental-strip-types scripts/export-ads.mts
 *
 * Renders design_handoff_agent_signup/AgentSignupAds.dc.html in Chromium, strips
 * the gallery chrome, un-scales each canvas and screenshots it. P1 is skipped —
 * it holds an empty image slot and is excluded from the launch set until a photo
 * is supplied.
 *
 * Fonts: the handoff pulls Montserrat and Source Sans 3 from Google Fonts, which
 * is all a normal machine needs. If ads/fonts/ contains the woff2 files, they are
 * injected instead — for building somewhere with no access to fonts.googleapis.com.
 * Without either, the export falls back to a system face and is NOT usable.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'design_handoff_agent_signup', 'AgentSignupAds.dc.html');
const OUT = join(ROOT, 'ads');
const FONT_DIR = join(OUT, 'fonts');

/** Held back from the launch set. */
const EXCLUDED = new Set(['P1']);

function localFontCss(): string {
  if (!existsSync(FONT_DIR)) return '';
  return readdirSync(FONT_DIR)
    .filter((file) => file.endsWith('.woff2'))
    .map((file) => {
      const weight = /-(\d{3})-/.exec(file)?.[1] ?? '400';
      const family = file.startsWith('montserrat') ? 'Montserrat' : 'Source Sans 3';
      return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url("file://${join(FONT_DIR, file)}") format("woff2");}`;
    })
    .join('\n');
}

/** Every ad canvas is a div with an explicit 1080px width, scaled down for the gallery. */
const COLLECT = () => {
  const LABEL = /^([ABSRVP]\d)\s*[·—-]\s*(.+)$/;
  const frames: { index: number; width: number; height: number; id: string | null; label: string | null }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    const el = node as Element;
    const style = el.getAttribute?.('style') ?? '';
    if (/width:\s*1080px/.test(style)) {
      const height = Number(/height:\s*(\d+)px/.exec(style)?.[1] ?? 0);
      frames.push({ index: frames.length, width: 1080, height, id: null, label: null });
    } else if (el.children?.length === 0 && frames.length) {
      const match = LABEL.exec((el.textContent ?? '').trim());
      const current = frames[frames.length - 1];
      if (match && !current.id) {
        current.id = match[1];
        current.label = (el.textContent ?? '').trim();
      }
    }
    node = walker.nextNode();
  }
  return frames;
};

/** Pull one canvas out of the gallery, un-scaled, alone on the page. */
const ISOLATE = (index: number) => {
  const canvases = [...document.querySelectorAll('div')].filter((d) =>
    /width:\s*1080px/.test(d.getAttribute('style') ?? ''),
  );
  const el = canvases[index];
  if (!el) return false;
  document.body.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => document.head.appendChild(n));
  el.style.transform = 'none';
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.left = '0';
  document.body.appendChild(el);
  [...document.body.children].forEach((child) => { if (child !== el) child.remove(); });
  document.body.setAttribute('style', 'margin:0;padding:0;background:#ffffff');
  document.documentElement.setAttribute('style', 'margin:0;padding:0');
  return true;
};

mkdirSync(OUT, { recursive: true });
const fontCss = localFontCss();
console.log(fontCss ? 'using local fonts from ads/fonts' : 'using Google Fonts (needs network)');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });

async function load(): Promise<void> {
  await page.goto(`file://${SOURCE}`, { waitUntil: 'load' });
  if (fontCss) await page.addStyleTag({ content: fontCss });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

await load();
const frames = await page.evaluate(COLLECT);
console.log(`${frames.length} canvases found`);

const exported: { id: string; width: number; height: number; label: string; file: string }[] = [];

for (const frame of frames) {
  if (!frame.id) continue;
  if (EXCLUDED.has(frame.id)) {
    console.log(`skip ${frame.id} — empty image slot, excluded from the launch set`);
    continue;
  }

  await load();
  if (!(await page.evaluate(ISOLATE, frame.index))) continue;
  await page.setViewportSize({ width: frame.width, height: Math.min(frame.height, 4000) });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({
    path: join(OUT, `${frame.id}.png`),
    clip: { x: 0, y: 0, width: frame.width, height: frame.height },
  });

  exported.push({
    id: frame.id,
    width: frame.width,
    height: frame.height,
    label: frame.label ?? '',
    file: `${frame.id}.png`,
  });
  console.log(`exported ${frame.id}  ${frame.width}×${frame.height}`);
}

writeFileSync(join(OUT, 'frames.json'), JSON.stringify(exported, null, 2) + '\n');
await browser.close();
console.log(`\n${exported.length} creatives written to ads/`);
