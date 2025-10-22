import { createPublicClient, createWalletClient, http, parseUnits, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

import dotenv from "dotenv";
dotenv.config();

export async function mint(_to:string, _amount: string) {
    const account = privateKeyToAccount(`0x${process.env.ISSUER_PRIVATE_KEY as string}`);
    const RPC = process.env.SEPOLIA_INFURA_URL! // https://sepolia.infura.io/v3/<PROJECT_ID>
    const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
    const walletClient  = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
    // 👆 account เป็น Local แล้ว -> viem จะส่งแบบ eth_sendRawTransaction
    
    // ตัวอย่าง deploy
    // const deployHash = await walletClient.deployContract({ abi, bytecode })
    // const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
    
    // ตัวอย่าง mint
    const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS as `0x${string}`
    const to = _to as `0x${string}`
    const abi = parseAbi(['function mint(address,uint256)'])
    const amount = parseUnits(_amount, 18)
    
    const { request } = await publicClient.simulateContract({
      address: ISSUER_ADDRESS,
      abi,
      functionName: 'mint',
      args: [to, amount],
      account, // สำคัญมาก
    })
    
    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
    console.log('✅ mined at block', receipt.blockNumber)
}
