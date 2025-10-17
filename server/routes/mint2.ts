import 'dotenv/config'
import { createWalletClient, createPublicClient, parseUnits, parseAbi, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import ICOTokenJson from '../../artifacts/contracts/ICOToken.sol/ICOToken.json' with { type: 'json' }

// ===== ENV ที่ต้องมี =====
// SEPOLIA_INFURA_URL=https://sepolia.infura.io/v3/<PROJECT_ID>
// ISSUER_PRIVATE_KEY=0x... (66 ตัวอักษร รวม 0x)
// TOKEN_ADDRESS=0x... (ที่อยู่ "สัญญา" โทเคนเดิม)
// CLIENT2_ADDRESS=0x... (ปลายทางที่จะได้รับโทเคน)

(async () => {
  const RPC = process.env.SEPOLIA_INFURA_URL!
  const PK =  `0x${process.env.ISSUER_PRIVATE_KEY!}`
  console.log('PK:', PK)
if (!PK?.startsWith('0x') || PK.length !== 66) {
  throw new Error('ISSUER_PRIVATE_KEY ต้องเป็น 0x + 64 ตัวอักษร hex')
}
  const account = privateKeyToAccount(PK as `0x${string}`) // ✅ Local Account

  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
  const walletClient  = createWalletClient({ account, chain: sepolia, transport: http(RPC) })

  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}`   // ✅ สัญญา ไม่ใช่ EOA
  const TO            = process.env.CLIENT2_ADDRESS as `0x${string}`

  // (ไม่จำเป็นต้องใช้ bytecode ถ้าแค่ mint)
  const abi = ICOTokenJson.abi as any

  // ยืนยันว่า TOKEN_ADDRESS เป็นสัญญาจริง
  const code = await publicClient.getCode({ address: TOKEN_ADDRESS })
  if (!code || code === '0x') throw new Error('❌ TOKEN_ADDRESS ไม่มี bytecode (อาจเป็น EOA หรือเครือข่ายผิด)')
const decimals = await publicClient.readContract({ 
    address: TOKEN_ADDRESS, 
    abi, 
    functionName: 'decimals',
    args: [] 
})
  const amount = parseUnits('1000', Number(decimals))

  // simulate ก่อน (เช็กสิทธิ์/คำนวณ gas/หาสาเหตุ revert)
  const { request } = await publicClient.simulateContract({
    address: TOKEN_ADDRESS,
    abi,
    functionName: 'mint',
    args: [TO, amount],
    account, // ✅ สำคัญมาก
  })

  // ส่งธุรกรรมจริง (ลงนามด้วย private key → ใช้ eth_sendRawTransaction อัตโนมัติ)
  const hash = await walletClient.writeContract(request)

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  console.log('✅ Minted at block:', receipt.blockNumber)
})().catch((e) => {
  console.error('❌', e?.shortMessage ?? e?.message ?? e)
  process.exit(1)
})
