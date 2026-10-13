import test from "node:test";
import assert from "node:assert/strict";
import {validate, targets, check, main} from "./probe.mjs";

test("allow internal HTTP but require HTTPS on public networks",()=>{
 assert.ok(validate({name:"n8n_1",url:"http://n8n-staging.railway.internal:5678/healthz"}));
 assert.throws(()=>validate({name:"bad_1",url:"http://example.com/health"}),/HTTPS/);
 assert.throws(()=>validate({name:"bad_2",url:"https://example.com/?token=x"}),/query/);
 assert.throws(()=>validate({name:"bad_3",url:"https://alice:secret@example.com"}),/secret/);
});
test("missing and duplicate targets fail closed",()=>{
 assert.throws(()=>targets("[]"),/1..50/);
 assert.throws(()=>targets('[{"name":"db_1","url":"https://example.org"},{"name":"db_1","url":"https://example.org"}]'),/duplicate/);
});
test("HTTP 200 degraded body still fails readiness",async()=>{
 const t={name:"gateway",url:"https://example.org/health",equals:{status:"ready"}};
 const fetcher=async()=>new Response(JSON.stringify({status:"degraded"}),{status:200});
 const result=await check(t,fetcher);
 assert.equal(result.ok,false);
});
test("readiness payload succeeds on matching JSON",async()=>{
 const t={name:"gateway",url:"https://example.org/health",equals:{status:"ready"}};
 const fetcher=async()=>new Response(JSON.stringify({status:"ready"}),{status:200});
 assert.equal((await check(t,fetcher)).ok,true);
});
test("exceptions never reveal embedded credentials",async()=>{
 const result=await check({name:"check_1",url:"https://example.org/health"},async()=>{throw Error("Bearer private-token")});
 assert.equal(result.ok,false);
 assert.doesNotMatch(JSON.stringify(result),/private-token/);
});
test("main returns 1 for unavailable services and sanitized report",async()=>{
 const out=[];
 const code=await main({IROS_MONITOR_TARGETS_JSON:JSON.stringify([{name:"check_1",url:"https://example.org/health"}])},async()=>new Response("error",{status:503}),s=>out.push(s));
 assert.equal(code,1);
 assert.equal(JSON.parse(out[0]).ok,false);
});
