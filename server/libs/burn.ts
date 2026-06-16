import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from './env.ts'
import { parseNetwork, getNetworkConfig, type NetworkName } from './network.ts'
import { createViemPublicClient, trezorSignAndSend } from './trezor.ts'

export async function burn(_amount: string, _who: string, network: NetworkName = parseNetwork()) {
  const { chain, rpcUrl, tokenAddress } = getNetworkConfig(network)
  const who = (_who || env.TREZOR_ADDRESS) as `0x${string}`
  const amount = parseUnits(_amount, 18)
  const abi = parseAbi(['function burnFrom(address,uint256)'])

  const publicClient = createViemPublicClient(chain, rpcUrl)

  await publicClient.simulateContract({
    address: tokenAddress,
    abi,
    functionName: 'burnFrom',
    args: [who, amount],
    account: env.TREZOR_ADDRESS,
  })

  const data = encodeFunctionData({ abi, functionName: 'burnFrom', args: [who, amount] })
  const receipt = await trezorSignAndSend({ publicClient, chain, to: tokenAddress, data })

  console.log('✅ burn mined at block', receipt.blockNumber)
  return receipt
}
