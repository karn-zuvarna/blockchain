// src/routes/admin.ts (ต่อ)
import { parseAbi, parseUnits } from "viem";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../libs/prisma.ts";
import { env } from "../libs/env.ts";
import { sepolia } from "viem/chains";
const erc20Abi = parseAbi([
    "function mint(address to, uint256 amount) external",
]);

export default async function routes(app: FastifyInstance) {

    app.post("/admin/booking/:id/mint", async (req, reply) => {
        const { id } = req.params as { id: string };
        const rec = await prisma.booking.findUniqueOrThrow({ where: { id } });
        if (rec.status !== "PAID") return reply.code(400).send({ error: "NOT_PAID" });

        const abi = parseAbi(['function mint(address to, uint256 amount) external']);

        const to = '0x1234...abcd' as `0x${string}`;
        const amount = parseUnits('1000', 18); // -> bigint

        const { walletClient, publicClient } = app.viem; // register ไว้ตอน boot
        const txHash = await walletClient.writeContract({
            address: env.TOKEN_ADDRESS as `0x${string}`,
            abi,
            functionName: 'mint',
            args: [to, amount],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // รอให้ยืนยัน
        await prisma.booking.update({
            where: { id },
            data: { status: "ONCHAIN_DONE", txHash: txHash },
        });
        return reply.send({ txHash, blockNumber: receipt.blockNumber });
    });
}