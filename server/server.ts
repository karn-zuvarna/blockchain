import Fastify from 'fastify'
import cors from '@fastify/cors'
import { deploy } from './libs/deploy.ts'
import { mint } from './libs/mint.ts'
import { burn } from './libs/burn.ts'

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

app.post('/deploy', async (req, reply) => {
  const { name, symbol, maxSupply, network } = req.body as { name: string; symbol: string; maxSupply: string; network?: string }
  const result = await deploy(name, symbol, maxSupply, network as any)
  return reply.code(201).send(result)
})

app.post('/mint', async (req, reply) => {
  const { to, amount, network } = req.body as { to: string; amount: string; network?: string }
  const result = await mint(to, amount, network as any)
  return reply.code(201).send({ to, amount, network })
})

app.post('/burn', async (req, reply) => {
  const { who, amount, network } = req.body as { who: string; amount: string; network?: string }
  const result = await burn(amount, who, network as any)
  return reply.code(201).send({ who, amount, network })
})

try {
  await app.listen({ port: 1323 })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
