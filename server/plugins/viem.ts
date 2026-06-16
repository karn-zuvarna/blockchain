import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { env } from "../libs/env.ts";

export function viewClients() {
    const chain = { ...sepolia, id: env.CHAIN_ID };
    const transport = http(env.RPC_URL);
    const publicClient = createPublicClient({ chain, transport });
    return { publicClient };
}
