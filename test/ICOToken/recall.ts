// test/RecallableToken.recall.test.ts
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import type { Abi } from "abitype";
import { decodeEventLog, parseEventLogs } from "viem";
import { lens } from "viem/chains";

describe("RecallableToken — recall (viem)", () => {
    let hviem: any;
    let owner: any, alice: any, bob: any, boss: any, hacker: any, treasury: any, outsider: any;
    let publicClient: any;

    before(async () => {
        const conn = await network.connect();
        hviem = conn.viem;

        // ดึง wallet clients (หนึ่ง client = หนึ่ง account จาก Hardhat)
        const wallets = await hviem.getWalletClients();
        [owner, alice, bob, hacker, boss, treasury] = wallets;
    });

    async function deploy() {
        publicClient = await hviem.getPublicClient();
        const icoToken = await hviem.deployContract("ICOToken");
        const amount = 100_000n;

        // อ่านค่า role แล้ว grant ให้คนที่ต้องการ (เช่น deployer เอง)
        const MINTER_ROLE = await icoToken.read.MINTER_ROLE();
        await icoToken.write.grantRole([MINTER_ROLE, owner.account.address], {
            account: owner.account,
        });
        const FREEZER_ROLE = await icoToken.read.FREEZER_ROLE();
        await icoToken.write.grantRole([FREEZER_ROLE, owner.account.address], {
            account: owner.account,
        });
        const RECALL_ROLE = await icoToken.read.RECALL_ROLE();
        await icoToken.write.grantRole([RECALL_ROLE, owner.account.address], {
            account: owner.account,
        });

        // mint ให้ alice
        const hash = await icoToken.write.mint([alice.account.address, amount], {
            account: owner.account,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("Minted :", amount, "to", alice.account.address);
        console.log("balance:", await icoToken.read.balanceOf([alice.account.address]));
        const [aliceBal, total] = await Promise.all([
            icoToken.read.balanceOf([alice.account.address]),
            icoToken.read.totalSupply(),
        ]);

        assert.equal(aliceBal, amount);
        return icoToken;
    }

    it("recall: moves tokens from FROZEN source to treasury and emits event", async () => {
        const token = await deploy();
        // publicClient = await hviem.getPublicClient();

        const d: number = await token.read.decimals();
        const amount = 1_000n;
        // Mint ให้ hacker 1,000
        await token.write.transfer([hacker.account.address, amount], { account: alice.account });
        console.log("Hacker balance after hacked alice account:", await token.read.balanceOf([hacker.account.address]));
        console.log("alice balance after being hacked         :", await token.read.balanceOf([alice.account.address]));
        console.log("boss balance                             :", await token.read.balanceOf([boss.account.address]));
        // Freeze hacker
        await token.write.freeze([hacker.account.address], { account: owner.account });
        assert.equal(await token.read.frozen([hacker.account.address]), true);
        // โอนออกจาก hacker ควรล้มเหลว (ยืนยันว่า freeze ทำงาน)
        let blocked = false;
        try {
            await token.write.transfer([boss.account.address, amount], { account: hacker.account });
        } catch { blocked = true; }
        assert.equal(blocked, true);
        console.log("\n\n");
        console.log("Hacker account have been frozen, cannot transfer out.");
        console.log("Hacker balance after hacked alice account:", await token.read.balanceOf([hacker.account.address]));
        console.log("alice balance after being hacked         :", await token.read.balanceOf([alice.account.address]));
        console.log("treasury balance                         :", await token.read.balanceOf([treasury.account.address]));
        console.log("boss balance                             :", await token.read.balanceOf([boss.account.address]));

        // Recall 250 จาก hacker -> treasury
        // const recallAmt = 250n;
        console.log("Hacker frozen:", await token.read.frozen([hacker.account.address]));
        const hash = await token.write.recall(
            [hacker.account.address, treasury.account.address, amount],
            { account: owner.account }
        );
        console.log("\n\n");
        console.log("balances after recall:");
        console.log("Hacker balance after hacked alice account:", await token.read.balanceOf([hacker.account.address]));
        console.log("alice balance after recall               :", await token.read.balanceOf([alice.account.address]));
        console.log("treasury balance after recall            :", await token.read.balanceOf([treasury.account.address]));
        console.log("boss balance                             :", await token.read.balanceOf([boss.account.address]));
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        assert.equal(receipt.status, "success");

        // ตรวจ balances
        const balHacker = await token.read.balanceOf([hacker.account.address]);
        const balTreasury = await token.read.balanceOf([treasury.account.address]);
        assert.equal(balHacker, 0n);
        assert.equal(balTreasury, amount);
    });

    // it("recall: reverts if source is NOT frozen", async () => {
    //     const token = await deploy();

    //     const d: number = await token.read.decimals();
    //     const scale = (n: bigint) => n * 10n ** BigInt(d);

    //     // Mint ให้ victim 100
    //     await waitTx(token.write.transfer([victim.account.address, scale(100n)], { account: owner.account }));

    //     // ยังไม่ freeze -> เรียก recall ควร revert
    //     let threw = false;
    //     try {
    //         await waitTx(
    //             token.write.recall(
    //                 [victim.account.address, treasury.account.address, scale(10n)],
    //                 { account: owner.account }
    //             )
    //         );
    //     } catch { threw = true; }
    //     assert.equal(threw, true);
    // });

    // it("recall: non-RECALL_ROLE cannot recall", async () => {
    //     const token = await deploy();

    //     const d: number = await token.read.decimals();
    //     const scale = (n: bigint) => n * 10n ** BigInt(d);

    //     // Mint hacker และ freeze hacker
    //     await waitTx(token.write.transfer([hacker.account.address, scale(50n)], { account: owner.account }));
    //     await waitTx(token.write.freeze([hacker.account.address], { account: owner.account }));

    //     // คนที่ไม่มี RECALL_ROLE (outsider) เรียก recall -> ต้อง revert
    //     let denied = false;
    //     try {
    //         await waitTx(
    //             token.write.recall(
    //                 [hacker.account.address, treasury.account.address, scale(5n)],
    //                 { account: outsider.account } // ❌ ไม่ใช่ผู้มี RECALL_ROLE
    //             )
    //         );
    //     } catch { denied = true; }
    //     assert.equal(denied, true);

    //     // ยืนยันว่า balance hacker ยังเท่าเดิม
    //     const balHacker = await token.read.balanceOf([hacker.account.address]);
    //     assert.equal(balHacker, scale(50n));
    // });
});