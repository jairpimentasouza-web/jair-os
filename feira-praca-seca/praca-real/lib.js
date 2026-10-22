// ---------- deterministic random ----------
let seed = 7;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];

// ---------- helpers ----------
const matCache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({color, roughness: 0.8}, opts));
  return matCache[key];
}
function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// ---------- people ----------
const shirts = [0xe63946, 0xf4a261, 0x2a9d8f, 0x264653, 0xffd166, 0x118ab2, 0xef476f, 0x06d6a0, 0xffffff, 0x8338ec, 0xfb5607, 0x3a86ff, 0x2b2b2b];
const pantsC = [0x1d3557, 0x2b2b2b, 0x4a4e69, 0x6d597a, 0x3c3c3c, 0xb5a48b];
const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5c3a21, 0xa86b3c];
function person(opts = {}) {
  const g = new THREE.Group();
  const s = opts.scale || (0.92 + rnd() * 0.16);
  const shirt = opts.shirt ?? pick(shirts), pants = opts.pants ?? pick(pantsC), skin = opts.skin ?? pick(skins);
  const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.85, 6);
  const l1 = mesh(legGeo, mat(pants), -0.1, 0.425, 0); const l2 = mesh(legGeo, mat(pants), 0.1, 0.425, 0);
  const body = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.65, 8), mat(shirt), 0, 1.17, 0);
  const head = mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(skin), 0, 1.65, 0);
  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.6, 6);
  const a1 = mesh(armGeo, mat(shirt), -0.28, 1.15, 0); const a2 = mesh(armGeo, mat(shirt), 0.28, 1.15, 0);
  g.add(l1, l2, body, head, a1, a2);
  if (opts.hat) g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 10), mat(opts.hat), 0, 1.8, 0));
  g.userData = {l1, l2, a1, a2, body, head};
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

