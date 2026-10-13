/** IROS probe: read-only, sanitized, no credentials, no side effects. Node 20+. */
import {pathToFileURL} from "node:url";
const safeName=/^[a-z][a-z0-9_-]{1,62}$/i;
export function validate(t) {
  if (!t || !safeName.test(t.name||"")) throw Error("invalid name");
  const u=new URL(t.url);
  if(u.username||u.password||u.search||u.hash) throw Error("secret or query in URL");
  const privateHost=u.hostname.endsWith(".railway.internal")||["localhost","127.0.0.1"].includes(u.hostname);
  if(u.protocol!=="https:" && !(privateHost&&u.protocol==="http:")) throw Error("HTTPS required");
  return t;
}
export function targets(raw) {
  const list=JSON.parse(raw||"null");
  if(!Array.isArray(list)||!list.length||list.length>50) throw Error("1..50 targets required");
  const seen=new Set();
  for(const t of list){validate(t);if(seen.has(t.name))throw Error("duplicate name");seen.add(t.name);}
  return list;
}
export async function check(t, fetcher=fetch) {
  validate(t); const start=performance.now();
  try {
    const r=await fetcher(t.url,{redirect:"error",signal:AbortSignal.timeout(10000),headers:{accept:"application/json"}});
    let ok=r.status===(t.expectedStatus??200);
    if(ok&&t.equals){
      if(Number(r.headers.get("content-length")||0)>8192)throw Error("large body");
      const data=await r.json();
      ok=Object.entries(t.equals).every(([k,v])=>data?.[k]===v);
    }
    return {name:t.name,ok,httpStatus:r.status,elapsedMs:Math.round(performance.now()-start)};
  } catch(e) {
    // Never emit URLs, tokens, payloads or exception messages.
    return {name:t.name,ok:false,httpStatus:null,elapsedMs:Math.round(performance.now()-start),errorClass:e?.name==="TimeoutError"?"timeout":"transport"};
  }
}
export async function main(env=process.env, fetcher=fetch, log=console.log) {
  let list;
  try {list=targets(env.IROS_MONITOR_TARGETS_JSON);}
  catch {log(JSON.stringify({component:"iros-probe",ok:false,issue:"invalid_config"}));return 2;}
  const results=await Promise.all(list.map(t=>check(t,fetcher)));
  const ok=results.every(r=>r.ok);
  log(JSON.stringify({component:"iros-probe",timestamp:new Date().toISOString(),ok,results}));
  return ok?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
