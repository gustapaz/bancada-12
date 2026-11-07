import * as v from 'valibot';
export const phases=['Recepção','Diagnóstico','Reparo','Retirada'];
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const version=v.pipe(v.number(),v.integer(),v.minValue(0),v.maxValue(100));
const short=(max)=>v.pipe(v.string(),v.trim(),v.minLength(1),v.maxLength(max));
export const operation=v.variant('action',[
 v.object({action:v.literal('create'),version,title:short(55),report:short(240)}),
 v.object({action:v.literal('advance'),version,id:v.pipe(v.string(),v.regex(uuid)),checked:v.boolean()}),
]);
export const seed={version:0,tickets:[
 {id:'00000000-0000-4000-8000-000000000001',number:12,title:'Rádio de pilha',report:'O volume falha quando o botão gira. Carcaça em bom estado.',phase:1,log:['Ficha aberta','Enviado ao diagnóstico']},
 {id:'00000000-0000-4000-8000-000000000002',number:13,title:'Luminária de mesa',report:'A articulação cede. O interruptor ainda funciona.',phase:0,log:['Ficha aberta']},
 {id:'00000000-0000-4000-8000-000000000003',number:14,title:'Ventilador azul',report:'A hélice está alinhada. Falta substituir a presilha.',phase:2,log:['Ficha aberta','Enviado ao diagnóstico','Verificação concluída']},
 {id:'00000000-0000-4000-8000-000000000004',number:15,title:'Relógio de parede',report:'Mecanismo substituído e marcha conferida.',phase:3,log:['Ficha aberta','Enviado ao diagnóstico','Verificação concluída','Liberado para retirada']},
]};
export function change(board,op){
 if(board.version!==op.version)return {status:409,error:'A bancada mudou em outra aba. Confira a fila atualizada.'};
 if(board.version>=100)return {status:429,error:'A bancada atingiu o limite da demonstração.'};
 const next={version:board.version+1,tickets:[...board.tickets]};
 if(op.action==='create'){
  if(board.tickets.length>=15)return {status:429,error:'A bancada atingiu o limite de fichas.'};
  next.tickets.push({id:crypto.randomUUID(),number:board.tickets.at(-1).number+1,title:op.title,report:op.report,phase:0,log:['Ficha aberta']});
 }else{
  const i=board.tickets.findIndex(item=>item.id===op.id);
  const ticket=board.tickets[i];
  if(!ticket||ticket.phase===3)return {status:422,error:'Esta ficha não pode avançar.'};
  if(ticket.phase===1&&!op.checked)return {status:422,error:'Confirme a verificação antes de iniciar o reparo.'};
  const action=['Enviado ao diagnóstico','Verificação concluída','Liberado para retirada'][ticket.phase];
  next.tickets[i]={...ticket,phase:ticket.phase+1,log:[...ticket.log,action]};
 }
 return {board:next};
}
