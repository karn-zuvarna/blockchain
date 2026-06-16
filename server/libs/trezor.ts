import TrezorConnectModule from '@trezor/connect'
const TrezorConnect = (TrezorConnectModule as any).default ?? TrezorConnectModule
import {
  createPublicClient,
  http,
  serializeTransaction,
  encodeDeployData,
  type Abi,
  type PublicClient,
  type Chain,
} from 'viem'
import { sepolia } from 'viem/chains'
import { env } from './env.ts'

let initialized = false

export async function initTrezor() {
  if (initialized) return
  await TrezorConnect.init({
    manifest: {
      email: env.TREZOR_APP_EMAIL,
      appUrl: env.TREZOR_APP_URL,
    },
    // Connects via Trezor Bridge / Trezor Suite running on this machine
    lazyLoad: false,
    env: 'node',
  })
  initialized = true
}

type SignAndSendParams = {
  publicClient: PublicClient
  chain: Chain
  to: `0x${string}`
  data: `0x${string}`
}

export async function trezorSignAndSend({ publicClient, chain, to, data }: SignAndSendParams) {
  await initTrezor()

  const [nonce, fees, gasLimit] = await Promise.all([
    publicClient.getTransactionCount({ address: env.TREZOR_ADDRESS }),
    publicClient.estimateFeesPerGas(),
    publicClient.estimateGas({ account: env.TREZOR_ADDRESS, to, data }),
  ])

  const { maxFeePerGas, maxPriorityFeePerGas } = fees

  const result = await TrezorConnect.ethereumSignTransaction({
    path: env.TREZOR_PATH,
    transaction: {
      to,
      value: '0x0',
      data,
      chainId: chain.id,
      nonce: `0x${nonce.toString(16)}`,
      gasLimit: `0x${gasLimit.toString(16)}`,
      maxFeePerGas: `0x${maxFeePerGas!.toString(16)}`,
      maxPriorityFeePerGas: `0x${maxPriorityFeePerGas!.toString(16)}`,
    },
  })

  if (!result.success) {
    throw new Error(`Trezor signing failed: ${result.payload.error}`)
  }

  const { v, r, s } = result.payload
  const signedTx = serializeTransaction(
    {
      type: 'eip1559',
      to,
      value: 0n,
      data,
      chainId: chain.id,
      nonce,
      gas: gasLimit,
      maxFeePerGas: maxFeePerGas!,
      maxPriorityFeePerGas: maxPriorityFeePerGas!,
    },
    {
      v: BigInt(v),
      r: r as `0x${string}`,
      s: s as `0x${string}`,
    },
  )

  const hash = await publicClient.sendRawTransaction({ serializedTransaction: signedTx })
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  TrezorConnect.dispose()
  initialized = false
  return receipt
}

export function createViemPublicClient(chain?: Chain, rpcUrl?: string) {
  const c = chain ?? { ...sepolia, id: env.CHAIN_ID }
  return createPublicClient({ chain: c, transport: http(rpcUrl ?? env.RPC_URL) })
}

type DeployParams = {
  publicClient: PublicClient
  chain: Chain
  abi: Abi
  bytecode: `0x${string}`
  args?: unknown[]
}

export async function trezorDeploy({ publicClient, chain, abi, bytecode, args = [] }: DeployParams) {
  await initTrezor()

  const data = encodeDeployData({ abi, bytecode, args })

  const [nonce, fees, gasLimit] = await Promise.all([
    publicClient.getTransactionCount({ address: env.TREZOR_ADDRESS }),
    publicClient.estimateFeesPerGas(),
    publicClient.estimateGas({ account: env.TREZOR_ADDRESS, data }),
  ])

  const { maxFeePerGas, maxPriorityFeePerGas } = fees

  const result = await TrezorConnect.ethereumSignTransaction({
    path: env.TREZOR_PATH,
    transaction: {
      to: '',  // empty = contract creation
      value: '0x0',
      data,
      chainId: chain.id,
      nonce: `0x${nonce.toString(16)}`,
      gasLimit: `0x${gasLimit.toString(16)}`,
      maxFeePerGas: `0x${maxFeePerGas!.toString(16)}`,
      maxPriorityFeePerGas: `0x${maxPriorityFeePerGas!.toString(16)}`,
    },
  })

  if (!result.success) {
    throw new Error(`Trezor signing failed: ${result.payload.error}`)
  }

  const { v, r, s } = result.payload
  const signedTx = serializeTransaction(
    {
      type: 'eip1559',
      to: null,  // null = contract creation in viem
      value: 0n,
      data,
      chainId: chain.id,
      nonce,
      gas: gasLimit,
      maxFeePerGas: maxFeePerGas!,
      maxPriorityFeePerGas: maxPriorityFeePerGas!,
    },
    { v: BigInt(v), r: r as `0x${string}`, s: s as `0x${string}` },
  )

  const hash = await publicClient.sendRawTransaction({ serializedTransaction: signedTx })
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
  TrezorConnect.dispose()
  initialized = false
  return receipt
}
