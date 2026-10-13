// Offline renderer: steps the scene frame by frame in headless Chromium and saves PNGs.
// usage: node render.js --out frames --fps 30 [--w 1920 --h 960] [--from 0 --to 24] [--times 1,5,9]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const W = +(args.w || 1920), H = +(args.h || 960), FPS = +(args.fps || 30);
const OUT = path.resolve(args.out || 'frames');
const SHARD = +(args.shard || 0), SHARDS = +(args.shards || 1);
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/index.html?w=${W}&h=${H}`);
  await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 120000 });

  let frames;
  if (args.times) frames = args.times.split(',').map((t, i) => ({ t: +t, name: `t_${(+t).toFixed(2)}` }));
  else {
    const from = +(args.from || 0), to = +(args.to || (await page.evaluate(() => window.DURATION)));
    const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
    frames = [];
    for (let n = n0; n < n1; n++) if (n % SHARDS === SHARD) frames.push({ t: n / FPS, name: String(n).padStart(5, '0') });
  }
  const t0 = Date.now();
  for (const [k, f] of frames.entries()) {
    const file = path.join(OUT, f.name + '.png');
    if (!args.times && fs.existsSync(file)) continue;
    await page.evaluate((t) => window.renderAt(t), f.t);
    await page.screenshot({ path: file });
    if (k % 20 === 0) console.log(`shard ${SHARD}: ${k + 1}/${frames.length} t=${f.t.toFixed(2)} ${((Date.now() - t0) / (k + 1)).toFixed(0)}ms/frame`);
  }
  await browser.close();
  server.close();
})();
