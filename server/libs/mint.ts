import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from './env.ts'
import { parseNetwork, getNetworkConfig, type NetworkName } from './network.ts'
import { createViemPublicClient, trezorSignAndSend } from './trezor.ts'

export async function mint(_to: string, _amount: string, network: NetworkName = parseNetwork()) {
  const { chain, rpcUrl, tokenAddress } = getNetworkConfig(network)
  const to = (_to || env.TREZOR_ADDRESS) as `0x${string}`
  const amount = parseUnits(_amount, 18)
  const abi = parseAbi(['function mint(address,uint256)'])

  const publicClient = createViemPublicClient(chain, rpcUrl)

  await publicClient.simulateContract({
    address: tokenAddress,
    abi,
    functionName: 'mint',
    args: [to, amount],
    account: env.TREZOR_ADDRESS,
  })

  const data = encodeFunctionData({ abi, functionName: 'mint', args: [to, amount] })
  const receipt = await trezorSignAndSend({ publicClient, chain, to: tokenAddress, data })

  console.log('✅ mint mined at block', receipt.blockNumber)
  return receipt
}
