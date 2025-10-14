// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';

// ✅ ประกาศตัวแปร PrismaClient แบบ global (ป้องกันสร้างหลาย instance ระหว่าง hot-reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// ✅ สร้าง client (เชื่อมกับ DATABASE_URL จาก env.ts)
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: isProd
            ? ['error'] // production จะ log เฉพาะ error
            : ['query', 'info', 'warn', 'error'], // dev จะ log เยอะ
    });

// ✅ เก็บไว้ใน global เพื่อใช้ซ้ำ (โดยเฉพาะใน dev / hot-reload)
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

// ✅ middleware ตัวอย่าง (optional): log query เวลา dev
if (!isProd) {
    prisma.$use(async (params: any, next: any) => {
        const start = Date.now();
        const result = await next(params);
        const duration = Date.now() - start;
        console.log(`⏱️ [${params.model}.${params.action}] ${duration}ms`);
        return result;
    });
}

// ✅ handle process exit อย่างปลอดภัย
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});