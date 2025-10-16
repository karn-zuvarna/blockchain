import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";


describe("ICOToken", async function () {
    it("mints tokens", async () => {
        const { viem } = await network.connect();
        const [issuer, alice] = await viem.getWalletClients();
        const publicClient = await viem.getPublicClient();
        // deploy with correct constructor parameters
        const icoToken = await viem.deployContract("ICOToken1");
        const amount = 10000n;

        // อ่านค่า role แล้ว grant ให้คนที่ต้องการ (เช่น deployer เอง)
        const MINTER_ROLE = await icoToken.read.MINTER_ROLE();
        await icoToken.write.grantRole([MINTER_ROLE, issuer.account.address]);
        // call mint
        const tx = await icoToken.write.mint([alice.account.address, amount], { account: issuer.account })

        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        assert.equal(receipt.status, "success");

        const balance = await icoToken.read.balanceOf([alice.account.address]);
        assert.equal(balance, amount);
        const totalSupply = await icoToken.read.totalSupply();
        assert.equal(totalSupply, amount);
        console.log("totalSupply", totalSupply, "\nbalance", balance, "\namount", amount);
    });
});

describe("SoftcapCrowdsale::contribute", async () => {
    const { viem } = await network.connect();
    async function deployCrowdsale(args?: {
        deadlineDeltaSec?: number;
        softCapEth?: string;
        hardCapEth?: string;
        rate?: bigint;
    }) {
        const [deployer, alice, bob] = await viem.getWalletClients();

        const deadlineDeltaSec = args?.deadlineDeltaSec ?? 7 * 24 * 60 * 60; // +7 วัน
        const softCapEth = args?.softCapEth ?? "10";
        const hardCapEth = args?.hardCapEth ?? "50";
        const rate = args?.rate ?? 1000n; // token-per-wei (ตัวอย่าง)

        const deadline = BigInt(
            Math.floor(Date.now() / 1000) + deadlineDeltaSec
        );
        const softCap = parseEther(softCapEth);
        const hardCap = parseEther(hardCapEth);

        const sale = await viem.deployContract("SoftcapCrowdsale", [
            deadline,
            hardCap,
            softCap,
            rate,
        ]);

        return {
            deployer,
            alice,
            bob,
            sale,
            deadline,
            softCap,
            hardCap,
            rate,
        };
    };
    it("reverts if deadline is in the past", async () => {
        const nowPast = BigInt(Math.floor(Date.now() / 1000) - 10);
        const actual = viem.deployContract("SoftcapCrowdsale", [
            nowPast,
            parseEther("10"),
            parseEther("50"),
            1000n
        ])
        assert.rejects(actual, "Deadline is in the past");
    });

    it("reverts if softCap = 0", async () => {
        const future = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const actual = viem.deployContract("SoftcapCrowdsale", [
            future,
            parseEther("100"),
            0n,
            1000n,
        ])
        assert.rejects(actual, "Softcap must be greater than 0");
    });
    it("reverts if softCap > hardCap", async () => {
        const future = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const actual = viem.deployContract("SoftcapCrowdsale", [
            future,
            parseEther("10"),  // hardCap
            parseEther("20"),  // softCap > hardCap
            1000n,
        ])
        assert.rejects(actual, "Softcap must be less than hardcap");
    });
    it("reverts if rate = 0", async () => {
        const future = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const actual = viem.deployContract("SoftcapCrowdsale", [
            future,
            parseEther("10"),
            parseEther("5"),
            0n,
        ])
        assert.rejects(actual, "Rate must be greater than 0");
    });
    it("records contribution and claimable correctly", async () => {
        const { sale, alice, rate } = await deployCrowdsale();

        const v = parseEther("1"); // 1 ETH
        await sale.write.contribute({ account: alice.account, value: v });

        const total = await sale.read.total();
        assert.equal(total, v);

        const c = await sale.read.contributions([alice.account.address]);
        assert.equal(c, v);
        const claimable = await sale.read.claimable([alice.account.address]);
        // token = msg.value * rate
        assert.equal(claimable, v * rate);
    });
    it("allows multiple contributions from the same address and sums correctly", async () => {
        const { sale, alice, rate } = await deployCrowdsale();

        await sale.write.contribute({ account: alice.account, value: parseEther("2") });
        await sale.write.contribute({ account: alice.account, value: parseEther("3") });

        const total = await sale.read.total();
        assert.equal(total, parseEther("5"));
        const c = await sale.read.contributions([alice.account.address]);
        assert.equal(c, parseEther("5"));
        const claim = await sale.read.claimable([alice.account.address]);
        assert.equal(claim, parseEther("5") * rate);
    });

    it("sets softCapReached = true and emits SoftcapHit once when reaching softCap", async () => {
        const { sale, alice, bob, softCap } = await deployCrowdsale({ softCapEth: "5", hardCapEth: "50" });

        // ก่อนแตะ softcap
        let reached = await sale.read.softCapReached();
        assert.equal(reached, false);
        // ลง 3 ETH
        await sale.write.contribute({ account: alice.account, value: parseEther("3") });
        reached = await sale.read.softCapReached();
        assert.equal(reached, false);
        // ลงเพิ่ม 2 ETH -> รวม 5 ETH == softcap -> flip เป็น true
        const receipt = await sale.write.contribute({ account: bob.account, value: parseEther("2") });
        reached = await sale.read.softCapReached();
        assert.equal(reached, true);
        // (ออปชัน) ตรวจว่ามีอีเวนต์ SoftcapHit โผล่มา 1 ครั้งใน tx นี้
        // ใช้วิธี decode logs แบบง่าย ๆ ผ่าน abi ที่ hardhat-viem ให้
        const publicClient = await viem.getPublicClient();
        const tx = await publicClient.getTransactionReceipt({ hash: receipt });
        // topic ของ SoftcapHit(uint256) คือ keccak("SoftcapHit(uint256)")

        // ทางง่ายกว่า: ตรวจจำนวน logs > 0 พอ (เราเน้น state แล้ว)
        assert.equal(tx.logs.length, 2);
    });

    it("reverts when msg.value = 0", async () => {
        const { sale, alice } = await deployCrowdsale();
        const actual = sale.write.contribute({ account: alice.account, value: 0n })
        assert.rejects(actual, "Value must be greater than 0");
    });
    it("reverts when total + msg.value exceeds hardCap", async () => {
        const { sale, alice } = await deployCrowdsale({ softCapEth: "5", hardCapEth: "10" });

        await sale.write.contribute({ account: alice.account, value: parseEther("7") });
        const actual = sale.write.contribute({ account: alice.account, value: parseEther("4") }) // 7 + 4 > 10
        assert.rejects(actual, "Contribution would exceed hardcap");
    });
    // it("reverts after deadline", async () => {
    //     const { sale, alice, deadline } = await deployCrowdsale({ deadlineDeltaSec: 60 }); // +60s
    //     // เด้งเวลาเลย deadline ไป 1 วิ
    //     const actual = sale.write.contribute({ account: alice.account, value: parseEther("1") })
    //     assert.rejects(actual, "Deadline has passed");
    // });
});