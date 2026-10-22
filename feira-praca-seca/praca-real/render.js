const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [shot, start, end, outDir, fps = 30] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`file://${path.resolve(__dirname, 'shot.html')}?shot=${shot}`, { timeout: 180000 });
  await p.waitForFunction(() => window.ready && window.ready(), null, { timeout: 180000 });
  for (let f = +start; f < +end; f++) {
    await p.evaluate(t => window.renderAt(t), f / fps);
    await p.screenshot({ path: `${outDir}/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
