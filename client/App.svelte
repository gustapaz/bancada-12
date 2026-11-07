<script>
import {onMount,tick} from 'svelte';
const phases=['Recepção','Diagnóstico','Reparo','Retirada'];
const moves=['Enviar ao diagnóstico','Iniciar reparo','Liberar retirada'];
const key='bancada12:sessao';
let id;
try{
 id=localStorage.getItem(key);
 if(!id){localStorage.setItem(key,crypto.randomUUID());id=localStorage.getItem(key);}
}catch{id=crypto.randomUUID();}
let board=$state(null), selected=$state(null), filter=$state(-1);
let busy=$state(false), notice=$state(''), error=$state(false);
let checked=$state(false), creating=$state(false), title=$state(''), report=$state('');
let input,createButton;
const visible=$derived(board?.tickets.filter(item=>filter===-1||item.phase===filter)??[]);
const ticket=$derived(visible.find(item=>item.id===selected)??visible[0]);
async function request(op){
 const response=await fetch('/api/bench',{
  method:op?'POST':'GET',headers:{'X-Bench':id,...(op?{'Content-Type':'application/json'}:{})},
  body:op?JSON.stringify(op):undefined,signal:AbortSignal.timeout(8000),
 });
 const result=await response.json();
 if(!response.ok){
  if(result.board)board=result.board;
  throw new Error(result.error??'Falha ao consultar a oficina.');
 }
 return result;
}
async function load(){
 if(busy)return;
 busy=true;notice='';error=false;
 try{board=await request();}
 catch(e){notice=e.message;error=true;}
 finally{busy=false;}
}
onMount(()=>{void load();});
function choose(value){selected=value;checked=false;creating=false;notice='';error=false;}
function selectPhase(value){filter=value;choose(null);}
async function openCreate(){
 creating=true;notice='';error=false;
 await tick();input?.focus();
}
async function closeCreate(){
 creating=false;await tick();createButton?.focus();
}
async function submit(op){
 if(busy||!board)return;
 busy=true;notice='';error=false;
 try{
  board=await request({...op,version:board.version});
  if(op.action==='create'){
   filter=-1;selected=board.tickets.at(-1).id;title='';report='';void closeCreate();
   notice='Ficha aberta na recepção.';
  }else{
   if(filter!==-1)filter=board.tickets.find(item=>item.id===op.id).phase;
   selected=op.id;notice='Etapa atualizada.';
  }
  checked=false;
 }catch(e){notice=e.message;error=true;}
 finally{busy=false;}
}
</script>
<a class="skip" href="#fila">Ir para a fila</a>
<header><a href="/" class="brand"><img src="/mark.svg" alt="" width="32" height="32"> BANCADA 12</a><span>OFICINA COMUNITÁRIA / DEMO</span><button class="new" bind:this={createButton} disabled={!board||busy} onclick={openCreate}>+ Abrir ficha</button></header>
<main>
 <section class="banner" aria-labelledby="title"><div><p class="mono">CENTRAL DE REPAROS · TURNO A</p><h1 id="title">Antes de<br>descartar.</h1><p>Um lugar para diagnosticar, consertar e devolver objetos ao uso.</p></div>
 <div class="machine" aria-hidden="true"><div class="dial"><i></i></div><span>AJUSTE FINO / 012</span></div></section>
 <nav class="tracks" aria-label="Filtrar por etapa">
  {#each ['Todas',...phases] as phase,index}
   <button aria-pressed={filter===index-1} onclick={()=>selectPhase(index-1)} disabled={busy}><small>0{index+1}</small><strong>{phase}</strong><span>{board?.tickets.filter(t=>index===0||t.phase===index-1).length??'—'}</span></button>
  {/each}
 </nav>
 <section id="fila" class="workbench" aria-label="Fila e ficha de reparo">
  <div class="queue"><p class="mono">01 / ENTRADAS</p><h2>Fila da oficina</h2>
   {#if !board && busy}<p role="status">Carregando fichas…</p>{/if}
   {#if !board && error}<p role="alert">{notice}</p><button onclick={load}>Tentar novamente</button>{/if}
   {#if board && !visible.length}<p>Sem fichas nesta etapa.</p>{/if}
   <ol>
    {#each visible as item (item.id)}
     <li><button class="item" aria-pressed={!creating&&ticket?.id===item.id} onclick={()=>choose(item.id)} disabled={busy}><span class="serial">#{item.number}</span><span><strong>{item.title}</strong><small>{phases[item.phase]}</small></span></button></li>
    {/each}
   </ol>
  </div>
  <div class="paper">
   {#if creating}
    <p class="mono">02 / NOVA ENTRADA</p><h2>Abrir ficha</h2>
    <form onsubmit={(event)=>{event.preventDefault();void submit({action:'create',title,report});}}>
     <label for="object">Objeto</label><input id="object" bind:this={input} bind:value={title} required maxlength="55">
     <label for="report">Relato fictício</label><textarea id="report" bind:value={report} required maxlength="240" rows="3"></textarea>
     <div class="actions"><button type="button" onclick={closeCreate} disabled={busy}>Voltar</button><button class="primary" disabled={busy}>Criar ficha</button></div>
    </form>
   {:else if ticket}
    <p class="mono">02 / FICHA #{ticket.number} <span class="tag">{phases[ticket.phase]}</span></p>
    <h2>{ticket.title}</h2><p class="report">{ticket.report}</p>
    <h3>Registro da ficha</h3><ol class="log">{#each ticket.log as line}<li>{line}</li>{/each}</ol>
    {#if ticket.phase===1}<label class="check"><input type="checkbox" bind:checked disabled={busy}> A verificação foi concluída</label>{/if}
    {#if ticket.phase<3}<button class="primary" disabled={busy||ticket.phase===1&&!checked} onclick={()=>void submit({action:'advance',id:ticket.id,checked})}>{moves[ticket.phase]}</button>
    {:else}<p class="done">Ficha encerrada. Objeto pronto para retirada.</p>{/if}
   {:else}<p class="mono">02 / FICHA</p><h2>Selecione uma entrada.</h2>{/if}
   {#if board}<p role={error?'alert':'status'} class="message">{notice}</p>{/if}
  </div>
 </section>
</main>
<footer><span>BANCADA 12 / ESTUDO FULL-STACK</span><span>Objetos e relatos fictícios.</span></footer>
