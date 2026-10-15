import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + here + 'business-card.html'); await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
// Print file: 3.75 x 2.25 in pages (3.5 x 2 in card + 0.125 in bleed all round).
await p.pdf({ path: here + '../Voiced-Business-Card.pdf', width: '3.75in', height: '2.25in', printBackground: true, preferCSSPageSize: true });
await b.close();
