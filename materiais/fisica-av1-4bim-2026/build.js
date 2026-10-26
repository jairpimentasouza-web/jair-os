// Gera os PDFs (completo e versão sem gabarito) a partir dos HTMLs.
// Uso: node build.js
const { chromium } = require('playwright');
const path = require('path');

const series = [
  ['serie1.html', '1a-serie_trabalho-potencia-energia'],
  ['serie2.html', '2a-serie_espelhos-planos-e-esfericos'],
  ['serie3.html', '3a-serie_cinematica-e-leis-de-newton'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const only = process.argv.slice(2);
  for (const [file, name] of series) {
    if (only.length && !only.includes(file)) continue;
    await page.goto('file://' + path.join(__dirname, file));
    await page.evaluate(() => document.fonts.ready);
    for (const aluno of [false, true]) {
      await page.evaluate((a) => { document.body.classList.toggle('aluno', a); drawMindmaps(); }, aluno);
      const out = path.join(__dirname, 'pdf', `Revisao-AV1-Fisica-${name}${aluno ? '_lista-sem-gabarito' : '_completo'}.pdf`);
      await page.pdf({
        path: out, format: 'A4', printBackground: true, preferCSSPageSize: true,
        displayHeaderFooter: true, headerTemplate: '<span></span>',
        footerTemplate: '<div style="width:100%;font-size:7.5px;color:#777;text-align:center;font-family:Arial">Física · Prof. Jair Pimenta · Revisão AV1 · 4º bimestre 2026 — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
      });
      console.log('ok', path.basename(out));
    }
  }
  await browser.close();
})();
