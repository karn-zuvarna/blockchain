// src/types/fastify.d.ts
import type { PublicClient, WalletClient } from 'viem';

declare module 'fastify' {
    interface FastifyInstance {
        viem: {
            publicClient: PublicClient;
            walletClient: WalletClient;
        };
    }
}

export { };