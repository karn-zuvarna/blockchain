import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";

describe("MyBurnableToken — burn & burnFrom (viem)", () => {
  let hviem: any;
  let owner: any, alice: any,bob: any, hacker: any, treasury: any, spender: any;
  let publicClient: any;

  before(async () => {
    const conn = await network.getOrCreate();
        hviem = conn.viem;

        // ดึง wallet clients (หนึ่ง client = หนึ่ง account จาก Hardhat)
        const wallets = await hviem.getWalletClients();
        [owner, alice, bob, hacker, treasury] = wallets;
  });

  async function deploy() {
    const publicClient = await hviem.getPublicClient();
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
            const BURNABLE_ROLE = await icoToken.read.BURNABLE_ROLE();
            await icoToken.write.grantRole([BURNABLE_ROLE, owner.account.address], {
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

  // it("burn: reduces holder balance and total supply", async () => {
  //   const token = await deploy();

  //   // สมมติ constructor ได้ mint supply ทั้งหมดให้ owner แล้ว
  //   // ถ้าคุณเริ่ม 0 ให้ mint ใน constructor ตามตัวอย่างสัญญา
  //   // ที่นี่เราจะโอนไปให้ Alice ทดสอบ
  //   await token.write.transfer([bob.account.address, 10_000n], { account: alice.account });
  //   await token.write.transfer([hacker.account.address, 5_000n], { account: bob.account });

  //   const ts0 = await token.read.totalSupply();
  //   const a0  = await token.read.balanceOf([bob.account.address]);
  //   const h0  = await token.read.balanceOf([hacker.account.address]);

  //   console.log("\n\n");
  //   console.log("before burn token");
  //   console.log("total supply:", ts0);
  //   console.log("bob balance:", a0);
  //   console.log("hacker balance:", h0);
    
  //   const burnAmt = 1_000n;
  //   await token.write.burnFrom([hacker.account.address,burnAmt], { account: owner.account });
    
  //   const ts1 = await token.read.totalSupply();
  //   const a1  = await token.read.balanceOf([bob.account.address]);
  //   const h1  = await token.read.balanceOf([hacker.account.address]);
    
  //   console.log("\n\n");
  //   console.log("after burn token");
  //   console.log("total supply:", ts1);
  //   console.log("bob balance:", a1);
  //   console.log("hacker balance:", new Intl.NumberFormat().format(h1));

  //   assert.equal(ts1, ts0 - burnAmt);
  //   assert.equal(h1, h0 - burnAmt);
  // });

//   it("burn: reverts when burning more than balance", async () => {
//     const { token, scale } = await deploy(1_000n);
//     // ให้ Alice มี 100
//     await waitTx(token.write.transfer([alice.account.address, 100n)], { account: owner.account }));

//     let threw = false;
//     try {
//       await waitTx(token.write.burn([101n)], { account: alice.account }));
//     } catch { threw = true; }

//     assert.equal(threw, true);
//   });

//   it("burnFrom: works with allowance and reduces allowance/totalSupply", async () => {
//     const { token, scale } = await deploy(100_000n);
//     // ให้ Alice มี 5_000
//     await waitTx(token.write.transfer([alice.account.address, 5_000n)], { account: owner.account }));

//     // Alice อนุมัติให้ spender เผา 1_500
//     await waitTx(token.write.approve([spender.account.address, 1_500n)], { account: alice.account }));

//     const ts0 = await token.read.totalSupply();
//     const a0  = await token.read.balanceOf([alice.account.address]);
//     const al0 = await token.read.allowance([alice.account.address, spender.account.address]);

//     // spender เรียก burnFrom(alice, 1_000)
//     const burnAmt = 1_000n);
//     await waitTx(token.write.burnFrom([alice.account.address, burnAmt], { account: spender.account }));

//     const ts1 = await token.read.totalSupply();
//     const a1  = await token.read.balanceOf([alice.account.address]);
//     const al1 = await token.read.allowance([alice.account.address, spender.account.address]);

//     assert.equal(ts1, ts0 - burnAmt);
//     assert.equal(a1, a0 - burnAmt);
//     assert.equal(al1, al0 - burnAmt);
//   });

//   it("burnFrom: reverts when amount exceeds allowance", async () => {
//     const { token, scale } = await deploy(50_000n);

//     await waitTx(token.write.transfer([alice.account.address, 2_000n)], { account: owner.account }));
//     await waitTx(token.write.approve([spender.account.address, 300n)], { account: alice.account }));

//     let threw = false;
//     try {
//       await waitTx(token.write.burnFrom([alice.account.address, 400n)], { account: spender.account }));
//     } catch { threw = true; }

//     assert.equal(threw, true);
//   });
});
