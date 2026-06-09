// scripts/deploy.ts
import { network } from "hardhat";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";

interface DeployConfig {
    mint: { to: string; amount: number };
}

async function main() {
    const config = load(
        readFileSync(join("scripts", "deploy.config.yaml"), "utf8")
    ) as DeployConfig;

    const { viem } = await network.connect();
    const [deployer] = await viem.getWalletClients();
    console.log("Deployer address:", deployer.account.address);

    const ico = await viem.deployContract("ICOToken");
    console.log("ICOToken address:", ico.address);

    const recipient = (config.mint.to || deployer.account.address) as `0x${string}`;
    const amount = BigInt(config.mint.amount) * 10n ** 18n;
    await ico.write.mint([recipient, amount]);
    console.log(`Minted ${config.mint.amount} KARN to ${recipient}`);
}
main().then(() => {
    console.log("deployed successfully");
}).catch((error) => {
    console.error(error);
});