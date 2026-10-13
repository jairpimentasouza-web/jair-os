import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// IROS/Legacy: only read existing rendered page metadata; never navigate or export cookies.
const ALLOWED_HOST = 'siga01.activesoft.com.br';
const CDP_LIST = 'http://127.0.0.1:9222/json/list';
const ATTEST_TTL_MS = 5 * 60_000;
const MAX_BODY = 1024;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ITEMS = 30;
const ATTESTATIONS = new Map();
const JOB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusExpr = `(() => {
  const u = new URL(location.href);
  const controls = Array.from(document.querySelectorAll('a[href],button,[role="button"]'));
  const logout = controls.some(el => /(?:sair|logout|encerrar sess[aã]o|sign\\s*out)/i.test(
    ((el.textContent||'').trim().slice(0,80))+' '+(el.getAttribute('href')||'').slice(0,120)));
  const hasPassword = !!document.querySelector('input[type="password"]');
  const teacher = /\\b(professor|professora|docente)\\b/i.test((document.body?.innerText||'').slice(0,12000));
  return {host:u.hostname, path:u.pathname.slice(0,180), logout, hasPassword, teacher};
})()`;

const classesExpr = `(() => {
  const items = [];
  const re = /(?:turma|[1-3]\\s*[º°oª]?\\s*(?:ano|s[eé]rie|em|ensino)|ensino m[eé]dio)/i;
  const pii = /(?:[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}|(?:\\d[ .-]?){8,})/;
  const norm = s => (s||'').replace(/\\s+/g,' ').trim();
  for (const el of Array.from(document.querySelectorAll('a[href],button,[role="link"]')).slice(0,250)) {
    const txt = norm(el.textContent);
    if (!txt || txt.length>90 || !re.test(txt) || pii.test(txt)) continue;
    if (!items.includes(txt)) items.push(txt);
    if (items.length>=30) break;
  }
  return {items};
})()`;

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function httpError(code, message) {
  const err = new Error(message);
  err.status = code;
  return err;
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'",
  });
  res.end(body);
}

async function readBody(req) {
  let size = 0;
  const parts = [];
  for await (const b of req) {
    size += b.length;
    if (size > MAX_BODY) throw httpError(413, 'body_too_large');
    parts.push(b);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw httpError(400, 'invalid_json'); }
}

export async function readCDP(expression, options = {}) {
  const httpFetch = options.fetch || fetch;
  const WS = options.WebSocket || WebSocket;
  const response = await httpFetch(CDP_LIST, {signal: AbortSignal.timeout(3000)});
  if (!response.ok) throw httpError(503, 'cdp_unavailable');
  const targets = await response.json();
  const tabs = targets.filter(t => {
    try {
      const u = new URL(t.url);
      return t.type === 'page' && u.protocol === 'https:' && u.hostname === ALLOWED_HOST &&
        typeof t.webSocketDebuggerUrl === 'string' && t.webSocketDebuggerUrl.startsWith('ws://127.0.0.1:9222/');
    } catch { return false; }
  });
  if (tabs.length === 0) throw httpError(503, 'school_tab_unavailable');
  if (tabs.length > 1) throw httpError(409, 'multiple_school_tabs_close_duplicates');
  const target = tabs[0];
  const snapshot = await new Promise((resolve, reject) => {
    const socket = new WS(target.webSocketDebuggerUrl);
    let settled = false;
    const timeout = setTimeout(() => finish(httpError(504, 'cdp_timeout')), 5000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { socket.close(); } catch {}
      if (error) reject(error); else resolve(value);
    }
    socket.addEventListener('open', () => socket.send(JSON.stringify({id:42,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:false,includeCommandLineAPI:false}})));
    socket.addEventListener('error', () => finish(httpError(503,'cdp_socket_error')));
    socket.addEventListener('close', () => finish(httpError(503,'cdp_closed')));
    socket.addEventListener('message', event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.id !== 42) return;
      if (data.error || data.result?.exceptionDetails) return finish(httpError(502,'cdp_evaluate_error'));
      finish(null,{targetId:target.id, value:data.result?.result?.value});
    });
  });
  if (!snapshot.value || typeof snapshot.value !== 'object') throw httpError(502,'unexpected_browser_result');
  return snapshot;
}

function safeClassLabel(input) {
  if (typeof input !== 'string') return null;
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length > 90) return null;
  // Return only the class/year token, not the rest of a UI label (which could contain a student name).
  const year = text.match(/\b([1-3]\s*[º°oª]?\s*(?:ano|s[eé]rie|em|ensino m[eé]dio))\b/i);
  if (year) return year[1].replace(/\s+/g, ' ').slice(0,35);
  const classCode = text.match(/\b(turma\s+(?:[A-F]|[0-9]{1,2}))(?![A-Za-z0-9])/i);
  return classCode ? classCode[1].replace(/\s+/g, ' ').slice(0,24) : null;
}

