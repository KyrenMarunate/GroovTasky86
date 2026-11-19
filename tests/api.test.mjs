import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const prefs={start:'09:00',end:'17:00',breakDuration:10,lunchStart:'13:00',lunchDuration:45,workload:7,buffer:10,energy:'Morning',workStyle:'Balanced',commitments:'11:00-12:00',mode:'daily'};
const task=(id,duration,dependencies=[])=>({id,title:id,description:'',duration,priority:'High',deadline:'',category:'Work',difficulty:'Hard',fixed:false,dependencies,completed:false});
test('parser extracts duration and priority',async()=>{const r=await fetch(`${base}/api/ai/parse-tasks`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Finish portfolio — 2 hours — High'})});const j=await r.json();assert.equal(j.tasks[0].duration,120);assert.equal(j.tasks[0].priority,'High')});
test('schedule respects fixed commitments and dependencies',async()=>{const r=await fetch(`${base}/api/plans/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tasks:[task('a',120),task('b',60,['a'])],prefs,date:'2026-11-17'})});const j=await r.json();assert.equal(r.status,200);assert.deepEqual(j.scheduled.map(s=>[s.start,s.end]),[['09:00','11:00'],['12:00','13:00']])});
test('too-long task is unscheduled',async()=>{const r=await fetch(`${base}/api/plans/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tasks:[task('large',1000)],prefs,date:'2026-11-17'})});const j=await r.json();assert.equal(j.unscheduled.length,1)});
