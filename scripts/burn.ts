// scripts/burn.ts
// Usage: yarn tsx scripts/burn.ts --network sepolia
//        yarn tsx scripts/burn.ts --network mainnet

import { readFileSync } from 'fs'
import { join } from 'path'
import { load } from 'js-yaml'
import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from '../server/libs/env.ts'
import { parseNetwork, getNetworkConfig } from '../server/libs/network.ts'
import { createViemPublicClient, trezorSignAndSend } from '../server/libs/trezor.ts'

interface Config {
  burn: { amount: number; from?: string }
}

async function main() {
  const network = parseNetwork()
  const { chain, rpcUrl, tokenAddress, isMainnet } = getNetworkConfig(network)

  const config = load(readFileSync(join('scripts', 'config.yaml'), 'utf8')) as Config

  const who = (config.burn.from || env.TREZOR_ADDRESS) as `0x${string}`
  const amount = String(config.burn.amount)
  if (!amount) throw new Error('burn.amount is required in config.yaml')

  const publicClient = createViemPublicClient(chain, rpcUrl)
  const abi = parseAbi(['function burnFrom(address,uint256)'])

  await publicClient.simulateContract({
    address: tokenAddress,
    abi,
    functionName: 'burnFrom',
    args: [who, parseUnits(amount, 18)],
    account: env.TREZOR_ADDRESS,
  })

  const data = encodeFunctionData({ abi, functionName: 'burnFrom', args: [who, parseUnits(amount, 18)] })

  if (isMainnet) console.log('⚠️  MAINNET — real ETH will be spent on gas')
  console.log(`Network:       ${network}`)
  console.log(`Token address: ${tokenAddress}`)
  console.log(`Burning ${amount} tokens from ${who} ...`)
  console.log('→ Confirm the transaction on your Trezor device')

  const receipt = await trezorSignAndSend({ publicClient, chain, to: tokenAddress, data })
  console.log('✅ Done. Tx hash:', receipt.transactionHash)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