function verifyState(info) {
  return info && info.host === ALLOWED_HOST &&
    typeof info.path === 'string' && !/^\/login\/?$/.test(info.path) &&
    info.logout === true && info.hasPassword === false;
}

export function makeHandler({token, enabled = false, browserRead = readCDP, now = () => Date.now(), attestations = ATTESTATIONS} = {}) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('IROS_READ_TOKEN_required_minimum_32');
  return async (req, res) => {
    let jobId = null;
    try {
      if (!constantTimeEqual(req.headers['x-iros-read-token'],token)) throw httpError(401,'unauthorized');
      if (req.method === 'GET' && req.url === '/health') return json(res,200,{service:'iros-activesoft-read',enabled,private:true,schoolWrites:false});
      if (req.method !== 'POST' || req.url !== '/v1/read') throw httpError(404,'not_found');
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw httpError(415,'json_required');
      jobId = req.headers['x-iros-job-id'];
      if (typeof jobId !== 'string' || !JOB_RE.test(jobId)) throw httpError(400,'governed_job_id_required');
      const input = await readBody(req);
      if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.operation !== 'string') throw httpError(400,'invalid_request');
      if (!['session.status','classes.read'].includes(input.operation)) throw httpError(403,'operation_not_allowed');
      if (!enabled) throw httpError(423,'school_read_not_approved');
      if (input.operation === 'session.status') {
        if (Object.keys(input).some(k=>k!=='operation')) throw httpError(400,'unknown_argument');
        const state = await browserRead(statusExpr);
        const verified = verifyState(state.value);
        // Teacher-role is a signal, not a verified teacher authorization.
        const roleSignal = state.value?.teacher === true;
        let attestation = null;
        if (verified && roleSignal) {
          attestation = crypto.randomUUID();
          attestations.set(attestation,{expires:now()+ATTEST_TTL_MS,targetId:state.targetId});
        }
        console.log(JSON.stringify({event:'status',job_id:jobId,session_heuristic:verified,teacher_role_signal:roleSignal}));
        return json(res,200,{kind:'session.status',observed_at:new Date(now()).toISOString(),verified:false,sessionHeuristic:verified,teacherRoleSignal:roleSignal,session_attestation_id:attestation,teacherRoleVerified:false,studentDataReturned:false,writesAllowed:false});
      }
      if (Object.keys(input).some(k=>!['operation','session_attestation_id'].includes(k))) throw httpError(400,'unknown_argument');
      const att = typeof input.session_attestation_id==='string'?attestations.get(input.session_attestation_id):null;
      if (!att || att.expires<=now()) throw httpError(403,'attestation_missing_or_expired');
      const check = await browserRead(statusExpr);
      if (!verifyState(check.value) || check.value?.teacher!==true || check.targetId!==att.targetId) throw httpError(412,'school_session_changed');
      const current = await browserRead(classesExpr);
      if (current.targetId!==att.targetId) throw httpError(412,'school_tab_changed');
      const items = [...new Set((Array.isArray(current.value?.items)?current.value.items:[]).map(safeClassLabel).filter(Boolean))].slice(0,MAX_ITEMS);
      // No student rows, identifiers, URLs, cookies, forms, or arbitrary text are returned.
      console.log(JSON.stringify({event:'classes.read',job_id:jobId,detected:items.length}));
      return json(res,200,{kind:'classes.read',verified:false,status:items.length?'teacher_UI_candidate_labels':'dom_mapping_required',observed_at:new Date(now()).toISOString(),count:items.length,items:items.map(label=>({label})),studentDataReturned:false,writesAllowed:false});
    } catch (err) {
      const status = err.status || 500;
      const safe = [400,401,403,404,409,412,413,415,423,502,503,504].includes(status) ? err.message : 'internal_error';
      console.log(JSON.stringify({event:'adapter_rejected',job_id:JOB_RE.test(jobId||'')?jobId:null,status,reason:safe}));
      return json(res,status,{error:safe,schoolWrites:false});
    }
  };
}

export function start() {
  const token = process.env.IROS_READ_TOKEN || '';
  const enabled = process.env.IROS_READ_ENABLED === 'true';
  const port = Number(process.env.IROS_READ_PORT || 8787);
  const handler = makeHandler({token,enabled});
  const server = http.createServer(handler);
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = 10000;
  
server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({
    event: 'iros_read_adapter_ready',
    port,
    enabled,
    schoolWrites: false
  }));
});

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) start();
