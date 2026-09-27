import type { Address } from 'viem';

/** One chain's deployed Eque stack, as recorded by the deploy script. */
export interface EqueDeployment {
  chainId: number;
  deployedAt: string;
  deployer: Address;
  tokens: Record<string, Address>;
  feeds: Record<string, Address>;
  strategies: Record<string, Address>;
  vaults: Record<string, Address>;
  router: Address;
  factory: Address;
  faucet: Address;
}

export const deployments: Record<string, EqueDeployment> = {
  baseSepolia: {
    chainId: 84532,
    deployedAt: '2026-09-26T23:19:53.265Z',
    deployer: '0x00000ac095ab728feebef880a3d4801f71732808',
    tokens: {
      METAc: '0x7a82bdaee207b0c637c9c9bf44efaffed1ca9bfc',
      TSLAc: '0x8be90fd1f33b4c5824d409068d23a10e3dde86d0',
    },
    feeds: {
      METAc: '0xb3df53449c17ba2bc3155059b6443f8b6dc720d6',
      TSLAc: '0xbf2332f1610671f9b9082430ab3cab6ad84fc153',
    },
    strategies: {
      'evMETA-epoch': '0x7f797deae16656d6505c486a9fbbdf1ec25cbb33',
      'evMETA-lending': '0x087c107224c1d3213297275bf0eac6b726a6fff9',
      'evTSLA-epoch': '0x11152f434124de3bdda81df38ba3f64dea825d0e',
      'evTSLA-lending': '0x8f4152f9e9ba54a4d00b532700916c3579334caf',
    },
    vaults: {
      evMETA: '0xD33EBF3b6a961541e6EceDa80167fa58E2534156',
      evTSLA: '0x9Bae360A732582F99b7Ebed0E90262Ee23f2fA20',
    },
    router: '0xa3D9c555A8C80B2Eca27895779933CaD2f390b55',
    factory: '0xfc7541f4051c13d19f7d5b9f43c3d1a520e35813',
    faucet: '0xe04f91e4cc6710e3232e59922c7e662a697bbc60',
  },
  hardhatFork: {
    chainId: 31337,
    deployedAt: '2026-09-26T21:40:17.688Z',
    deployer: '0x00000ac095ab728feebef880a3d4801f71732808',
    tokens: {
      METAc: '0xeb437a720225a8939fc5b1fe471088d05cd4c12f',
      TSLAc: '0x0d31781f1b51842bbcf527cc2cc38d40bd30c860',
    },
    feeds: {
      METAc: '0x1487255c64909be8a23629678cbf8c6036e3f417',
      TSLAc: '0x8ea0e0fbe6e0d60a9008485dcc70d5c02fa67e0a',
    },
    strategies: {
      'evMETA-epoch': '0xbd71d69e65043828524bb2e67be257da6efd0290',
      'evMETA-lending': '0xaf19f70201a1f886c224a548ee48d5b2b5559b3d',
      'evTSLA-epoch': '0xbf2332f1610671f9b9082430ab3cab6ad84fc153',
      'evTSLA-lending': '0x8be90fd1f33b4c5824d409068d23a10e3dde86d0',
    },
    vaults: {
      evMETA: '0x82e6443f74C9817c1A7AF69884afc08f5e9aE0a0',
      evTSLA: '0xd86e58E4F80bb0F83432EAf309F02332EeB80AF6',
    },
    router: '0xa9C3B0228AF282A4cdD7383c74A2Ce9Af7541E42',
    factory: '0x4a960a6807951a678550afb1aecca82247e289a8',
    faucet: '0xc2ec5d2905b22e7dec50b20807df91e1953d7b48',
  },
  robinhoodTestnet: {
    chainId: 46630,
    deployedAt: '2026-09-27T00:04:06.848Z',
    deployer: '0x00000ac095ab728feebef880a3d4801f71732808',
    tokens: {
      AAPL: '0xeb437a720225a8939fc5b1fe471088d05cd4c12f',
      NVDA: '0x0d31781f1b51842bbcf527cc2cc38d40bd30c860',
    },
    feeds: {
      AAPL: '0x1487255c64909be8a23629678cbf8c6036e3f417',
      NVDA: '0x8ea0e0fbe6e0d60a9008485dcc70d5c02fa67e0a',
    },
    strategies: {
      'evAAPL-epoch': '0xbd71d69e65043828524bb2e67be257da6efd0290',
      'evAAPL-lending': '0xaf19f70201a1f886c224a548ee48d5b2b5559b3d',
      'evNVDA-epoch': '0xbf2332f1610671f9b9082430ab3cab6ad84fc153',
      'evNVDA-lending': '0x8be90fd1f33b4c5824d409068d23a10e3dde86d0',
    },
    vaults: {
      evAAPL: '0x82e6443f74C9817c1A7AF69884afc08f5e9aE0a0',
      evNVDA: '0xd86e58E4F80bb0F83432EAf309F02332EeB80AF6',
    },
    router: '0xa9C3B0228AF282A4cdD7383c74A2Ce9Af7541E42',
    factory: '0x4a960a6807951a678550afb1aecca82247e289a8',
    faucet: '0xc2ec5d2905b22e7dec50b20807df91e1953d7b48',
  },
};

/** The recorded deployment for one chain. Throws when none exists yet. */
export function getAddresses(chain: string): EqueDeployment {
  const deployment = deployments[chain];
  if (deployment === undefined) {
    throw new Error(
      'No Eque deployment recorded for ' +
        chain +
        '. Run the deploy script for that network, then npm run sync:addresses.',
    );
  }
  return deployment;
}
