// import { config as dotenv } from "dotenv";
// dotenv();

import { parseEther } from "viem";
// const hre = require("hardhat");
import "@nomicfoundation/hardhat-toolbox-viem";
import hre from "hardhat";
// const hre = hreBase as any;
/**
 * ขั้นตอน:
 * 1) Deploy MyToken
 * 2) Deploy ICO ด้วยพารามิเตอร์
 * 3) โอน ownership ของ MyToken ให้ ICO (เพื่อ mint ตอนขาย)
 */

async function main() {
    const {viem} = await hre.network.connect()
    const [sender, deployer] = await viem.getWalletClients()
    console.log("Deploying contracts with the account:", deployer.account.address);

    // 1. Deploy MyToken
    const icoToken = await viem.deployContract("ICOToken", ["ICO Token", "ICT"]);
    const icoTokenAddress = icoToken.address;
    console.log("ICOToken deployed at:", icoTokenAddress);

    // เวลาขาย (เริ่มหลังจากตอนนี้ 60s, จบอีก 1 ชม.)
    const now = BigInt(Math.floor(Date.now() / 1000));
    const start = now + 60n; // 1 นาทีจากนี้
    const end = start + 3600n;

    // rate = 1000 MTK ต่อ 1 ETH (ถ้า token 18 decimals ให้คิดเท่ากัน)
    const rate = 1000n; // 1 ETH = 1000 MTK
    const hardCap = parseEther("100"); // 100 ETH

    // 2. Deploy ICO
    const fundWallet = deployer.account.address; // รับเงินที่ขายได้
    const ico = await viem.deployContract("ICO", [
        icoTokenAddress,
        rate,
        fundWallet,
        start,
        end,
        hardCap
    ]);
    const icoAddress = ico.address;
    console.log("ICO deployed at:", icoAddress);

    // 3. โอน ownership ของ MyToken ให้ ICO (เพื่อ mint ตอนขาย)
    const tokenContract = await viem.getContractAt("ICOToken", icoTokenAddress);
    const tx = await tokenContract.write.transferOwnership([icoAddress]);
    const publicClient = await viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log("Ownership of ICOToken transferred to ICO:");

    console.log("\n== Done ==");
    console.log("receipt status:", receipt.status);
    console.log("Token:", icoTokenAddress);
    console.log("ICO  :", icoAddress);
    console.log("Sale window:", Number(start), "->", Number(end));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// scripts/deploy.ts
// import "dotenv/config";
// import "@nomicfoundation/hardhat-toolbox-viem";
// import hreBase from "hardhat";
// const hre = hreBase as any;
// async function main() {
//     const publicClient = await hre.viem.getPublicClient();
//     const [deployer] = await hre.viem.getWalletClients();

//     console.log("Deployer:", deployer.account.address);

//     const icoToken = await hre.viem.deployContract("ICOToken", ["ICO Token", "ICT"], { account: deployer.account });
//     await publicClient.waitForTransactionReceipt({ hash: icoToken.deploymentTransaction.hash });
//     console.log("ICOToken:", icoToken.address);

//     const ico = await hre.viem.deployContract(
//         "ICO",
//         [icoToken.address /*, ...params อื่นๆ */],
//         { account: deployer.account }
//     );
//     await publicClient.waitForTransactionReceipt({ hash: ico.deploymentTransaction.hash });
//     console.log("ICO:", ico.address);
// }

// main().catch((e) => { console.error(e); process.exit(1); });