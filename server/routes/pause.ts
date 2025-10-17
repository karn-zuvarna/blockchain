// scripts/pause.ts
import 'dotenv/config'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const RPC   = process.env.SEPOLIA_RPC!
const PK    = process.env.ADMIN_PRIVATE_KEY as `0x${string}`
const TOKEN = process.env.TOKEN_ADDRESS as `0x${string}`

const abi = parseAbi([
  'function pause()',
  'function unpause()'
])

async function main(cmd: 'pause'|'unpause') {
  const account = privateKeyToAccount(PK)
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC) })

  const fn = cmd === 'pause' ? 'pause' : 'unpause'
  const { request } = await publicClient.simulateContract({ address: TOKEN, abi, functionName: fn, args: [], account })
  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log(`✅ ${cmd.toUpperCase()}D`)
}

main(process.argv[2] as any).catch(e => (console.error(e), process.exit(1)))
