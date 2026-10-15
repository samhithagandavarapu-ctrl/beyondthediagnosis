import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('../logos', import.meta.url));
const mark = (strong) => `<svg width="128" height="128" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#213244"/><circle cx="32" cy="32" r="31" fill="none" stroke="#8FCBF2" stroke-width="${strong ? 2.5 : 1.5}" opacity="${strong ? 0.9 : 0.55}"/><circle cx="32" cy="32" r="24" fill="none" stroke="#8FCBF2" stroke-width="1" opacity="0.4"/><path d="M20 22 L32 44 L44 22" fill="none" stroke="#FFDE9E" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const word = (c) => `<span style="font:800 88px/1 'Funnel Display';letter-spacing:-0.02em;color:${c};padding-bottom:6px">Voiced</span>`;
const V = [
  ['Voiced-Logo', 'transparent', `<div class="row">${mark(false)}${word('#213244')}</div>`],
  ['Voiced-Logo-Reversed-on-Navy', '#213244', `<div class="row">${mark(true)}${word('#F3F9FE')}</div>`],
  ['Voiced-Logo-Reversed-Transparent', 'transparent', `<div class="row">${mark(true)}${word('#F3F9FE')}</div>`],
  ['Voiced-Logo-Stacked', 'transparent', `<div class="col">${mark(false)}${word('#213244')}</div>`],
  ['Voiced-Mark', 'transparent', mark(false)],
  ['Voiced-Mark-on-Navy', '#213244', mark(true)],
];
const b = await chromium.launch();
for (const [name, bg, html] of V) {
  const p = await b.newPage();
  await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@800&display=swap"><style>
    *{margin:0;padding:0} html,body{background:${bg}}
    #w{display:inline-block;padding:32px;background:${bg}} svg{display:block}
    .row{display:flex;align-items:center;gap:26px} .col{display:flex;flex-direction:column;align-items:center;gap:14px}
  </style></head><body><div id="w">${html}</div></body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const r = await p.locator('#w').boundingBox();
  const w = Math.ceil(r.width), h = Math.ceil(r.height);
  await p.pdf({ path: `${OUT}/${name}.pdf`, width: w + 'px', height: h + 'px', printBackground: true, omitBackground: bg === 'transparent', pageRanges: '1' });
}
await b.close();
