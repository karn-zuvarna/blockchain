import 'dotenv/config'
import {
  createPublicClient, createWalletClient, http,
  parseAbi, parseUnits, getAddress, isAddress
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

/** ---------- helpers ---------- */
const need = (k: string) => {
  const v = process.env[k]?.trim()
  if (!v) throw new Error(`Missing ENV: ${k}`)
  return v
}
const asPk = (pk: string) => {
  let p = pk.trim()
  if (!p.startsWith('0x')) p = '0x' + p
  if (p.length !== 66) throw new Error(`Invalid ${p.length}-char private key. Need 66 (0x + 64 hex).`)
  return p as `0x${string}`
}
const asAddr = (name: string, v: string) => {
  const s = v.trim()
  if (!s.startsWith('0x') || !isAddress(s)) throw new Error(`${name} invalid: ${s}`)
  return getAddress(s) // checksum
}

/** ---------- main ---------- */
async function main() {
  const RPC   = need('SEPOLIA_INFURA_URL')
  const PK    = asPk(need('ISSUER_PRIVATE_KEY'))
  const TOKEN = asAddr('ISSUER_TOKEN_ADDRESS', need('ISSUER_TOKEN_ADDRESS'))
  const TO    = asAddr('CLIENT2_ADDRESS', need('CLIENT2_ADDRESS'))
  const AMT   = need('AMOUNT')

  // Local account → viem จะส่งแบบ eth_sendRawTransaction (ไม่โดน error eth_sendTransaction)
  const account = privateKeyToAccount(PK)

  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient  = createWalletClient({ account, chain: sepolia, transport: http(RPC) })

  // ยืนยันว่า address เป็นสัญญาจริง
  const code = await publicClient.getCode({ address: TOKEN })
  if (!code || code === '0x') {
    throw new Error(`ISSUER_TOKEN_ADDRESS has no bytecode on Sepolia (EOA or wrong network): ${TOKEN}`)
  }

  // ABI ที่พอใช้งาน (ERC20 มาตรฐาน)
  const abi = parseAbi([
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
  ])

  const [name, symbol, decimals] = await Promise.all([
    publicClient.readContract({ address: TOKEN, abi, functionName: 'name' }),
    publicClient.readContract({ address: TOKEN, abi, functionName: 'symbol' }),
    publicClient.readContract({ address: TOKEN, abi, functionName: 'decimals' }),
  ])

  const amount = parseUnits(AMT, Number(decimals))
  console.log(`Token: ${name} (${symbol}), decimals: ${decimals}`)
  console.log(`Sender: ${account.address}`)
  console.log(`Recipient: ${TO}`)
  console.log(`Amount (wei-like): ${amount}`)

  // balance ก่อนโอน
  const [senderBefore, toBefore] = await Promise.all([
    publicClient.readContract({ address: TOKEN, abi, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: TOKEN, abi, functionName: 'balanceOf', args: [TO] }),
  ])
  console.log('Balance before - sender:', senderBefore.toString())
  console.log('Balance before - recip :', toBefore.toString())

  // simulate → จับ revert ได้ก่อน พร้อมคำนวณ gas
  const { request } = await publicClient.simulateContract({
    address: TOKEN,
    abi,
    functionName: 'transfer',
    args: [TO, amount],
    account, // สำคัญ: Local Account object
  })

  // ส่งธุรกรรมจริง (sign + send raw)
  const hash = await walletClient.writeContract(request)
  console.log('tx hash:', hash)

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log('✅ Mined in block:', receipt.blockNumber)

  const [senderAfter, toAfter] = await Promise.all([
    publicClient.readContract({ address: TOKEN, abi, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: TOKEN, abi, functionName: 'balanceOf', args: [TO] }),
  ])
  console.log('Balance after  - sender:', senderAfter.toString())
  console.log('Balance after  - recip :', toAfter.toString())
}

main().catch((e) => {
  console.error('❌', (e as any)?.shortMessage ?? (e as any)?.message ?? e)
  // ถ้าอยากดู request body/params ของ RPC แบบเต็ม:
  // console.dir(e, { depth: null })
  process.exit(1)
})
