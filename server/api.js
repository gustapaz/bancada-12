import {safeParse} from 'valibot';
import {uuid,seed,operation,change} from './domain.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function input(request){
 const reader=request.body?.getReader();
 if(!reader)return null;
 let size=0,text='';
 const decoder=new TextDecoder();
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)return JSON.parse(text+decoder.decode());
   size+=value.byteLength;
   if(size>4096){await reader.cancel();return null;}
   text+=decoder.decode(value,{stream:true});
  }
 }catch{return null;}
}
export async function api(request,db){
 const url=new URL(request.url);
 if(url.pathname!=='/api/bench'||!['GET','POST'].includes(request.method))return json({error:'Rota inexistente.'},404);
 const id=request.headers.get('X-Bench');
 if(!uuid.test(id??''))return json({error:'Identificador inválido.'},400);
 const now=Date.now();
 const read=async()=>{
  const row=await db.prepare('SELECT document FROM benches WHERE id=? AND expires>?').bind(id,now).first();
  return row?JSON.parse(row.document):seed;
 };
 try{
  if(request.method==='GET')return json(await read());
  if(request.headers.get('Origin')!==url.origin||request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return json({error:'Origem ou formato inválido.'},403);
  const parsed=safeParse(operation,await input(request));
  if(!parsed.success)return json({error:'Preencha os campos da ficha corretamente.'},422);
  const current=await read(),result=change(current,parsed.output);
  if(result.error)return json({error:result.error,board:current},result.status);
  await db.prepare('DELETE FROM benches WHERE id IN (SELECT id FROM benches WHERE expires<=? ORDER BY expires LIMIT 24)').bind(now).run();
  const stored=await db.prepare(`INSERT INTO benches(id,version,document,expires)
   SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM benches WHERE id=?) OR (?=0 AND (SELECT count(*) FROM benches)<2000)
   ON CONFLICT(id) DO UPDATE SET version=excluded.version,document=excluded.document,expires=excluded.expires
   WHERE (CASE WHEN benches.expires>? THEN benches.version ELSE 0 END)=?
   RETURNING version`).bind(id,result.board.version,JSON.stringify(result.board),now+604800000,id,current.version,now,current.version).first();
  if(stored)return json(result.board,parsed.output.action==='create'?201:200);
  const latest=await read();
  return latest.version!==current.version
   ?json({error:'A bancada mudou em outra aba. Confira a fila atualizada.',board:latest},409)
   :json({error:'A bancada está indisponível para gravação.'},429);
 }catch{return json({error:'A oficina está temporariamente indisponível.'},503);}
}
