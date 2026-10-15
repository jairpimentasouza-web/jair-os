#!/usr/bin/env node
// Baixa o PDF de um livro digital da Poliedro (livro-digital.p4ed.com) com a conta do professor.
//
// Uso: node poliedro_livro.js <id-do-livro> <pasta-de-saída>
//   id-do-livro: o parâmetro b= do link do visualizador (…/visualizador/pdf?b=<id>)
//
// Credenciais: variável de ambiente POLIEDRO_ACESSO="usuário:senha" (ou POLIEDRO_LOGIN e POLIEDRO_SENHA),
// cadastrada nas variáveis do ambiente cloud. Os valores nunca são impressos nem gravados; só a sessão do navegador (cookies) fica em
// <pasta-de-saída>/.sessao-poliedro.json para reaproveitar o login nas próximas execuções.
//
// Saída (stdout, JSON): {ok, pdf, bytes, sha256} ou {ok:false, codigo, erro}.
// Códigos de saída: 0 ok · 2 credenciais ausentes · 3 login recusado · 4 verificação extra
// (código/captcha) · 5 PDF não encontrado · 1 outro erro.
const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VISUALIZADOR = 'https://livro-digital.p4ed.com/visualizador/pdf?b=';
const HOST_LOGIN = 'poliedro-api.p4ed.com';
const HOST_ARQUIVOS = 'pmaislivrodigitalfiles.p4ed.com';

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

async function entrar(page) {
  const [login, senha] = credenciais();
  if (!login || !senha) sair(2, 'defina POLIEDRO_ACESSO="usuário:senha" nas variáveis do ambiente cloud');

  await page.waitForSelector('#kc-form-login', { timeout: 30000 });
  // Etapa 1: usuário. O tema "poliedro-password-only" só mostra a senha; o usuário vem do portal P+
  // num campo oculto. O Keycloak aceita o parâmetro padrão login_hint para preenchê-lo.
  const usuario = page.locator('#kc-form-login input[name=username]');
  if (!(await usuario.inputValue().catch(() => ''))) {
    const auth = new URL(page.url());
    auth.searchParams.set('login_hint', login);
    await page.goto(auth.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#kc-form-login', { timeout: 30000 });
    if ((await usuario.inputValue().catch(() => '')) !== login) sair(3, 'o formulário da Poliedro não aceitou o usuário (login_hint)');
  }
  // Etapa 2: senha.
  await page.waitForSelector('#password', { state: 'visible', timeout: 30000 });
  await page.fill('#password', senha);
  await Promise.all([
    page.waitForURL(u => !u.host.startsWith(HOST_LOGIN), { timeout: 45000 }).catch(() => null),
    page.click('#kc-login'),
  ]);
  if (new URL(page.url()).host.startsWith(HOST_LOGIN)) {
    if (await page.$('input[name=otp], input[name=totp], iframe[src*="captcha"]')) sair(4, 'a Poliedro pediu verificação extra (código ou captcha)');
    sair(3, 'a Poliedro recusou o login (usuário ou senha)');
  }
}

(async () => {
  const [livro, pasta] = process.argv.slice(2);
  if (!livro || !pasta) sair(1, 'uso: node poliedro_livro.js <id-do-livro> <pasta-de-saída>');
  fs.mkdirSync(pasta, { recursive: true });
  const sessao = path.join(pasta, '.sessao-poliedro.json');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
    ...(fs.existsSync(sessao) ? { storageState: sessao } : {}),
  });
  const page = await context.newPage();

  let urlPdf = null;
  page.on('response', r => {
    const u = r.url();
    const tipo = (r.headers()['content-type'] || '').toLowerCase();
    if (!urlPdf && (tipo.includes('application/pdf') || (u.includes(HOST_ARQUIVOS) && /\.pdf(\?|$)/i.test(u)))) urlPdf = u;
  });

  try {
    await page.goto(VISUALIZADOR + encodeURIComponent(livro), { waitUntil: 'domcontentloaded', timeout: 60000 });
    // O visualizador só redireciona para o login depois de carregar o JavaScript.
    let tentouLogin = false;
    for (let i = 0; i < 120 && !urlPdf; i++) {
      if (!tentouLogin && new URL(page.url()).host.startsWith(HOST_LOGIN)) {
        tentouLogin = true;
        await entrar(page);
      }
      await page.waitForTimeout(1000);
    }
    if (!urlPdf) sair(5, 'o visualizador abriu, mas nenhum PDF foi carregado em 2 min');

    // O visualizador pode pedir o PDF em pedaços (Range); baixa o arquivo inteiro com a mesma sessão.
    const resposta = await context.request.get(urlPdf, { timeout: 180000 });
    if (!resposta.ok()) sair(5, `download do PDF respondeu HTTP ${resposta.status()}`);
    const dados = await resposta.body();
    if (dados.subarray(0, 5).toString() !== '%PDF-') sair(5, 'o arquivo baixado não é um PDF');

    const destino = path.join(pasta, `poliedro_${livro}.pdf`);
    fs.writeFileSync(destino, dados);
    await context.storageState({ path: sessao });
    sair(0, null, {
      pdf: destino,
      bytes: dados.length,
      sha256: crypto.createHash('sha256').update(dados).digest('hex'),
      origem: new URL(urlPdf).host,
    });
  } catch (e) {
    sair(1, e.message.split('\n')[0]);
  } finally {
    await browser.close().catch(() => {});
  }
})();
