import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(443),
  TLS_CERT: z.string().default('certs/cert.pem'),
  TLS_KEY: z.string().default('certs/key.pem'),

  // Sepolia (default network)
  SEPOLIA_RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().default(11155111),
  SEPOLIA_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  // Mainnet
  MAINNET_RPC_URL: z.string().url().optional(),
  MAINNET_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),

  // Trezor hardware wallet — private key never leaves the device
  TREZOR_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((v) => v as `0x${string}`),
  TREZOR_PATH: z.string().default("m/44'/60'/0'/0/0"),
  TREZOR_APP_EMAIL: z.string().email().default('admin@example.com'),
  TREZOR_APP_URL: z.string().url().default('http://localhost:1323'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export const env = EnvSchema.parse(process.env)
export type Env = z.infer<typeof EnvSchema>
export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
