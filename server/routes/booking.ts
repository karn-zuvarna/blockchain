// src/routes/booking.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../libs/prisma.ts";
import { env } from "../libs/env.ts";

export default async function routes(app: FastifyInstance) {
    const CreateBooking = z.object({
        wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
        amount: z.coerce.bigint().positive(),   // เช่น 1000n * 10n**18n
        expiresInSec: z.coerce.number().min(60).max(86400).default(3600),
    });

    app.post("/booking", async (req, reply) => {
        const { wallet, amount, expiresInSec } = CreateBooking.parse(req.body);
        const expiresAt = new Date(Date.now() + expiresInSec * 1000);
        const rec = await prisma.booking.create({
            data: { wallet, amount, status: "PENDING", expiresAt },
        });
        return reply.code(201).send(rec);
    });
}