// src/lib/env.ts
import 'dotenv/config';
import { z } from 'zod';

// ✅ กำหนด schema ของ environment variables ทั้งหมด
const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    PORT: z.coerce.number().default(3000),

    DATABASE_URL: z
        .string()
        .url({ message: 'DATABASE_URL ต้องเป็น URL เช่น postgresql://...' }),

    // สำหรับเชื่อมต่อ blockchain
    RPC_URL: z
        .string()
        .url({ message: 'RPC_URL ต้องเป็น URL ของ RPC endpoint เช่น https://sepolia.infura.io/v3/...' }),

    CHAIN_ID: z.coerce.number().default(11155111), // sepolia = 11155111

    TOKEN_ADDRESS: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'TOKEN_ADDRESS ต้องเป็น address ที่ขึ้นต้นด้วย 0x และมี 42 ตัวอักษร'),

    SERVER_PRIVATE_KEY: z
        .string()
        .regex(/^0x[a-fA-F0-9]{64}$/, 'SERVER_PRIVATE_KEY ต้องเป็น Hex 64 หลักขึ้นต้นด้วย 0x'),

    // Optional values
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// ✅ Parse environment variables จาก process.env
export const env = EnvSchema.parse(process.env);

// ✅ export type เผื่อใช้กับ type inference อื่น ๆ
export type Env = z.infer<typeof EnvSchema>;

// ✅ helper function (optional)
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';