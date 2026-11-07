import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../scripts/local.mjs';
import {api} from '../server/api.js';
import {seed} from '../server/domain.js';

const origin='https://example.invalid';
const call=(db,id,body,source=origin)=>api(new Request(origin+'/api/bench',{
 method:body?'POST':'GET',headers:{'X-Bench':id,Origin:source,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,
}),db);
test('diagnóstico exige confirmação e retirada encerra a ficha',async()=>{
 const db=openDatabase();
 try{
  const id=crypto.randomUUID();
  const advance={action:'advance',version:0,id:seed.tickets[0].id,checked:false};
  assert.equal((await call(db,id,advance)).status,422);
  const repaired=await call(db,id,{...advance,checked:true});
  assert.equal((await repaired.json()).tickets[0].phase,2);
  const released=await call(db,id,{...advance,version:1});
  assert.equal((await released.json()).tickets[0].phase,3);
  assert.equal((await call(db,id,{...advance,version:2})).status,422);
 }finally{db.close();}
});
test('criações concorrentes não sobrescrevem a fila, e bancadas são isoladas',async()=>{
 const db=openDatabase();
 try{
  const id=crypto.randomUUID(),op={action:'create',version:0,title:'Batedeira',report:'Ruído no eixo.'};
  const replies=await Promise.all([call(db,id,op),call(db,id,{...op,title:'Liquidificador'})]);
  assert.deepEqual(replies.map(response=>response.status).sort(),[201,409]);
  assert.equal((await (await call(db,id)).json()).tickets.length,5);
  assert.equal((await (await call(db,crypto.randomUUID())).json()).tickets.length,4);
  assert.equal((await call(db,id,op,'https://other.invalid')).status,403);
  assert.equal((await call(db,id,{...op,title:' '})).status,422);
 }finally{db.close();}
});
