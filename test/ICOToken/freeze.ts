// // test/FreezeUnfreeze.test.ts
// import assert from "node:assert/strict";
// import { describe, it, before } from "node:test";
// import { network } from "hardhat";

// describe("RecallableToken — freeze/unfreeze (viem)", () => {
//     let hviem: any;
//     let owner: any, alice: any, bob: any, hacker: any, treasury: any;

//     before(async () => {
//         const conn = await network.connect();
//         hviem = conn.viem;

//         // ดึง wallet clients (หนึ่ง client = หนึ่ง account จาก Hardhat)
//         const wallets = await hviem.getWalletClients();
//         [owner, alice, bob, hacker, treasury] = wallets;
//     });

//     async function deploy() {
//         const publicClient = await hviem.getPublicClient();
//         const icoToken = await hviem.deployContract("ICOToken", ["Test Token", "TST"]);
//         const amount = 100_000n;

//         // อ่านค่า role แล้ว grant ให้คนที่ต้องการ (เช่น deployer เอง)
//         const MINTER_ROLE = await icoToken.read.MINTER_ROLE();
//         await icoToken.write.grantRole([MINTER_ROLE, owner.account.address], {
//             account: owner.account,
//         });
//         const FREEZER_ROLE = await icoToken.read.FREEZER_ROLE();
//         await icoToken.write.grantRole([FREEZER_ROLE, owner.account.address], {
//             account: owner.account,
//         });

//         // mint ให้ alice
//         const hash = await icoToken.write.mint([alice.account.address, amount], {
//             account: owner.account,
//         });
//         const receipt = await publicClient.waitForTransactionReceipt({ hash });
//         console.log("Minted :", amount, "to", alice.account.address);
//         console.log("balance:", await icoToken.read.balanceOf([alice.account.address]));
//         const [aliceBal, total] = await Promise.all([
//             icoToken.read.balanceOf([alice.account.address]),
//             icoToken.read.totalSupply(),
//         ]);

//         assert.equal(aliceBal, amount);
//         return icoToken;
//     }

//     it("FREEZER_ROLE สามารถ freeze แล้วบล็อกการโอนออก แต่ยังรับโอนได้", async () => {
//         const token = await deploy();

//         // alice => bob 100 โทเค็น
//         const amount = 100n;
//         await token.write.transfer([bob.account.address, amount], {
//             account: alice.account, // ใช้ owner เซ็น
//         });

//         // bob was hacked by hacker 100 โทเค็น
//         await token.write.transfer([hacker.account.address, amount], {
//             account: bob.account,
//         });
//         assert.equal(await token.read.balanceOf([bob.account.address]), 0n);
//         assert.equal(await token.read.balanceOf([hacker.account.address]), amount);

//         // Freeze Alice (owner มี FREEZER_ROLE)
//         await token.write.freeze([hacker.account.address], { account: owner.account });
//         assert.equal(await await token.read.frozen([hacker.account.address]), true);
//         console.log("hacker balance:", await token.read.balanceOf([hacker.account.address]));

//         // ระหว่าง freeze: Alice โอนออกควร revert
//         let threw = false;
//         try {
//             await token.write.transfer([alice.account.address, amount], {
//                 account: hacker.account,
//             });
//         } catch {
//             threw = true;
//         }
//         assert.equal(threw, true);

//         // แต่ยัง "รับ" โทเค็นได้ (owner โอนเข้าหา Alice)
//         await token.write.transfer([hacker.account.address, amount], {
//             account: alice.account,
//         });
//         console.log("alice balance:", await token.read.balanceOf([alice.account.address]));
//         console.log("Bob balance:", await token.read.balanceOf([bob.account.address]));
//         console.log("hacker balance:", await token.read.balanceOf([hacker.account.address]));
//         assert.equal(await token.read.balanceOf([alice.account.address]), 100_000n - 200n);
//     });

//     it("unfreeze แล้วโอนออกได้ตามปกติ", async () => {
//         const token = await deploy();

//         // แจกให้ Alice 100
//         let amount = 100n;
//         await token.write.transfer([bob.account.address, amount], {
//             account: alice.account,
//         });
//         amount = 10n;
//         // Freeze แล้วโอนออกจะล้มเหลว
//         await token.write.freeze([bob.account.address], { account: owner.account });
//         let locked = false;
//         try {
//             await token.write.transfer([treasury.account.address, amount], {
//                 account: bob.account,
//             });
//         } catch {
//             locked = true;
//         }
//         assert.equal(locked, true);

//         // Unfreeze -> โอนออกสำเร็จ
//         await token.write.unfreeze([bob.account.address], { account: owner.account });
//         assert.equal(await token.read.frozen([bob.account.address]), false);

//         await token.write.transfer([treasury.account.address, amount], {
//             account: bob.account,
//         });
//         assert.equal(await token.read.balanceOf([bob.account.address]), 90n);
//     });

//     it("ผู้ที่ไม่มี FREEZER_ROLE จะ freeze/unfreeze ไม่ได้", async () => {
//         const token = await deploy();

//         // attacker = bob
//         let f1 = false;
//         try {
//             await token.write.freeze([alice.account.address], { account: bob.account });
//         } catch {
//             f1 = true;
//         }
//         assert.equal(f1, true);

//         // owner freeze ให้ก่อน
//         await token.write.freeze([alice.account.address], { account: owner.account });
//         assert.equal(await token.read.frozen([alice.account.address]), true);

//         // attacker พยายาม unfreeze -> fail
//         let f2 = false;
//         try {
//             await token.write.unfreeze([alice.account.address], { account: bob.account });
//         } catch {
//             f2 = true;
//         }
//         assert.equal(f2, true);

//         // owner unfreeze สำเร็จ
//         await token.write.unfreeze([alice.account.address], { account: owner.account });
//         assert.equal(await token.read.frozen([alice.account.address]), false);
//     });

//     it("โอนไปยัง address ที่ถูก freeze ยังทำได้ (บล็อกเฉพาะโอนออกจากผู้ถูก freeze)", async () => {
//         const token = await deploy();

//         // Freeze bob
//         await token.write.freeze([bob.account.address], { account: owner.account });
//         assert.equal(await token.read.frozen([bob.account.address]), true);

//         // โอนจาก owner -> bob ยังสำเร็จ
//         await token.write.transfer([bob.account.address, 5n], { account: alice.account });
//         assert.equal(await token.read.balanceOf([bob.account.address]), 5n);

//         // แต่ bob จะโอนออกไม่ได้
//         let blocked = false;
//         try {
//             await token.write.transfer([treasury.account.address, 1n], { account: bob.account });
//         } catch {
//             blocked = true;
//         }
//         assert.equal(blocked, true);
//     });
// });
