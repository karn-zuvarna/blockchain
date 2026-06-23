import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from './env.ts'
import { parseNetwork, getNetworkConfig, type NetworkName } from './network.ts'
import { createViemPublicClient, trezorSignAndSend } from './trezor.ts'

export async function burn(_amount: string, network: NetworkName = parseNetwork(), _tokenAddress?: string, _burnWalletAddress?: string) {
  const { chain, rpcUrl, tokenAddress: defaultTokenAddress } = getNetworkConfig(network)
  const tokenAddress = (_tokenAddress as `0x${string}`) || defaultTokenAddress
  const burnWalletAddress = (_burnWalletAddress as `0x${string}`) || tokenAddress
  const amount = parseUnits(_amount, 18)
  const abi = parseAbi(['function burnFrom(address,uint256)'])

  const publicClient = createViemPublicClient(chain, rpcUrl)

  await publicClient.simulateContract({
    address: tokenAddress,
    abi,
    functionName: 'burnFrom',
    args: [burnWalletAddress, amount],
    account: env.TREZOR_ADDRESS,
  })

  const data = encodeFunctionData({ abi, functionName: 'burnFrom', args: [burnWalletAddress, amount] })
  const receipt = await trezorSignAndSend({ publicClient, chain, to: tokenAddress, data })

  console.log('✅ burn mined at block', receipt.blockNumber)
  return receipt
}
