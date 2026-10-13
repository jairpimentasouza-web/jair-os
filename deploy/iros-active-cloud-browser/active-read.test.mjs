import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import {makeHandler, constantTimeEqual} from './active-read.mjs';
const token='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const job='f523cb4e-2a94-4b69-a9b0-1c6b0e94c572';
const snapshot = {targetId:'active-tab-1',value:{host:'siga01.activesoft.com.br',path:'/diario/',logout:true,teacher:true,hasPassword:false}};
async function withServer(browserRead,callback,enabled=true){
 const server=http.createServer(makeHandler({token,browserRead,enabled,attestations:new Map()}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await callback(`http://127.0.0.1:${server.address().port}`);} finally {await new Promise(resolve=>server.close(resolve));}
}
function request(base,operation,att,header=token,extra={}) {
 const data={operation,...(att?{session_attestation_id:att}:{}),...extra};
 return fetch(base+'/v1/read',{method:'POST',headers:{'content-type':'application/json','x-iros-read-token':header,'x-iros-job-id':job},body:JSON.stringify(data)});
}
test('constant time equality basics',()=>{assert.equal(constantTimeEqual(token,token),true);assert.equal(constantTimeEqual(token,'incorrect'),false)});
test('without service token rejected',async()=>withServer(async()=>snapshot,async base=>{const r=await request(base,'session.status',null,'wrong');assert.equal(r.status,401)}));
test('disabled remains blocked',async()=>withServer(async()=>snapshot,async base=>{const r=await request(base,'session.status');assert.equal(r.status,423)},false));
test('writes always denied',async()=>withServer(async()=>snapshot,async base=>{for(const op of ['grades.write','attendance.write','lessons.write','Runtime.evaluate']){const r=await request(base,op);assert.equal(r.status,403)}}));
test('session read never claims teacher role verified',async()=>withServer(async()=>snapshot,async base=>{const r=await request(base,'session.status');const j=await r.json();assert.equal(r.status,200);assert.equal(j.sessionHeuristic,true);assert.equal(j.teacherRoleVerified,false);assert.equal(j.studentDataReturned,false);assert.equal(j.writesAllowed,false);assert.match(j.session_attestation_id,/^[0-9a-f-]{36}$/)}));
test('class labels only after live attestation',async()=>withServer(async expression=>expression.includes('const items =')?{targetId:'active-tab-1',value:{items:['1º ano EM','2º ano EM']}}:snapshot,async base=>{const denied=await request(base,'classes.read');assert.equal(denied.status,403);const status=await (await request(base,'session.status')).json();const response=await request(base,'classes.read',status.session_attestation_id);assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.items,[{label:'1º ano'},{label:'2º ano'}]);assert.equal(data.verified,false)}));
test('foreign browser host rejects class extraction',async()=>withServer(async expression=>({targetId:'another',value:{host:'evil.example',logout:true,path:'/portal',teacher:true,hasPassword:false}}),async base=>{const status=await (await request(base,'session.status')).json();assert.equal(status.session_attestation_id,null);assert.equal(status.sessionHeuristic,false);const classes=await request(base,'classes.read');assert.equal(classes.status,403)}));
test('duplicate unsupported fields rejected',async()=>withServer(async()=>snapshot,async base=>{const resp=await request(base,'session.status',null,token,{script:'document.cookie'});assert.equal(resp.status,400)}));

test('student names are not forwarded from contaminated UI labels',async()=>withServer(async expression=>expression.includes('const items =')?{targetId:'active-tab-1',value:{items:['3º EM - Nome do aluno: Maria X','Turma A - Aluno João Y','Aluno João Y','Contato aluno@example.com']}}:snapshot,async base=>{const status=await (await request(base,'session.status')).json();const response=await request(base,'classes.read',status.session_attestation_id);assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.items,[{label:'3º EM'},{label:'Turma A'}]);assert.equal(JSON.stringify(data).includes('Maria'),false);assert.equal(JSON.stringify(data).includes('João'),false)}));
