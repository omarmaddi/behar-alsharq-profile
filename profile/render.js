// Renders index.html (1080×1080 square) to PDF, plus JPEG previews of each page.
// Usage: node render.js [--png]
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(__dirname, 'Bahar-Al-Sharq-Profile-2026.pdf'), printBackground: true, preferCSSPageSize: true });
  if (process.argv.includes('--png')) {
    const dir = path.join(__dirname, 'preview'); fs.mkdirSync(dir, { recursive: true });
    const pages = await page.$$('.page');
    for (let i = 0; i < pages.length; i++)
      await pages[i].screenshot({ path: path.join(dir, `page-${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 82 });
  }
  await browser.close();
})();
