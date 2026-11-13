// Utilitários dos testes E2E: servidor estático do app, limpeza dos emuladores e login.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');
export const PASS = 'Senha-forte-123';
export const PROJECT = 'demo-profgestor';
const WEB = fileURLToPath(new URL('../../web/', import.meta.url));

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const local = (d) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
export const brl = (s) => String(s).replace(/\s/g, ' ').trim();

export function serveStatic(port) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
  return createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    try { res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(await readFile(join(WEB, path || 'index.html'))); }
    catch { res.writeHead(404).end('not found'); }
  }).listen(port, '127.0.0.1');
}

// Zera Firestore e Auth dos emuladores entre suítes (somente emulador).
export async function clearEmulators() {
  const fs = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const au = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  await fetch(`http://${fs}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${au}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

export async function eventually(fn, ms = 10000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 200)); }
  throw last || new Error('condição não atingida no servidor');
}

export function contextOptions(extra = {}) {
  return { serviceWorkers: 'block', acceptDownloads: true, proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined, ...extra };
}

export async function openApp(browser, url, errors, extra = {}) {
  const ctx = await browser.newContext(contextOptions(extra));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginForm', { state: 'visible' });
  return { ctx, page };
}

export async function login(browser, url, email, errors, { familia = false, ...extra } = {}) {
  const { ctx, page } = await openApp(browser, url, errors, extra);
  if (familia) await page.click('#personaFamilia');
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', PASS);
  await page.click('#loginButton');
  return { ctx, page };
}
