// Gera lista.pdf a partir de lista.html: [a/b] vira fração empilhada e ^n vira expoente.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const src = fs.readFileSync(path.join(__dirname, 'lista.html'), 'utf8')
  .replace(/\[([^\[\]\/<>]+)\/([^\[\]\/<>]+)\]/g, '<span class="f"><span>$1</span><span>$2</span></span>')
  .replace(/\^(\d+)/g, '<sup>$1</sup>');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(src, { waitUntil: 'load' });
  await page.pdf({
    path: path.join(__dirname, 'Lista_N3_Matematica_Luis_601.pdf'),
    format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#64748b">Lista N3 – Matemática – Luís – 601 · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  });
  await browser.close();
})();
