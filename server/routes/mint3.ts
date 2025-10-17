// server/routes/mint_safe.ts
import dotnet from 'dotenv';
dotnet.config();
import {
  createPublicClient, createWalletClient, http,
  parseAbi, parseUnits, getAddress, isAddress
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import ICOTokenJson from '../../artifacts/contracts/ICOToken.sol/ICOToken.json' with { type: 'json' }


// ---------- helpers ----------
const need = (k: string) => {
  const v = process.env[k]?.trim()
  if (!v) throw new Error(`Missing ENV: ${k}`)
  return v
}
const asPk = (pk: string) => {
  let p = pk.trim()
  if (!p.startsWith('0x')) p = '0x' + p
  if (p.length !== 66) throw new Error(`ISSUER_PRIVATE_KEY length invalid: got ${p.length}, expected 66`)
  return p as `0x${string}`
}
const asAddr = (name: string, v: string) => {
  const s = v.trim()
  if (!s.startsWith('0x') || !isAddress(s)) throw new Error(`${name} invalid: ${s}`)
  return getAddress(s) // checksum
}

async function main() {


  const RPC   = need('SEPOLIA_INFURA_URL')                             // e.g. https://sepolia.infura.io/v3/<ID>
  const PK    = asPk(need('ISSUER_PRIVATE_KEY'))                       // 0x + 64 hex
  const TOKEN = asAddr('ISSUER_TOKEN_ADDRESS', need('ISSUER_TOKEN_ADDRESS'))         // ที่อยู่ "สัญญา" โทเคนเดิม
  const TO    = asAddr('RECIPIENT', need('RECIPIENT'))                 // ผู้รับ

  const account = privateKeyToAccount(PK)
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient  = createWalletClient({ account, chain: sepolia, transport: http(RPC) })

  // ต้องเป็น 'local' มิฉะนั้นจะกลับไปใช้ eth_sendTransaction
  // @ts-ignore
  console.log('walletClient.account.type =', walletClient.account?.type)

  // 1) TOKEN ต้องเป็น "สัญญาจริง"
  const code = await publicClient.getCode({ address: TOKEN })
  if (!code || code === '0x') throw new Error(`ISSUER_TOKEN_ADDRESS has no bytecode on Sepolia: ${TOKEN}`)

  // 2) ทดสอบอ่านฟังก์ชันง่าย ๆ เพื่อตรวจ ABI/Address
  const abi = ICOTokenJson.abi as any
  const decimals = await publicClient.readContract({ address: TOKEN, abi, functionName: 'decimals', args: [] })
  console.log('decimals =', decimals)

  // 3) เตรียมจำนวน + simulate
  const amount = parseUnits('10000', Number(decimals))
  const { request } = await publicClient.simulateContract({
    address: TOKEN,
    abi,
    functionName: 'mint',
    args: [TO, amount],
    account, // สำคัญ: เป็น Local Account object
  })
  console.log('request (from simulate) =', request) // ดูว่า to/data/from ครบไหม

  // 4) ส่งธุรกรรม
  const hash = await walletClient.writeContract(request)
  console.log('tx hash:', hash)

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log('✅ Minted at block:', receipt.blockNumber)
}

main().catch((e) => {
  console.error('❌ FULL ERROR:')
  console.dir(e, { depth: null })     // จะเห็น metaMessages/Request body ชัด ๆ
  console.error('shortMessage:', (e as any)?.shortMessage)
  process.exit(1)
})
