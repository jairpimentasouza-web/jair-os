const {chromium}=require('playwright');const fs=require('fs');
const photo=process.argv[2];const out=process.argv[3];
const img=photo&&fs.existsSync(photo)?`<img src="data:image/${photo.split('.').pop().replace('jpg','jpeg')};base64,${fs.readFileSync(photo).toString('base64')}" style="width:100%;height:100%;object-fit:cover;object-position:center top">`:
`<svg viewBox="0 0 100 130" style="width:100%;height:100%"><rect width="100" height="130" fill="#14506f"/><circle cx="50" cy="48" r="20" fill="#0b2a3c"/><path d="M10 130c0-34 18-50 40-50s40 16 40 50z" fill="#0b2a3c"/><text x="50" y="122" fill="#e9b44c" font-size="6" text-anchor="middle" font-family="Helvetica">SUA FOTO AQUI</text></svg>`;
const html=`<!doctype html><meta charset="utf-8"><style>
body{margin:0}.a{width:1080px;height:1350px;position:relative;overflow:hidden;background:radial-gradient(circle at 25% 15%,#14506f,#0b2a3c 60%,#071c29);color:#fff;font-family:Helvetica,Arial,sans-serif}
.tag{position:absolute;left:70px;top:70px;background:rgba(233,180,76,.15);color:#e9b44c;padding:12px 26px;border-radius:40px;font-size:26px;font-weight:700;letter-spacing:4px}
h1{position:absolute;left:70px;top:150px;width:520px;margin:0;font-family:Georgia,serif;font-size:80px;line-height:1.05}
h1 span{color:#e9b44c}
.ph{position:absolute;right:60px;top:90px;width:430px;height:560px;border-radius:30px;overflow:hidden;border:8px solid #e9b44c;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.name{position:absolute;right:60px;top:670px;width:446px;text-align:center;font-family:Georgia,serif;font-size:34px;font-weight:700}
.name small{display:block;font-family:Helvetica;font-size:22px;color:#f3dfae;letter-spacing:2px;margin-top:6px;font-weight:400}
ul{position:absolute;left:70px;top:760px;margin:0;padding:0;list-style:none;font-size:38px;line-height:1.5}
li:before{content:"✓";color:#e9b44c;font-weight:700;margin-right:18px}
.cta{position:absolute;left:70px;right:70px;bottom:70px;background:#e9b44c;color:#0b2a3c;border-radius:24px;padding:34px 20px;text-align:center;font-size:44px;font-weight:800}
.cta small{display:block;font-size:26px;font-weight:600;margin-top:8px}
</style><div class="a"><div class="tag">PROFESSOR DESDE 2014</div>
<h1>Exatas <span>sem medo</span>, com acompanhamento de verdade.</h1>
<div class="ph">${img}</div>
<div class="name">Prof. Jair Pimenta<small>MATEMÁTICA · FÍSICA · QUÍMICA</small></div>
<ul><li>Fundamental e Médio</li><li>ENEM e UERJ</li><li>ESA e EsPCEx</li><li>Online ou presencial (RJ)</li><li>Material personalizado com IA</li></ul>
<div class="cta">Chame no WhatsApp<small>link na bio</small></div></div>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1350}});
await p.setContent(html);await p.screenshot({path:out});await b.close();})();
