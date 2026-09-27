import { createPublicClient, createWalletClient, http } from "viem";
import type { Account, PublicClient, Transport, WalletClient } from "viem";
import { getEqueChain, type EqueChain, type EqueChainName } from "./chains";
import { getAddresses, type EqueDeployment } from "./addresses";

export interface CreateEqueClientParams {
  chain: EqueChainName;
  rpcUrl?: string;
  signer?: Account;
}

export interface EqueClient {
  chain: EqueChainName;
  chainId: number;
  addresses: EqueDeployment;
  publicClient: PublicClient<Transport, EqueChain>;
  walletClient: WalletClient<Transport, EqueChain, Account> | undefined;
}

export function createEqueClient(params: CreateEqueClientParams): EqueClient {
  const { chain, rpcUrl, signer } = params;
  const definition = getEqueChain(chain);
  const addresses = getAddresses(chain);

  const transport = rpcUrl === undefined ? http() : http(rpcUrl);
  const publicClient = createPublicClient<Transport, EqueChain>({ chain: definition, transport });
  const walletClient =
    signer === undefined
      ? undefined
      : createWalletClient<Transport, EqueChain, Account>({ account: signer, chain: definition, transport });

  return {
    chain,
    chainId: definition.id,
    addresses,
    publicClient,
    walletClient,
  };
}