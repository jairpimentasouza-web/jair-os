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

## Versão no local real (`feira-praca-seca-local.mp4`)

70 s em três tomadas sobre as fotos reais da praça (`praca-real/`):
vista do alto com as 20 barracas e o palco, nível da rua com as placas
dos produtos e o palco com show no render do projeto.

A feira em 3D é desenhada por cima de cada foto com a câmera calibrada
para ela (`calib.html` mostra a grade do chão). As máscaras `*_mask.png`
recortam o que é real e fica na frente (poste, bancos, canteiros, árvore,
pedestre), e as sombras caem sobre o chão da foto.

```bash
cd praca-real && ln -s ../node_modules node_modules
for s in A B C; do mkdir -p fr$s; node render.js $s 0 720 fr$s; done
python3 trilha70.py
ffmpeg -framerate 30 -i frA/%04d.jpg -framerate 30 -i frB/%04d.jpg -framerate 30 -i frC/%04d.jpg -i trilha70.wav \
  -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=23[ab];[ab][2]xfade=transition=fade:duration=1:offset=46,format=yuv420p[v]" \
  -map "[v]" -map 3:a -c:v libx264 -crf 20 -c:a aac -shortest feira-praca-seca-local.mp4
```
