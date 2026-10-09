import { launch } from './launch';

/** Public settings only. Token and chain identity come from the site's shared launch configuration. */
export const nftLaunch: {
  vaultAddress: string | null;
  rpcUrl: string | null;
  deploymentBlock: number | null;
  metadataBaseURI: string | null;
  enabled: boolean;
  confirmations: number;
} = {
  vaultAddress: null,
  rpcUrl: null,
  deploymentBlock: null,
  metadataBaseURI: null,
  enabled: false,
  confirmations: 2,
};
export const collection = {size:300, backingTokens:50_000, title:'Clunk Identities'} as const;
const address = (v: string | null) => !!v && /^0x[0-9a-fA-F]{40}$/.test(v) && !/^0x0{40}$/i.test(v);
export function nftConfigured(): boolean {
  return address(launch.contractAddress) && address(nftLaunch.vaultAddress)
    && launch.contractAddress?.toLowerCase() !== nftLaunch.vaultAddress?.toLowerCase()
    && Number.isSafeInteger(launch.chain.chainId) && Number(launch.chain.chainId)>0
    && !!nftLaunch.rpcUrl?.startsWith('https://')
    && Number.isSafeInteger(nftLaunch.deploymentBlock) && Number(nftLaunch.deploymentBlock)>=0
    && !!nftLaunch.metadataBaseURI && /^(ipfs:\/\/|https:\/\/)/.test(nftLaunch.metadataBaseURI)
    && nftLaunch.metadataBaseURI.endsWith('/') && Number.isSafeInteger(nftLaunch.confirmations) && nftLaunch.confirmations>=1;
}
export function nftEnabled(): boolean { return nftConfigured() && nftLaunch.enabled && launch.features.vaults==='live'; }
