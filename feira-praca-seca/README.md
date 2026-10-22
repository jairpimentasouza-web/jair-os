# Feira da Praça Seca — vídeo de apresentação

`feira-praca-seca.mp4` (24 s, 1280×720, com som): vista do alto da praça com 20 barracas coloridas,
passagem pelas barracas (Acarajé, Artesanato, Churrasco, Caldos, Bebidas, Bolo de fatia, Feijoada)
e palco simples, sem telão, com show de samba.

## Como regenerar

```bash
npm install three@0.160.0 playwright
node render.js 0 720 frames      # gera os 720 quadros (cena.html)
python3 trilha.py                # gera trilha.wav (samba sintetizado)
ffmpeg -framerate 30 -i frames/%04d.jpg -i trilha.wav -c:v libx264 -pix_fmt yuv420p -crf 20 \
  -c:a aac -shortest feira-praca-seca.mp4
```

Nome da feira, produtos e ordem das barracas ficam em `cena.html` (`rowA`, `rowB`, título).
