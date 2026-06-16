import { env } from './env.ts'
import { parseNetwork, getDeployNetworkConfig } from './network.ts'
import { createViemPublicClient, trezorDeploy } from './trezor.ts'
import artifact from '../../artifacts/contracts/ICOToken.sol/ICOToken.json' with { type: 'json' }

export async function deploy(name: string, symbol: string, network = parseNetwork()) {
  const { chain, rpcUrl, envKey } = getDeployNetworkConfig(network)
  const publicClient = createViemPublicClient(chain, rpcUrl)

  const receipt = await trezorDeploy({
    publicClient,
    chain,
    abi: artifact.abi as any,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [name, symbol],
  })

  if (!receipt.contractAddress) throw new Error('Deploy failed: no contract address in receipt')
  return { contractAddress: receipt.contractAddress, network, envKey }
}
