// Gera banners 1000x250 para o cabeçalho das turmas no Google Sala de Aula.
const { chromium } = require('playwright');
const path = require('path');
const B = [
  ['1', '1ª Série EM', 'Trabalho, Potência e Energia', '#1f63b5', '#0e3a73', 'τ = F·d·cos θ   ·   P = τ/Δt   ·   τ<sub>R</sub> = ΔE<sub>c</sub>'],
  ['2', '2ª Série EM', 'Espelhos Planos e Esféricos', '#1f8a4c', '#0d4a28', 'i = r   ·   1/f = 1/p + 1/p\'   ·   A = −p\'/p'],
  ['3', '3ª Série EM', 'Cinemática e Leis de Newton', '#c46a0a', '#6e3a03', 'v² = v₀² + 2aΔs   ·   F<sub>R</sub> = m·a   ·   a = g·sen θ'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 250 }, deviceScaleFactor: 2 });
  for (const [k, turma, tema, c1, c2, f] of B) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;width:1000px;height:250px;overflow:hidden;font-family:Inter,Arial,sans-serif;color:#fff;
        background:linear-gradient(120deg,${c2} 0%,${c1} 60%,${c1} 100%);position:relative}
      .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:25px 25px}
      .txt{position:absolute;left:40px;top:26px;right:330px}
      .k{font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;font-weight:600}
      h1{margin:6px 0 0;font-size:22px;line-height:1.15;font-weight:700;opacity:.95}
      .s{display:none}
      .f{position:absolute;right:290px;top:104px;font-family:'Liberation Serif',serif;font-size:19px;opacity:.9;background:rgba(0,0,0,.18);padding:4px 12px;border-radius:6px}
      svg{position:absolute;right:30px;top:20px;opacity:.9}
    </style></head><body><div class="grid"></div>
    <div class="txt"><div class="k">Revisão AV1 · Física · 4º bimestre</div><h1>${tema}</h1><div class="s">${turma} · Prof. Jair Pimenta</div></div>
    <div class="f">${f}</div>
    ${k === '1' ? `<svg width="250" height="210" viewBox="0 0 250 210"><path d="M20,180 L230,180" stroke="#fff" stroke-width="4"/><rect x="70" y="110" width="80" height="70" rx="6" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="3"/><path d="M150,145 L225,95" stroke="#ffd166" stroke-width="7" stroke-linecap="round"/><path d="M225,95 L203,96 L214,114 Z" fill="#ffd166"/><text x="196" y="80" fill="#ffd166" font-size="28" font-weight="800" font-family="Arial">F</text><path d="M80,200 L200,200" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/></svg>` : ''}
    ${k === '2' ? `<svg width="250" height="210" viewBox="0 0 250 210"><line x1="10" y1="105" x2="240" y2="105" stroke="#fff" stroke-width="2"/><path d="M200,15 Q245,105 200,195" fill="none" stroke="#fff" stroke-width="7"/><line x1="40" y1="105" x2="40" y2="55" stroke="#ffd166" stroke-width="6"/><path d="M40,48 L31,64 L49,64Z" fill="#ffd166"/><polyline points="40,55 214,55 130,140" fill="none" stroke="#ffd166" stroke-width="3"/><circle cx="160" cy="105" r="5" fill="#fff"/><text x="152" y="128" fill="#fff" font-size="20" font-weight="800" font-family="Arial">F</text><circle cx="100" cy="105" r="5" fill="#fff"/><text x="92" y="96" fill="#fff" font-size="20" font-weight="800" font-family="Arial">C</text></svg>` : ''}
    ${k === '3' ? `<svg width="250" height="210" viewBox="0 0 250 210"><path d="M10,195 L240,195 L240,60 Z" fill="rgba(255,255,255,.15)" stroke="#fff" stroke-width="4"/><g transform="translate(150,120) rotate(-30)"><rect x="-28" y="-38" width="56" height="38" fill="rgba(255,255,255,.25)" stroke="#fff" stroke-width="3"/></g><path d="M140,107 L140,175" stroke="#ffd166" stroke-width="6"/><path d="M140,184 L131,168 L149,168Z" fill="#ffd166"/><text x="150" y="182" fill="#ffd166" font-size="24" font-weight="800" font-family="Arial">P</text><path d="M140,107 L112,58" stroke="#fff" stroke-width="5"/><path d="M107,50 L109,68 L124,60Z" fill="#fff"/><text x="84" y="52" fill="#fff" font-size="24" font-weight="800" font-family="Arial">N</text></svg>` : ''}
    </body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, `banner-${k}a-serie.png`);
    await page.screenshot({ path: out });
    console.log('ok', path.basename(out));
  }
  await browser.close();
})();
