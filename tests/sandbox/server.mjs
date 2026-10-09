// Serves dist-single/index.html under a strict CSP inside a sandboxed iframe (opaque origin, no storage).
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const page = readFileSync(process.argv[2] ?? 'dist-single/index.html');
const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src 'none'";
createServer((req, res) => {
  if (req.url.startsWith('/frame')) { res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': csp }).end(page); return; }
  res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><iframe id="f" src="/frame" sandbox="allow-scripts allow-popups" style="width:100vw;height:100vh;border:0"></iframe></body>');
}).listen(4180);
