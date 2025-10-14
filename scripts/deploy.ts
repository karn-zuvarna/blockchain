// scripts/deploy.ts
import { network } from "hardhat";
async function main() {
    const { viem } = await network.connect();
    const ico = await viem.deployContract("ICOToken"); // artifact ชื่อเดียวกับไฟล์
    console.log("ICOToken:", ico.address);
}
main();