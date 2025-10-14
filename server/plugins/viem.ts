import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { env } from "../libs/env.ts";
import { create } from "domain";

export function viewClients() {
    const account = privateKeyToAccount(env.SERVER_PRIVATE_KEY as '0x${string}');
    const chain = {...sepolia, id: Number(env.CHAIN_ID)};
    const transport = http(env.RPC_URL);

    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ account, chain, transport });
    return { publicClient, walletClient };
}