const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [img, w, h, fov, ch, pitch, roll, yaw, poles, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.goto(`file://${path.resolve('calib.html')}?img=${img}&w=${w}&h=${h}&fov=${fov}&ch=${ch}&pitch=${pitch}&roll=${roll}&yaw=${yaw}&poles=${encodeURIComponent(poles)}`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: out }); await b.close();
})();
