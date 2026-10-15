#!/usr/bin/env node
// Baixa capítulos de um livro digital da Poliedro (livro-digital.p4ed.com) com a conta do professor.
//
// Uso: node poliedro_livro.js <id-do-livro> <pasta-de-saída> [filtro ...] [--tudo]
//   id-do-livro: o parâmetro b= do link do visualizador (…/visualizador/pdf?b=<id>)
//   filtro: trecho do título do capítulo ou material ("Magnetismo", "Gabarito", "Manual").
//   Sem filtro: só lista capítulos e materiais em <pasta>/livro.json. --tudo baixa todos.
//
// O visualizador entrega um PDF por capítulo (pmaislivrodigitalfiles.p4ed.com/livros/<arquivo>.pdf),
// descrito pela API do leitor (/livro-digital/leitor/bff/book/pdf/<id>). Os arquivos exigem a
// autorização temporária (SAS) que o visualizador anexa ao abrir um capítulo; o robô reaproveita a
// mesma autorização da sessão para os demais capítulos, sem imprimi-la nem gravá-la.
//
// Credenciais: variável de ambiente POLIEDRO_ACESSO="usuário:senha" (ou POLIEDRO_LOGIN e POLIEDRO_SENHA),
// cadastrada nas variáveis do ambiente cloud. Os valores nunca são impressos nem gravados.
//
// Saída (stdout, JSON): {ok, livro, serie, itens, baixados} ou {ok:false, codigo, erro}.
// Códigos de saída: 0 ok · 2 credenciais ausentes · 3 login recusado · 4 verificação extra
// (código/captcha) · 5 livro não carregou · 6 nenhum item corresponde ao filtro · 1 outro erro.
const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VISUALIZADOR = 'https://livro-digital.p4ed.com/visualizador/pdf?b=';
const ARQUIVOS = 'https://pmaislivrodigitalfiles.p4ed.com/livros/';
const HOST_LOGIN = 'poliedro-api.p4ed.com';
const API_LIVRO = '/livro-digital/leitor/bff/book/pdf/';

function sair(codigo, erro, extra = {}) {
  console.log(JSON.stringify({ ok: codigo === 0, codigo, erro, ...extra }, null, 2));
  process.exit(codigo);
}

function credenciais() {
  // Uma variável só (POLIEDRO_ACESSO="usuário:senha") ou as duas separadas.
  const acesso = process.env.POLIEDRO_ACESSO || '';
  const corte = acesso.indexOf(':');
  if (corte > 0) return [acesso.slice(0, corte).trim(), acesso.slice(corte + 1)];
  return [process.env.POLIEDRO_LOGIN, process.env.POLIEDRO_SENHA];
}

const naLogin = page => new URL(page.url()).host.startsWith(HOST_LOGIN);

