// Local preview of the same Worker and public assets used in production.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
const [dir = 'dist', port = '4173'] = process.argv.slice(2);
const workerPath=resolve(dir,'server/index.js');
const worker=existsSync(workerPath)?(await import(pathToFileURL(workerPath).href)).default:null;
const root=resolve(dir,worker?'client':'.');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const ASSETS={async fetch(request){
 const pathname=decodeURIComponent(new URL(request.url).pathname);
 const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+sep))return new Response('Not found',{status:404});
 try{return new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]??'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}};
createServer(async(req,res)=>{
 try {
  const request=new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers:req.headers});
  const response=worker?await worker.fetch(request,{ASSETS}):await ASSETS.fetch(request);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500).end('Preview unavailable');}
}).listen(Number(port),()=>console.log(`Serving on http://localhost:${port}`));
