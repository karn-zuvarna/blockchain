import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { env } from './libs/env.ts'
import { deploy } from './libs/deploy.ts'
import { mint } from './libs/mint.ts'
import { burn } from './libs/burn.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const app = Fastify({
  logger: true,
  https: {
    cert: readFileSync(resolve(env.TLS_CERT)),
    key:  readFileSync(resolve(env.TLS_KEY)),
  },
})
await app.register(cors, { origin: true })
await app.register(staticFiles, {
  root: join(__dirname, '../public'),
  prefix: '/',
})

app.get('/config', async (_req, reply) => {
  const raw = readFileSync(resolve(__dirname, '../scripts/config.yaml'), 'utf8')
  const cfg = yaml.load(raw) as Record<string, any>
  return reply.send({
    ...cfg,
    trezorAddress: env.TREZOR_ADDRESS,
    sepoliaTokenAddress: env.SEPOLIA_TOKEN_ADDRESS,
    sepoliaDeployedAt: cfg.deployedAt?.sepolia || '',
    mainnetTokenAddress: env.MAINNET_TOKEN_ADDRESS,
    mainnetDeployedAt: cfg.deployedAt?.mainnet || '',
  })
})

app.post('/deploy', async (req, reply) => {
  const { name, symbol, maxSupply, network } = req.body as { name: string; symbol: string; maxSupply: string; network?: string }
  const result = await deploy(name, symbol, maxSupply, network as any)
  return reply.code(201).send(result)
})

app.post('/mint', async (req, reply) => {
  const { to, amount, network, tokenAddress } = req.body as { to: string; amount: string; network?: string; tokenAddress?: string }
  const result = await mint(to, amount, network as any, tokenAddress)
  return reply.code(201).send({ to, amount, network, txHash: result.transactionHash })
})

app.post('/burn', async (req, reply) => {
  const { amount, network, tokenAddress, burnWalletAddress } = req.body as { amount: string; network?: string; tokenAddress?: string; burnWalletAddress?: string }
  const result = await burn(amount, network as any, tokenAddress, burnWalletAddress)
  return reply.code(201).send({ amount, network, txHash: result.transactionHash })
})

try {
  await app.listen({ port: env.PORT })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
