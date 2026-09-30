// Renders index.html to a PDF (1920x1080 per page) and PNG previews of each page.
// Usage: node render.js [--png]
const path = require('path');
const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(__dirname, 'Bahar-Al-Sharq-Profile-2026.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  if (process.argv.includes('--png')) {
    const fs = require('fs'); fs.mkdirSync(path.join(__dirname, 'preview'), { recursive: true });
    await page.addStyleTag({ content: 'body{background:#222}.page{margin:0}' });
    const pages = await page.$$('.page');
    for (let i = 0; i < pages.length; i++)
      await pages[i].screenshot({ path: path.join(__dirname, 'preview', `page-${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 });
  }
  await browser.close();
})();