// ---------- signs & canopies ----------
function signTexture(text, bg) {
  return canvasTex(1024, 240, (g, w, h) => {
    g.fillStyle = '#5a3a1e'; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(14, 14, w - 28, h - 28);
    let size = 150;
    g.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`;
    while (g.measureText(text).width > w - 90) { size -= 6; g.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(text, w / 2, h / 2 + 8);
    g.fillStyle = '#ffffff'; g.fillText(text, w / 2, h / 2 + 8);
  });
}
function stripeTexture(c1, c2) {
  return canvasTex(256, 64, (g, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * w / n, 0, w / n, h); }
  });
}
function valanceTexture(c1, c2) {
  return canvasTex(512, 64, (g, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * w / n, 0, w / n, h * 0.6);
      g.beginPath(); g.arc(i * w / n + w / n / 2, h * 0.6, w / n / 2, 0, Math.PI); g.fill();
    }
  });
}

// ---------- animated bits ----------
const smokeTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const puffs = [];
function smokeAt(worldPos, color, count, height) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({map: smokeTex, color, transparent: true, depthWrite: false});
    const sp = new THREE.Sprite(m);
    scene.add(sp);
    puffs.push({sp, base: worldPos.clone(), off: rnd(), height, drift: (rnd() - 0.5) * 0.8});
  }
}

// ---------- stalls ----------
const palette = [
  ['#e63946', '#ffffff'], ['#ffbe0b', '#fb5607'], ['#2a9d8f', '#ffffff'], ['#3a86ff', '#ffffff'],
  ['#ff006e', '#ffd6e8'], ['#06d6a0', '#ffffff'], ['#8338ec', '#ffffff'], ['#f77f00', '#fcbf49'],
  ['#118ab2', '#ffd166'], ['#ef476f', '#ffffff'],
];
const signColors = {
  'ACARAJÉ': '#e07a00', 'ARTESANATO': '#7b2cbf', 'CHURRASCO': '#c1121f', 'CALDOS': '#2d6a4f',
  'BEBIDAS': '#0077b6', 'BOLO DE FATIA': '#d63384', 'FEIJOADA': '#3d2b1f',
};
const rowA = ['ACARAJÉ', 'ARTESANATO', 'CHURRASCO', 'CALDOS', 'BEBIDAS', 'BOLO DE FATIA', 'FEIJOADA', 'ACARAJÉ', 'BEBIDAS', 'ARTESANATO'];
const rowB = ['CHURRASCO', 'CALDOS', 'FEIJOADA', 'BOLO DE FATIA', 'BEBIDAS', 'ACARAJÉ', 'ARTESANATO', 'BEBIDAS', 'CHURRASCO', 'CALDOS'];
const vendors = [];

function products(g, kind) {
  const top = 0.97;
  if (kind === 'ACARAJÉ') {
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.22, 16), mat(0x222222, {metalness: .6}), -0.7, top + 0.11, 0.85));
    for (let i = 0; i < 10; i++) g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0xd9822b), 0.2 + (i % 5) * 0.2, top + 0.08, 0.7 + Math.floor(i / 5) * 0.2));
  } else if (kind === 'ARTESANATO') {
    const cs = [0xe63946, 0xffbe0b, 0x2a9d8f, 0x8338ec, 0xfb5607, 0x3a86ff];
    for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(0.25, 0.2 + rnd() * 0.3, 0.25), mat(cs[i % 6]), -1.3 + i * 0.37, top + 0.2, 0.85));
    g.add(mesh(new THREE.BoxGeometry(3.2, 0.05, 0.05), mat(0x5a3a1e), 0, 2.2, -1.1));
    for (let i = 0; i < 7; i++) g.add(mesh(new THREE.BoxGeometry(0.3, 0.45, 0.04), mat(cs[(i + 2) % 6]), -1.35 + i * 0.45, 1.9, -1.1));
  } else if (kind === 'CHURRASCO') {
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.3, 0.5), mat(0x1a1a1a, {metalness: .5}), -0.6, top + 0.15, 0.85));
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.03, 0.42), mat(0xff4400, {emissive: 0xff3300, emissiveIntensity: 1.2}), -0.6, top + 0.31, 0.85, false));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x7a3b1a), -1.2 + i * 0.24, top + 0.37, 0.85));
    const p = new THREE.Vector3(-0.6, top + 0.6, 0.85); g.updateMatrixWorld(); g.localToWorld(p);
    smokeAt(p, 0xdddddd, 9, 3.2);
  } else if (kind === 'CALDOS' || kind === 'FEIJOADA') {
    const potC = kind === 'CALDOS' ? 0xbfc3c7 : 0x6b3e26;
    for (let i = 0; i < 3; i++) {
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.4, 16), mat(potC, {metalness: kind === 'CALDOS' ? .7 : 0, roughness: .4}), -1 + i * 0.75, top + 0.2, 0.85));
      g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16), mat(kind === 'CALDOS' ? 0xe0a030 : 0x1c0f08), -1 + i * 0.75, top + 0.39, 0.85, false));
    }
    const p = new THREE.Vector3(-0.25, top + 0.6, 0.85); g.updateMatrixWorld(); g.localToWorld(p);
    smokeAt(p, 0xffffff, 5, 1.6);
  } else if (kind === 'BEBIDAS') {
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), mat(0x1d70b8), -0.9, top + 0.25, 0.85));
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), mat(pick([0x2d6a4f, 0x9c6644, 0xe63946, 0xffd166])), 0 + (i % 5) * 0.16, top + 0.15, 0.75 + Math.floor(i / 5) * 0.18));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(0x6a994e), 1.0 + i * 0.05, top + 0.15 + i * 0.12, 0.9 - i * 0.1));
  } else if (kind === 'BOLO DE FATIA') {
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.5, 0.55), new THREE.MeshStandardMaterial({color: 0xddeeff, transparent: true, opacity: 0.35, roughness: .1}), 0, top + 0.25, 0.85, false));
    const cakes = [0x7b3f00, 0xf5deb3, 0xffb6c1, 0x3b1f0f];
    for (let i = 0; i < 4; i++) {
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16, 1, false, 0, Math.PI * 1.6), mat(cakes[i]), -0.85 + i * 0.57, top + 0.1, 0.85));
      g.add(mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16, 1, false, 0, Math.PI * 1.6), mat(0xffffff), -0.85 + i * 0.57, top + 0.2, 0.85, false));
    }
  }
}

function stall(x, z, facing, kind, colors) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = facing;
  scene.add(g);
  const [c1, c2] = colors;
  // counter with cloth
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.95, 0.7), mat(0xe9e2d0), 0, 0.475, 0.85));
  g.add(mesh(new THREE.BoxGeometry(3.25, 0.5, 0.72), mat(new THREE.Color(c1).getHex()), 0, 0.7, 0.86));
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.8, 0.6), mat(0xcdbfa3), 0, 0.4, -0.9));
  // posts
  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.7, 8);
  for (const px of [-1.75, 1.75]) for (const pz of [-1.25, 1.3]) g.add(mesh(postGeo, mat(0xdddddd, {metalness: .5}), px, 1.35, pz));
  // canopy
  const canTex = stripeTexture(c1, c2);
  const canopy = mesh(new THREE.BoxGeometry(3.9, 0.04, 3.0), new THREE.MeshStandardMaterial({map: canTex, roughness: .9}), 0, 2.72, 0.02);
  canopy.rotation.x = 0.08; g.add(canopy);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.4), new THREE.MeshStandardMaterial({map: valanceTexture(c1, c2), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide}));
  val.position.set(0, 2.42, 1.52); g.add(val);
  // sign
  for (const sx of [-1.2, 1.2]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat(0x5a3a1e), sx, 2.85, 1.48));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.75), new THREE.MeshStandardMaterial({map: signTexture(kind, signColors[kind]), roughness: .7, emissive: 0xffffff, emissiveIntensity: 0.4}));
  sign.material.emissiveMap = sign.material.map;
  sign.position.set(0, 3.32, 1.5); sign.castShadow = true; g.add(sign);
  // sign back
  const back = mesh(new THREE.BoxGeometry(3.2, 0.75, 0.04), mat(0x5a3a1e), 0, 3.32, 1.47); g.add(back);
  products(g, kind);
  // vendor
  const v = kind === 'ACARAJÉ'
    ? person({shirt: 0xffffff, pants: 0xffffff, hat: 0xffffff})
    : person({shirt: pick([0xffffff, 0xe63946, 0x264653, 0xffd166])});
  const vp = new THREE.Vector3(rnd() * 1.2 - 0.6, 0, 0.1); g.localToWorld(vp);
  v.position.copy(vp); v.rotation.y = facing;
  vendors.push({p: v, ph: rnd() * 6});
}


// ---------- stage (palanque simples, sem telão): front faces local -x ----------
const band = [];
function makeStage(x, z, rotY, bannerText = 'FEIRA DA PRAÇA SECA') {
  const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = rotY; scene.add(st);
  const woodTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8b5a2b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#7a4e25' : '#946233'; g.fillRect(0, i * 16, w, 15); }
  }, [2, 2]);
  st.add(mesh(new THREE.BoxGeometry(4.2, 1.0, 6.4), new THREE.MeshStandardMaterial({map: woodTex, roughness: .85}), 0, 0.5, 0));
  for (let i = 0; i < 3; i++) st.add(mesh(new THREE.BoxGeometry(1.0, 0.33 * (i + 1), 0.35), mat(0x7a4e25), 1.2, 0.165 * (i + 1), 3.2 + 0.35 * (2 - i) + 0.175));
  const pGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8);
  for (const px of [-1.95, 1.95]) for (const pz of [-3.05, 3.05]) st.add(mesh(pGeo, mat(0x222222, {metalness: .4}), px, 2.6, pz));
  const roofMat = mat(0x262a33, {side: THREE.DoubleSide});
  for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(2.4, 0.05, 6.8), roofMat, s * 1.05, 4.55, 0); r.rotation.z = -s * 0.42; st.add(r); }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.6), new THREE.MeshStandardMaterial({map: canvasTex(1024, 120, (g, w, h) => {
    g.fillStyle = '#f4d35e'; g.fillRect(0, 0, w, h);
    g.font = '900 70px Inter, "DejaVu Sans", sans-serif'; g.fillStyle = '#1d3557'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(bannerText, w / 2, h / 2 + 4);
  }), side: THREE.DoubleSide}));
  banner.position.set(-2.02, 3.72, 0); banner.rotation.y = -Math.PI / 2; st.add(banner);
  for (let i = 0; i < 4; i++) st.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 10), mat(0x111111, {emissive: [0xff3366, 0xffcc00, 0x33ccff, 0xff3366][i], emissiveIntensity: 2}), -1.9, 4.05, -2.1 + i * 1.4, false));
  for (const sz of [-3.9, 3.9]) {
    st.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), mat(0x222222), -2.4, 0.8, sz));
    st.add(mesh(new THREE.BoxGeometry(0.55, 0.85, 0.55), mat(0x111111), -2.4, 1.9, sz));
  }
  function musician(mz, mx, shirt, inst) {
    const p = person({shirt}); st.add(p);
    p.position.set(mx, 1.0, mz); p.rotation.y = -Math.PI / 2;
    if (inst === 'cavaco') { const c = mesh(new THREE.BoxGeometry(0.5, 0.18, 0.1), mat(0x8b4513), 0, 1.15, 0.24); c.rotation.z = 0.5; p.add(c); }
    if (inst === 'pandeiro') { const d = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), mat(0xf1e3c6), 0.35, 1.55, 0); d.rotation.z = Math.PI / 2; p.add(d); }
    if (inst === 'surdo') st.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 16), mat(0xc0c0c0, {metalness: .7, roughness: .3}), mx - 0.5, 1.3, mz));
    if (inst === 'mic') { st.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), mat(0x222222), mx - 0.45, 1.75, mz)); st.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0x333333), mx - 0.45, 2.52, mz)); }
    if (inst === 'tantan') { const t = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12), mat(0xb22222), 0, 1.1, 0.25); t.rotation.z = Math.PI / 2.4; p.add(t); }
    band.push({p, ph: band.length * 0.7});
  }
  musician(0, -0.9, 0xffffff, 'mic');
  musician(-1.9, -0.4, 0xe63946, 'cavaco');
  musician(1.9, -0.4, 0xffd166, 'pandeiro');
  musician(-1.0, 0.9, 0x2a9d8f, 'surdo');
  musician(1.0, 0.9, 0x3a86ff, 'tantan');
  return st;
}

// crowd facing a world point, inside a ground polygon given as [x0,x1,z0,z1]
const crowd = [];
function makeCrowd(n, box, face) {
  for (let i = 0; i < n; i++) {
    const x = box[0] + rnd() * (box[1] - box[0]), z = box[2] + rnd() * (box[3] - box[2]);
    const p = person(); p.position.set(x, 0, z);
    p.rotation.y = Math.atan2(face[0] - x, face[1] - z) + (rnd() - 0.5) * 0.5;
    crowd.push({p, ph: rnd() * 6, amp: 0.05 + rnd() * 0.12, arms: rnd() < 0.25});
  }
}
const walkers = [];
// path: [[x,z],[x,z]] segment; people walk back and forth along it
function makeWalkers(n, a, b, spread) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 0; i < n; i++) {
    const p = person();
    walkers.push({p, a, b, len, dir: rnd() < 0.5 ? 1 : -1, s0: rnd() * len, off: (rnd() - 0.5) * spread, v: 0.7 + rnd() * 0.5, ph: rnd() * 6});
  }
}
const customers = [];
function makeCustomer(x, z, rotY) { const p = person(); p.position.set(x, 0, z); p.rotation.y = rotY; customers.push({p, ph: rnd() * 6}); }

const BEAT = 0.6;
function animate(t) {
  const beat = t / BEAT;
  band.forEach(({p, ph}) => {
    p.position.y = 1.0 + Math.abs(Math.sin(Math.PI * beat + ph)) * 0.07;
    p.rotation.z = Math.sin(Math.PI * beat * 0.5 + ph) * 0.05;
    p.userData.a2.rotation.x = Math.sin(Math.PI * 2 * beat + ph) * 0.6;
  });
  crowd.forEach(({p, ph, amp, arms}) => {
    p.position.y = Math.abs(Math.sin(Math.PI * beat + ph)) * amp;
    if (arms) { p.userData.a1.rotation.z = -2.6 + Math.sin(Math.PI * beat + ph) * 0.3; p.userData.a2.rotation.z = 2.6 - Math.sin(Math.PI * beat + ph) * 0.3; p.userData.a1.position.y = 1.55; p.userData.a2.position.y = 1.55; }
  });
  customers.forEach(({p, ph}) => { p.rotation.z = Math.sin(t * 1.3 + ph) * 0.03; p.userData.a2.rotation.x = Math.max(0, Math.sin(t * 0.9 + ph)) * -0.9; });
  vendors.forEach(({p, ph}) => { p.userData.a1.rotation.x = Math.sin(t * 2.2 + ph) * 0.5; });
  walkers.forEach(w => {
    let s = w.s0 + w.dir * w.v * t; s = ((s % (2 * w.len)) + 2 * w.len) % (2 * w.len);
    const fwd = s < w.len; const d = fwd ? s : 2 * w.len - s;
    const ux = (w.b[0] - w.a[0]) / w.len, uz = (w.b[1] - w.a[1]) / w.len;
    w.p.position.set(w.a[0] + ux * d - uz * w.off, 0, w.a[1] + uz * d + ux * w.off);
    w.p.rotation.y = Math.atan2(ux, uz) + (fwd ? 0 : Math.PI);
    const sw = Math.sin(t * 6 * w.v + w.ph) * 0.32;
    w.p.userData.l1.rotation.x = sw; w.p.userData.l2.rotation.x = -sw;
    w.p.userData.a1.rotation.x = -sw * 0.8; w.p.userData.a2.rotation.x = sw * 0.8;
  });
  puffs.forEach(pf => {
    const u = ((t * 0.35 + pf.off) % 1);
    pf.sp.position.set(pf.base.x + pf.drift * u, pf.base.y + u * pf.height, pf.base.z + u * 0.6);
    const s = 0.4 + u * 1.6; pf.sp.scale.set(s, s, s);
    pf.sp.material.opacity = 0.55 * Math.sin(Math.PI * u);
  });
}
