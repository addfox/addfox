import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
});

await page.goto('file://' + join(__dirname, 'gen-architecture.html'));
await page.waitForTimeout(500);

await page.screenshot({
  path: join(__dirname, '..', 'addfox-architecture-v2.png'),
  fullPage: false,
  type: 'png',
});

await browser.close();
console.log('Screenshot saved to addfox-architecture-v2.png');
