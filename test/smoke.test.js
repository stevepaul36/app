'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

let child,base,logs='';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

before(async()=>{
  const port=31000+Math.floor(Math.random()*18000);
  base='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),JWT_SECRET:'test-secret-that-is-long-enough-for-smoke-tests-123456'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>{logs+=b.toString()});
  child.stderr.on('data',b=>{logs+=b.toString()});
  for(let i=0;i<60;i++){
    if(child.exitCode!==null)throw new Error('Server exited before becoming ready. '+logs);
    try{await fetch(base+'/healthz',{signal:AbortSignal.timeout(500)});return}catch{}
    await wait(250);
  }
  throw new Error('Server did not start. '+logs);
});

after(()=>{if(child&&!child.killed)child.kill('SIGTERM')});

test('health endpoint reports missing persistent database as not ready',async()=>{
  const r=await fetch(base+'/healthz');
  assert.equal(r.status,503);
  const body=await r.json();
  assert.equal(body.ok,false);
  assert.equal(body.database,'not-configured');
});

test('property catalogue remains available in guest demo mode',async()=>{
  const r=await fetch(base+'/api/properties');
  assert.equal(r.status,200);
  const body=await r.json();
  assert.ok(Array.isArray(body.properties));
  assert.ok(body.properties.length>=12);
});

test('registration is blocked when progress cannot be persisted',async()=>{
  const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'WillowTester',password:'test-password-123'})});
  assert.equal(r.status,503);
  assert.match((await r.json()).error,/Persistent accounts are not configured/);
});

test('property transactions are blocked when progress cannot be persisted',async()=>{
  const r=await fetch(base+'/api/properties/home-1/buy',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(r.status,503);
  assert.match((await r.json()).error,/Persistent accounts are not configured/);
});
