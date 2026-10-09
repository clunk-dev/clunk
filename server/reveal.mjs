// Artwork is bundled into the Worker only, never into public assets or browser JS.
// A public token ID is not authorization: confirm ERC-721 existence onchain first.
export function createRevealHandler({ records, config, rpcFetch = fetch }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const json = (body, status = 200) => Response.json(body, { status, headers });
  async function minted(ids) {
    if (!config.vaultAddress || !config.rpcUrl || !config.chainId) return new Set();
    async function rpc(calls) {
      const response = await rpcFetch(config.rpcUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calls.map((call, id) => ({ jsonrpc: '2.0', id, ...call }))),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('RPC unavailable');
      const data = await response.json();
      if (!Array.isArray(data) || data.length !== calls.length) throw new Error('Invalid RPC response');
      return calls.map((_, id) => {
        const matches = data.filter(item => item.id === id);
        if (matches.length !== 1) throw new Error('Invalid RPC response ID');
        return matches[0];
      });
    }
    const [chain, latest] = await rpc([{ method: 'eth_chainId', params: [] }, { method: 'eth_blockNumber', params: [] }]);
    if (chain.error || latest.error || !/^0x[0-9a-f]+$/i.test(chain.result) || !/^0x[0-9a-f]+$/i.test(latest.result) || BigInt(chain.result) !== BigInt(config.chainId)) throw new Error('Wrong or unavailable chain');
    const block = BigInt(latest.result) - BigInt(Math.max(1, config.confirmations ?? 2) - 1);
    if (block < BigInt(config.deploymentBlock ?? 0)) return new Set();
    const results = await rpc(ids.map(id => ({ method: 'eth_call', params: [{ to: config.vaultAddress, data: '0x6352211e' + BigInt(id).toString(16).padStart(64, '0') }, '0x' + block.toString(16)] })));
    const found = new Set();
    results.forEach((result, i) => {
      if (result.error) {
        if (result.error.code === 3 || /revert/i.test(result.error.message ?? '')) return;
        throw new Error('Ownership read failed');
      }
      if (!/^0x0{24}[a-f0-9]{40}$/i.test(result.result ?? '')) throw new Error('Invalid owner');
      if (BigInt(result.result) !== 0n) found.add(ids[i]);
    });
    return found;
  }
  return async request => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/nft/')) return null;
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405);
    const cover = `${url.origin}/brand/clunk-token-cobalt.svg`;
    const match = url.pathname.match(/^\/nft\/(art|thumbs|metadata)\/(\d+)\.(svg|webp|json)$/);
    const isList = url.pathname === '/nft/revealed';
    if (!match && !isList) return json({ error: 'Not found' }, 404);
    const ids = isList ? [...new Set((url.searchParams.get('ids') ?? '').split(',').map(Number))] : [Number(match[2])];
    if (ids.length > 30 || ids.some(id => !Number.isInteger(id) || id < 1 || id > 300)) return json({ error: 'Invalid identities' }, 400);
    if (match && ({ art: 'svg', thumbs: 'webp', metadata: 'json' })[match[1]] !== match[3]) return json({ error: 'Not found' }, 404);
    try {
      const revealed = await minted(ids);
      if (isList) return json({ entries: ids.filter(id => revealed.has(id)).map(id => records[id].entry) });
      const id = ids[0];
      if (!revealed.has(id)) {
        if (match[1] === 'metadata') return json({ name: `Clunk #${String(id).padStart(3, '0')}`, description: 'Artwork and rarity reveal after mint confirmation.', image: cover, attributes: [] });
        return new Response(null, { status: 302, headers: { ...headers, Location: cover } });
      }
      const record = records[id];
      if (match[1] === 'metadata') return json({ ...record.metadata, image: `${url.origin}/nft/art/${String(id).padStart(3, '0')}.svg` });
      const body = match[1] === 'art' ? record.svg : Uint8Array.from(atob(record.thumbnail), c => c.charCodeAt(0));
      return new Response(request.method === 'HEAD' ? null : body, { headers: { ...headers, 'Content-Type': match[1] === 'art' ? 'image/svg+xml' : 'image/webp' } });
    } catch {
      // Fail closed: never fall back to an unverified artwork response.
      return json({ error: 'Reveal temporarily unavailable. Please try again.' }, 503);
    }
  };
}
