// scripts/mint.ts
// Usage: yarn tsx scripts/mint.ts --network sepolia
//        yarn tsx scripts/mint.ts --network mainnet

import { readFileSync } from 'fs'
import { join } from 'path'
import { load } from 'js-yaml'
import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from '../server/libs/env.ts'
import { parseNetwork, getNetworkConfig } from '../server/libs/network.ts'
import { createViemPublicClient, trezorSignAndSend } from '../server/libs/trezor.ts'

interface Config {
  mint: { to: string; amount: number }
}

async function main() {
  const network = parseNetwork()
  const { chain, rpcUrl, tokenAddress, isMainnet } = getNetworkConfig(network)

  const config = load(readFileSync(join('scripts', 'config.yaml'), 'utf8')) as Config

  const to = (config.mint.to || env.TREZOR_ADDRESS) as `0x${string}`
  const amount = String(config.mint.amount)
  if (!amount) throw new Error('mint.amount is required in config.yaml')

  const publicClient = createViemPublicClient(chain, rpcUrl)
  const abi = parseAbi(['function mint(address,uint256)'])

  await publicClient.simulateContract({
    address: tokenAddress,
    abi,
    functionName: 'mint',
    args: [to, parseUnits(amount, 18)],
    account: env.TREZOR_ADDRESS,
  })

  const data = encodeFunctionData({ abi, functionName: 'mint', args: [to, parseUnits(amount, 18)] })

  if (isMainnet) console.log('⚠️  MAINNET — real ETH will be spent on gas')
  console.log(`Network:       ${network}`)
  console.log(`Token address: ${tokenAddress}`)
  console.log(`Minting ${amount} tokens to ${to} ...`)
  console.log('→ Confirm the transaction on your Trezor device')

  const receipt = await trezorSignAndSend({ publicClient, chain, to: tokenAddress, data })
  console.log('✅ Done. Tx hash:', receipt.transactionHash)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
