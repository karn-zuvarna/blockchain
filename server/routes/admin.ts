// src/routes/admin.ts (ต่อ)
import { createWalletClient, createPublicClient, parseAbi, parseUnits, http } from "viem";
import { FastifyInstance } from "fastify";
import { prisma } from "../libs/prisma.ts";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
dotenv.config();

const erc20Abi = parseAbi([
    "function mint(address to, uint256 amount) external",
]);
import ICOTokenJson from "../../artifacts/contracts/ICOToken.sol/ICOToken.json" with {type: "json"};
import { privateKeyToAccount } from "viem/accounts";
const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY as `0x${string}`);
export default async function routes(app: FastifyInstance) {
    const { abi, bytecode } = ICOTokenJson;
    app.post("/admin/booking/:id/mint", async (req, reply) => {
        const { id } = req.params as { id: string };
        const rec = await prisma.booking.findUniqueOrThrow({ where: { id } });
        if (rec.status !== "PAID") return reply.code(400).send({ error: "NOT_PAID" });

        const abi = parseAbi(['function mint(address to, uint256 amount) external']);

        const to = '0x1234...abcd' as `0x${string}`;
        const amount = parseUnits('1000', 18); // -> bigint
        const publicClient = createPublicClient({ chain: sepolia, transport: http(process.env.RPC_URL as string) });
        const { request } = await publicClient.simulateContract({
            address: process.env.TOKEN_ADDRESS as `0x${string}`,
            abi,
            functionName: 'mint',
            args: [to, amount],
        })
        const issuer = createWalletClient({
            account,
            chain: sepolia,
            transport: http(process.env.RPC_URL as string),
        });

        const hash = await issuer.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
    })
}