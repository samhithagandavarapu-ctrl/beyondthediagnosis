import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + here + 'brand-kit.html'); await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1500);
await p.pdf({ path: here + '../Voiced-Brand-Kit.pdf', width: '11in', height: '8.5in', printBackground: true, preferCSSPageSize: true });
await b.close();
