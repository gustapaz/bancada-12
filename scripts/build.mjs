import {build} from 'esbuild';
import {compile} from 'svelte/compiler';
import {mkdir,readFile,writeFile,copyFile,unlink} from 'node:fs/promises';
const js=await build({entryPoints:['client/main.js'],bundle:true,write:false,minify:true,format:'esm',platform:'browser',conditions:['browser'],plugins:[{name:'svelte',setup(builder){
 builder.onLoad({filter:/\.svelte$/},async({path})=>({contents:compile(await readFile(path,'utf8'),{filename:path,generate:'client'}).js.code,loader:'js'}));
}}]});
const assets={'/app.js':js.outputFiles[0].text};
for(const [route,file] of [['/','index.html'],['/style.css','style.css'],['/mark.svg','mark.svg']])assets[route]=await readFile('public/'+file,'utf8');
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai/drizzle',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await copyFile('migrations/0001_benches.sql','dist/.openai/drizzle/0001_benches.sql');
await writeFile('server/assets.js','export default '+JSON.stringify(assets));
try{await build({entryPoints:['server/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',minify:true});}
finally{await unlink('server/assets.js');}
