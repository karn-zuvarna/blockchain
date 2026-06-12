// scripts/destroy.ts
import { network } from "hardhat";
import { readFileSync } from "fs";
import { load } from "js-yaml";

interface DestroyConfig {
    burn: { contractAddress: string; from: string; amount: number };
}

async function main() {
    const config = load(
        readFileSync("scripts/destroy.config.yaml", "utf8")
    ) as DestroyConfig;

    const { contractAddress, from, amount } = config.burn;
    if (!contractAddress) throw new Error("burn.contractAddress is required in destroy.config.yaml");
    if (!amount || amount <= 0) throw new Error("burn.amount must be greater than 0");

    const { viem } = await network.create();
    const [deployer] = await viem.getWalletClients();
    console.log("Deployer address:", deployer.account.address);

    const ico = await viem.getContractAt("ICOToken", contractAddress as `0x${string}`);

    const target = (from || deployer.account.address) as `0x${string}`;
    const amountWei = BigInt(amount) * 10n ** 18n;

    const balanceBefore = await ico.read.balanceOf([target]);
    console.log(`Balance before: ${balanceBefore / 10n ** 18n} KARN`);

    await ico.write.burnFrom([target, amountWei]);
    console.log(`Burned ${amount} KARN from ${target}`);

    const balanceAfter = await ico.read.balanceOf([target]);
    console.log(`Balance after:  ${balanceAfter / 10n ** 18n} KARN`);
}

main().then(() => {
    console.log("done");
}).catch((error) => {
    console.error(error);
});
