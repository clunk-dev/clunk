// Bundles the site with esbuild. Usage:
//   node scripts/build.mjs                       -> dist/ (history routing: /funding, /vaults ...)
//   node scripts/build.mjs --router=hash --out=dist-preview  -> hash routing (#funding) for static previews
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const router = arg('router', 'history');
const buildRoot = resolve(root, arg('out', 'dist'));
const workerBuild = !process.argv.includes('--inline') && router === 'history';
const out = workerBuild ? resolve(buildRoot, 'client') : buildRoot;
const base = router === 'hash' ? './' : '/';
// --inline: one self-contained HTML file (CSS, JS and brand images embedded) for hosts that serve a single page.
const inline = process.argv.includes('--inline');
const assetMap = {};
if (inline) {
  const types = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp' };
  for (const f of readdirSync(resolve(root, 'public/brand'))) {
    if (f === 'clunk-mascot-1100.webp') continue; // the 640 px version is enough for the preview
    const ext = f.split('.').pop();
    assetMap['brand/' + f] = `data:${types[ext]};base64,` + readFileSync(resolve(root, 'public/brand', f)).toString('base64');
  }
  assetMap['brand/clunk-mascot-1100.webp'] = assetMap['brand/clunk-mascot-640.webp'];
}

rmSync(buildRoot, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/main.tsx')],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: inline ? 'iife' : 'esm',
  target: ['es2020', 'safari15'],
  outfile: resolve(out, 'assets/app.js'),
  jsx: 'automatic',
  loader: { '.svg': 'text' },
  define: {
    'process.env.NODE_ENV': '"production"',
    __ROUTER_MODE__: JSON.stringify(router),
    __ASSET_BASE__: JSON.stringify(base),
    __ASSET_MAP__: inline ? JSON.stringify(assetMap) : 'undefined',
  },
  logLevel: 'warning',
});

if (!inline) cpSync(resolve(root, 'public'), out, { recursive: true });
let html = readFileSync(resolve(root, 'src/index.html'), 'utf8').replaceAll('%BASE%', base);
// --fragment: emit the page body only (for hosts that wrap pages in their own document skeleton).
if (process.argv.includes('--fragment')) {
  html = html
    .replace(/<!doctype html>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head>/gi, '')
    .replace(/<\/?body>/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .trim();
}
if (inline) {
  const css = readFileSync(resolve(out, 'assets/app.css'), 'utf8');
  const js = readFileSync(resolve(out, 'assets/app.js'), 'utf8').replace(/<\/(script)/gi, '<\\/$1');
  html = html
    .replace(/<link rel="icon"[^>]*svg[^>]*>/, `<link rel="icon" href="${assetMap['brand/clunk-token-cobalt.svg']}" type="image/svg+xml" />`)
    .replace(/<link rel="icon"[^>]*png[^>]*>\s*/, '')
    .replace(/<link rel="stylesheet" href="[^"]*assets\/app\.css" \/>/, () => `<style>${css}</style>`)
    .replace(/<script type="module" src="[^"]*assets\/app\.js"><\/script>/, () => `<script>${js}</script>`);
  rmSync(resolve(out, 'assets'), { recursive: true, force: true });
}
writeFileSync(resolve(out, 'index.html'), html);
if (router === 'history') writeFileSync(resolve(out, '404.html'), html); // SPA fallback for static hosts
console.log(`Built ${router} mode -> ${out}`);

if (workerBuild) {
  const privateRoot=resolve(root,'private/nft');
  let records = {};
  if (existsSync(resolve(privateRoot, 'manifest.json'))) {
  const manifest=JSON.parse(readFileSync(resolve(privateRoot,'manifest.json'),'utf8'));
  records=Object.fromEntries(manifest.entries.map(entry=>[entry.id,{
    entry:{id:entry.id,name:entry.name,attributes:entry.attributes},
    metadata:JSON.parse(readFileSync(resolve(privateRoot,entry.metadata),'utf8')),
    svg:readFileSync(resolve(privateRoot,entry.art),'utf8'),
    thumbnail:readFileSync(resolve(privateRoot,entry.thumbnail)).toString('base64'),
  }]));
  } else {
    if (/enabled:\s*true/.test(readFileSync(resolve(root, 'src/config/nft.ts'), 'utf8'))) {
      throw new Error('Enabled vault requires the private NFT collection. Never publish it in Git.');
    }
    console.log('Private collection omitted; public-source build keeps NFT reveal disabled.');
  }
  await build({entryPoints:[resolve(root,'server/index.ts')],outfile:resolve(buildRoot,'server/index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,
    plugins:[{name:'private-nft-records',setup(b){b.onResolve({filter:/^private-nft-records$/},()=>({path:'records',namespace:'private-nft'}));b.onLoad({filter:/.*/,namespace:'private-nft'},()=>({contents:JSON.stringify(records),loader:'json'}));}}]});
  if (existsSync(resolve(root,'.openai/hosting.json'))) {
    mkdirSync(resolve(buildRoot,'.openai'),{recursive:true});
    cpSync(resolve(root,'.openai/hosting.json'),resolve(buildRoot,'.openai/hosting.json'));
  }
}
