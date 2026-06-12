// scripts/gas-check.ts
// Estimates gas for each ICOToken function using the local hardhat network.
import { network } from "hardhat";
import { mkdirSync, writeFileSync } from "fs";
import artifacts from "../artifacts/contracts/ICOToken.sol/ICOToken.json";

const ETH_PRICE_USD = 3000;
const GWEI = 20;

function usd(gas: bigint) {
    const eth = Number(gas) * GWEI * 1e-9;
    return `$${(eth * ETH_PRICE_USD).toFixed(4)}`;
}

async function main() {
    const { viem } = await network.create();
    const [owner, alice] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const results: { name: string; gas: bigint }[] = [];

    // ── Deploy gas ─────────────────────────────────────────────────────────────
    const deployGas = await publicClient.estimateGas({
        account: owner.account,
        data: artifacts.bytecode as `0x${string}`,
    });
    results.push({ name: "deploy ICOToken", gas: deployGas });

    // Deploy for real so we can estimate function calls
    const ico = await viem.deployContract("ICOToken");
    await ico.write.mint([owner.account.address, 1000n * 10n ** 18n]);

    const abi = artifacts.abi;
    const address = ico.address;

    async function est(name: string, functionName: string, args: unknown[], account = owner.account) {
        const gas = await publicClient.estimateContractGas({ address, abi, functionName, args, account });
        results.push({ name, gas });
    }

    // ── Function estimates ─────────────────────────────────────────────────────
    await est("mint()",      "mint",      [owner.account.address, 100n * 10n ** 18n]);
    await est("transfer()",  "transfer",  [alice.account.address, 100n * 10n ** 18n]);
    await est("freeze()",    "freeze",    [alice.account.address]);

    // recall needs alice to be frozen first
    await ico.write.freeze([alice.account.address]);
    await ico.write.transfer([alice.account.address, 100n * 10n ** 18n]);
    await est("recall()",    "recall",    [alice.account.address, owner.account.address, 50n * 10n ** 18n]);
    await ico.write.recall([alice.account.address, owner.account.address, 50n * 10n ** 18n]);

    await est("unfreeze()",  "unfreeze",  [alice.account.address]);
    await est("burnFrom()",  "burnFrom",  [owner.account.address, 50n * 10n ** 18n]);

    // ── Print table ────────────────────────────────────────────────────────────
    const col = [22, 12, 20];
    const header = ["Function", "Gas used", `Est. cost @${GWEI}gwei/$${ETH_PRICE_USD}`];
    const sep = col.map(w => "-".repeat(w)).join("-+-");
    const fmt = (r: string[]) => r.map((v, i) => v.padEnd(col[i])).join(" | ");

    const lines = [
        "ICOToken Gas Report",
        `Generated: ${new Date().toISOString()}`,
        "",
        fmt(header),
        sep,
        ...results.map(r => fmt([r.name, r.gas.toString(), usd(r.gas)])),
        sep,
        "",
        `Assumptions: gas price = ${GWEI} gwei, ETH = $${ETH_PRICE_USD} USD`,
    ];

    console.log("\n" + lines.join("\n"));

    // ── Write log ──────────────────────────────────────────────────────────────
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toISOString().slice(11, 19).replace(/:/g, "-");
    mkdirSync(`logs/${date}`, { recursive: true });
    const logPath = `logs/${date}/gas-report-${time}.md`;
    writeFileSync(logPath, `# ICOToken Gas Report\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n`);
    console.log(`\nLog saved to ${logPath}`);
}

main().catch(console.error);
