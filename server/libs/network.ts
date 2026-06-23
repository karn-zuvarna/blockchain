import { sepolia, mainnet } from 'viem/chains'
import { env } from './env.ts'

export type NetworkName = 'sepolia' | 'mainnet'

export function parseNetwork(argv = process.argv): NetworkName {
  const idx = argv.indexOf('--network')
  const name = idx !== -1 ? argv[idx + 1] : 'sepolia'
  if (name !== 'sepolia' && name !== 'mainnet') {
    throw new Error(`Unknown network "${name}". Use --network sepolia or --network mainnet`)
  }
  return name
}

export function getNetworkConfig(network: NetworkName) {
  if (network === 'mainnet') {
    if (!env.MAINNET_RPC_URL) throw new Error('MAINNET_RPC_URL is required in .env')
    if (!env.MAINNET_TOKEN_ADDRESS) throw new Error('MAINNET_TOKEN_ADDRESS is required in .env — run: yarn tsx scripts/deploy.ts --network mainnet')
    return {
      chain: mainnet,
      rpcUrl: env.MAINNET_RPC_URL,
      tokenAddress: env.MAINNET_TOKEN_ADDRESS as `0x${string}`,
      isMainnet: true,
    }
  }
  return {
    chain: { ...sepolia, id: env.CHAIN_ID },
    rpcUrl: env.SEPOLIA_RPC_URL,
    tokenAddress: env.SEPOLIA_TOKEN_ADDRESS as `0x${string}`,
    isMainnet: false,
  }
}

export function getDeployNetworkConfig(network: NetworkName) {
  if (network === 'mainnet') {
    if (!env.MAINNET_RPC_URL) throw new Error('MAINNET_RPC_URL is required in .env')
    return {
      chain: mainnet,
      rpcUrl: env.MAINNET_RPC_URL,
      isMainnet: true,
      envKey: 'MAINNET_TOKEN_ADDRESS' as const,
    }
  }
  return {
    chain: { ...sepolia, id: env.CHAIN_ID },
    rpcUrl: env.SEPOLIA_RPC_URL,
    isMainnet: false,
    envKey: 'SEPOLIA_TOKEN_ADDRESS' as const,
  }
}
