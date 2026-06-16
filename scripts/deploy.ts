// scripts/deploy.ts
// Usage: yarn tsx scripts/deploy.ts --network sepolia
//        yarn tsx scripts/deploy.ts --network mainnet
// For local Hardhat testing: yarn hardhat run scripts/deploy-hardhat.ts

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { load, dump } from 'js-yaml'
import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { env } from '../server/libs/env.ts'
import { parseNetwork, getDeployNetworkConfig } from '../server/libs/network.ts'
import { createViemPublicClient, trezorDeploy, trezorSignAndSend } from '../server/libs/trezor.ts'
import artifact from '../artifacts/contracts/ICOToken.sol/ICOToken.json' assert { type: 'json' }

interface Config {
  token: { name: string; symbol: string }
  mint: { to: string; amount: number }
  burn: { contractAddress: string; amount: number }
}

function updateEnvFile(key: string, value: string) {
  const envPath = join('.env')
  let content = readFileSync(envPath, 'utf8')
  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${value}`)
  } else {
    content += `\n${key}=${value}`
  }
  writeFileSync(envPath, content)
}

async function main() {
  const network = parseNetwork()
  const { chain, rpcUrl, isMainnet, envKey } = getDeployNetworkConfig(network)

  const configPath = join('scripts', 'config.yaml')
  const config = load(readFileSync(configPath, 'utf8')) as Config

  const { name, symbol } = config.token
  if (!name) throw new Error('token.name is required in config.yaml')
  if (!symbol) throw new Error('token.symbol is required in config.yaml')

  const publicClient = createViemPublicClient(chain, rpcUrl)

  if (isMainnet) console.log('⚠️  MAINNET deployment — real ETH will be spent')
  console.log(`Network:          ${network}`)
  console.log(`Deployer (Trezor): ${env.TREZOR_ADDRESS}`)
  console.log(`Deploying ICOToken (${name} / ${symbol}) ...`)
  console.log('→ Confirm the transaction on your Trezor device')

  const receipt = await trezorDeploy({
    publicClient,
    chain,
    abi: artifact.abi as any,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [name, symbol],
  })

  const contractAddress = receipt.contractAddress
  if (!contractAddress) throw new Error('Deploy failed: no contract address in receipt')

  console.log(`✅ ICOToken deployed at: ${contractAddress}`)
  console.log(`   Tx hash: ${receipt.transactionHash}`)
  console.log(`   Block:   ${receipt.blockNumber}`)

  // Save to config.yaml + .env
  config.burn.contractAddress = contractAddress
  writeFileSync(configPath, dump(config))
  updateEnvFile(envKey, contractAddress)
  console.log(`\nSaved ${envKey}=${contractAddress}`)

  // Auto-mint initial supply
  const mintTo = (config.mint.to || env.TREZOR_ADDRESS) as `0x${string}`
  const mintAmount = String(config.mint.amount)
  const mintAbi = parseAbi(['function mint(address,uint256)'])

  console.log(`\nMinting ${mintAmount} ${symbol} to ${mintTo} ...`)
  console.log('→ Confirm the transaction on your Trezor device')

  const mintData = encodeFunctionData({
    abi: mintAbi,
    functionName: 'mint',
    args: [mintTo, parseUnits(mintAmount, 18)],
  })

  const mintReceipt = await trezorSignAndSend({
    publicClient,
    chain,
    to: contractAddress,
    data: mintData,
  })

  console.log(`✅ Minted ${mintAmount} ${symbol} → Tx: ${mintReceipt.transactionHash}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
