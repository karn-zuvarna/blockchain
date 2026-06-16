// scripts/deploy.ts
import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { load, dump } from "js-yaml";
import { join } from "path";

interface DeployConfig {
    token: { name: string; symbol: string; maxSupply: number };
    mint: { to: string; amount: number };
}

async function main() {
    const config = load(
        readFileSync(join("scripts", "config.yaml"), "utf8")
    ) as DeployConfig;

    const { viem } = await network.create();
    const [deployer] = await viem.getWalletClients();
    console.log("Deployer address:", deployer.account.address);

    const { name, symbol, maxSupply } = config.token;
    if (!name) throw new Error("token.name is required in config.yaml");
    if (!symbol) throw new Error("token.symbol is required in config.yaml");
    if (!maxSupply || maxSupply <= 0) throw new Error("token.maxSupply must be greater than 0 in config.yaml");

    const maxSupplyWei = BigInt(maxSupply) * 10n ** 18n;
    const ico = await viem.deployContract("ICOToken", [name, symbol, maxSupplyWei]);
    console.log("ICOToken deployed:", ico.address, `(${name} / ${symbol})`);

    const recipient = (config.mint.to || deployer.account.address) as `0x${string}`;
    const amount = BigInt(config.mint.amount) * 10n ** 18n;
    await ico.write.mint([recipient, amount]);
    console.log(`Minted ${config.mint.amount} ${config.token.symbol} to ${recipient}`);

    const destroyConfigPath = join("scripts", "config.yaml");
    const destroyConfig = load(readFileSync(destroyConfigPath, "utf8")) as any;
    destroyConfig.burn.contractAddress = ico.address;
    writeFileSync(destroyConfigPath, dump(destroyConfig));
    console.log(`Updated destroy.config.yaml with contractAddress: ${ico.address}`);
}
main().then(() => {
    console.log("deployed successfully");
}).catch((error) => {
    console.error(error);
});