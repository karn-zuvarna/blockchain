// scripts/freeze.ts
import 'dotenv/config'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { asPk, need } from './utils.ts'

const RPC  = process.env.SEPOLIA_INFURA_URL!
const PK    = asPk(need('ISSUER_PRIVATE_KEY'))
const TOKEN= process.env.ISSUER_TOKEN_ADDRESS as `0x${string}`

const abi = parseAbi([
  'function setFrozen(address account, bool frozen, string reason)',
])

async function main() {
    const accountToFreeze = process.env.HACKER1_ADDRESS as `0x${string}`
    const frozen = true
    const reason = process.env.REASON ?? ''
    console.log('private key =', PK )
    console.log('reason =', reason)
  const account = privateKeyToAccount(PK as `0x${string}`)
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC) })
const abi = parseAbi([
  'function RECOVER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function setFrozen(address account, bool frozen, string reason)',
]);
 try {
    const recoverRole = await publicClient.readContract({ address: TOKEN, abi: abi, functionName: 'RECOVER_ROLE' })
    console.log('✅ Supports RECOVER_ROLE:', recoverRole)
    console.log('✅ Likely supports setFrozen() (freeze/recover features present)')
  } catch {
    console.log('❌ This contract does NOT expose RECOVER_ROLE/setFrozen (no freeze/recover features).')
  }
  const { request } = await publicClient.simulateContract({
    address: TOKEN, abi, functionName: 'setFrozen',
    args: [accountToFreeze, frozen, reason], account
  })
  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log(`✅ ${frozen ? 'FROZEN' : 'UNFROZEN'}:`, accountToFreeze)
}

main().catch(e => (console.error(e), process.exit(1)))
