import { createPublicClient, createWalletClient, http, parseUnits, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

import dotenv from "dotenv";
dotenv.config();

export async function freeze(_who:string) {
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
    const who = _who as `0x${string}`
    const abi = parseAbi(['function freeze(address)'])
    // const amount = parseUnits(_amount, 18)
    
    const { request } = await publicClient.simulateContract({
      address: ISSUER_ADDRESS,
      abi,
      functionName: 'freeze',
      args: [who],
      account, // สำคัญมาก
    })
    
    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
    console.log('✅ freeze account:', who)
}
