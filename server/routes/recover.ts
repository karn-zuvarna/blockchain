// scripts/recover.ts
import 'dotenv/config'
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const RPC   = process.env.SEPOLIA_RPC!
const PK    = process.env.ADMIN_PRIVATE_KEY as `0x${string}`
const TOKEN = process.env.TOKEN_ADDRESS as `0x${string}`

const abi = parseAbi([
  'function decimals() view returns (uint8)',
  'function recover(address from, address to, uint256 amount, string reason)',
])

async function main(from: `0x${string}`, to: `0x${string}`, amt: string, reason: string) {
  const account = privateKeyToAccount(PK)
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC) })

  const decimals = await publicClient.readContract({ address: TOKEN, abi, functionName: 'decimals' })
  const amount = parseUnits(amt, Number(decimals))

  const { request } = await publicClient.simulateContract({
    address: TOKEN, abi, functionName: 'recover',
    args: [from, to, amount, reason], account
  })
  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log(`✅ Recovered ${amt} tokens from ${from} to ${to}`)
}

main(process.argv[2] as `0x${string}`, process.argv[3] as `0x${string}`, process.argv[4], process.argv[5] ?? '')
  .catch(e => (console.error(e), process.exit(1)))
