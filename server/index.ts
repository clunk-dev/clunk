import records from 'private-nft-records';
import { createRevealHandler } from './reveal.mjs';
import { nftLaunch } from '../src/config/nft';
import { launch } from '../src/config/launch';

const reveal = createRevealHandler({ records, config: { ...nftLaunch, chainId: launch.chain.chainId } });
export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }) {
    const response = await reveal(request);
    if (response) return response;
    const url = new URL(request.url);
    // Only the client directory is deployed as static assets. Explicitly deny source paths.
    if (/^\/(private|server|contracts|docs\/nft|\.git|\.openai)(\/|$)/.test(url.pathname)) return new Response('Not found', { status: 404 });
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || url.pathname.split('/').pop()?.includes('.')) return asset;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
