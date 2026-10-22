const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [start, end, outDir] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve('cena.html'));
  await p.waitForFunction(() => window.renderAt);
  if (errs.length) console.log('ERR', errs);
  for (let f = start; f < end; f++) {
    await p.evaluate(t => window.renderAt(t), f / 30);
    await p.screenshot({ path: `${outDir}/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