async function entrar(page) {
  const [login, senha] = credenciais();
  if (!login || !senha) sair(2, 'defina POLIEDRO_ACESSO="usuário:senha" nas variáveis do ambiente cloud');

  await page.waitForSelector('#kc-form-login', { timeout: 30000 });
  // O tema "poliedro-password-only" só mostra a senha; o usuário vem do portal P+ num campo
  // oculto. O Keycloak aceita o parâmetro padrão login_hint para preenchê-lo.
  const usuario = page.locator('#kc-form-login input[name=username]');
  if (!(await usuario.inputValue().catch(() => ''))) {
    const auth = new URL(page.url());
    auth.searchParams.set('login_hint', login);
    await page.goto(auth.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#kc-form-login', { timeout: 30000 });
    if ((await usuario.inputValue().catch(() => '')) !== login) sair(3, 'o formulário da Poliedro não aceitou o usuário (login_hint)');
  }
  await page.waitForSelector('#password', { state: 'visible', timeout: 30000 });
  await page.fill('#password', senha);
  await Promise.all([
    page.waitForURL(u => !u.host.startsWith(HOST_LOGIN), { timeout: 45000 }).catch(() => null),
    page.click('#kc-login'),
  ]);
  if (naLogin(page)) {
    if (await page.$('input[name=otp], input[name=totp], iframe[src*="captcha"]')) sair(4, 'a Poliedro pediu verificação extra (código ou captcha)');
    sair(3, 'a Poliedro recusou o login (usuário ou senha)');
  }
}

function itensDoLivro(livro) {
  const capitulos = (livro.pdfChapters || []).map(c => ({
    tipo: 'capitulo', ordem: c.order, rotulo: `${c.front} – ${c.label}`, titulo: c.chapterTitle,
    paginas: c.numberOfPages, oculto: !!c.invisible, arquivo: ((c.blobs || [])[0] || {}).link,
  }));
  const materiais = [...(livro.extraMaterials || []), ...(livro.teacherExtraMaterials || [])].map(m => ({
    tipo: 'material', ordem: m.order, rotulo: 'Material', titulo: m.materialTitle,
    paginas: m.numberOfPages, arquivo: ((m.blobs || [])[0] || {}).teacherLink || ((m.blobs || [])[0] || {}).link,
  }));
  return [...capitulos, ...materiais].filter(i => i.arquivo);
}

const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').toLowerCase();

(async () => {
  const args = process.argv.slice(2);
  const [livroId, pasta] = args.filter(a => !a.startsWith('--')).slice(0, 2);
  const filtros = args.filter(a => !a.startsWith('--')).slice(2).map(f => f.toLowerCase());
  const tudo = args.includes('--tudo');
  if (!livroId || !pasta) sair(1, 'uso: node poliedro_livro.js <id-do-livro> <pasta-de-saída> [filtro ...] [--tudo]');
  fs.mkdirSync(pasta, { recursive: true });
  const sessao = path.join(pasta, '.sessao-poliedro.json');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
    ...(fs.existsSync(sessao) ? { storageState: sessao } : {}),
  });
  const page = await context.newPage();
  let livro = null;
  let autorizacao = null;  // query SAS que o visualizador usa nos PDFs
  page.on('response', async r => {
    if (!livro && r.url().includes(API_LIVRO + livroId)) { try { livro = await r.json(); } catch {} }
  });
  page.on('request', req => {
    const u = new URL(req.url());
    if (!autorizacao && u.href.startsWith(ARQUIVOS) && u.searchParams.has('sig')) autorizacao = u.search;
  });

  try {
    const abrir = () => page.goto(VISUALIZADOR + encodeURIComponent(livroId), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await abrir();
    // O visualizador só redireciona para o login depois de carregar o JavaScript; após o login a
    // Poliedro manda para a página inicial, então o livro é reaberto.
    for (let i = 0; i < 30 && !livro && !naLogin(page); i++) await page.waitForTimeout(1000);
    if (!livro && naLogin(page)) {
      await entrar(page);
      await page.waitForTimeout(3000);
      await abrir();
    }
    for (let i = 0; i < 60 && !livro; i++) await page.waitForTimeout(1000);
    if (!livro) sair(5, 'o visualizador não carregou a descrição do livro em 1 min');
    await context.storageState({ path: sessao });
    for (let i = 0; i < 60 && !autorizacao; i++) await page.waitForTimeout(1000);

    const itens = itensDoLivro(livro);
    fs.writeFileSync(path.join(pasta, 'livro.json'), JSON.stringify({
      id: livroId, nome: livro.changedBookName || livro.defaultBookName, serie: livro.bookGrade,
      segmento: livro.bookSegment, edicao: (livro.edition || {}).label, itens,
    }, null, 2));

    const escolhidos = tudo ? itens : itens.filter(i => filtros.some(f => i.titulo.toLowerCase().includes(f)));
    if (filtros.length && !escolhidos.length) sair(6, `nenhum capítulo ou material contém: ${filtros.join(', ')}`, { itens: itens.map(i => i.titulo) });

    if (escolhidos.length && !autorizacao) sair(5, 'o visualizador não abriu nenhum capítulo (sem autorização de download)');
    const baixados = [];
    for (const item of escolhidos) {
      const resposta = await context.request.get(ARQUIVOS + encodeURIComponent(item.arquivo) + autorizacao, {
        timeout: 180000,
        headers: { origin: 'https://livro-digital.p4ed.com', referer: 'https://livro-digital.p4ed.com/' },
      });
      if (!resposta.ok()) sair(5, `download de "${item.titulo}" respondeu HTTP ${resposta.status()}`);
      const dados = await resposta.body();
      if (dados.subarray(0, 5).toString() !== '%PDF-') sair(5, `o arquivo de "${item.titulo}" não é um PDF`);
      const destino = path.join(pasta, `${String(item.ordem).padStart(2, '0')}_${slug(item.titulo)}.pdf`);
      fs.writeFileSync(destino, dados);
      baixados.push({ titulo: item.titulo, rotulo: item.rotulo, paginas: item.paginas, pdf: destino, bytes: dados.length,
                      sha256: crypto.createHash('sha256').update(dados).digest('hex') });
    }
    sair(0, null, {
      livro: livro.changedBookName || livro.defaultBookName, serie: livro.bookGrade,
      itens: itens.map(i => `${i.ordem}. ${i.rotulo} · ${i.titulo} (${i.paginas} p.)`), baixados,
    });
  } catch (e) {
    sair(1, e.message.split('\n')[0]);
  } finally {
    await browser.close().catch(() => {});
  }
})();
