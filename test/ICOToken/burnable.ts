import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";

describe("MyBurnableToken — burn & burnFrom (viem)", () => {
  let hviem: any;
  let owner: any, alice: any;

  before(async () => {
    const conn = await network.getOrCreate();
    hviem = conn.viem;
    const wallets = await hviem.getWalletClients();
    [owner, alice] = wallets;
  });

  async function deploy() {
    const maxSupply = 1_000_000n * 10n ** 18n;
    const icoToken = await hviem.deployContract("ICOToken", ["Test Token", "TST", maxSupply]);

    const MINTER_ROLE = await icoToken.read.MINTER_ROLE();
    await icoToken.write.grantRole([MINTER_ROLE, owner.account.address], { account: owner.account });

    const BURNABLE_ROLE = await icoToken.read.BURNABLE_ROLE();
    await icoToken.write.grantRole([BURNABLE_ROLE, owner.account.address], { account: owner.account });

    return icoToken;
  }

  it("burnFrom: succeeds when burning from token contract address", async () => {
    const token = await deploy();
    const contractAddress = token.address;
    const mintAmt = 100_000n;

    // mint tokens into the contract itself
    await token.write.mint([contractAddress, mintAmt], { account: owner.account });

    const balBefore = await token.read.balanceOf([contractAddress]);
    const tsBefore = await token.read.totalSupply();
    assert.equal(balBefore, mintAmt);

    const burnAmt = 40_000n;
    await token.write.burnFrom([contractAddress, burnAmt], { account: owner.account });

    const balAfter = await token.read.balanceOf([contractAddress]);
    const tsAfter = await token.read.totalSupply();

    assert.equal(balAfter, mintAmt - burnAmt);
    assert.equal(tsAfter, tsBefore - burnAmt);
  });

  it("burnFrom: reverts when trying to burn from a user wallet", async () => {
    const token = await deploy();
    const mintAmt = 100_000n;

    // mint tokens to alice (a regular user wallet)
    await token.write.mint([alice.account.address, mintAmt], { account: owner.account });

    let threw = false;
    try {
      await token.write.burnFrom([alice.account.address, 1_000n], { account: owner.account });
    } catch {
      threw = true;
    }

    assert.equal(threw, true, "burnFrom should revert for non-contract addresses");
  });
});
