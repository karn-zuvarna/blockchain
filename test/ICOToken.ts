import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { bob } from "viem/chains";


describe("ICOToken", async function () {
    it("mints tokens", async  () => {
        const { viem } = await network.connect();
        const [owner, alice] = await viem.getWalletClients();
        const publicClient = await viem.getPublicClient();
        // deploy with correct constructor parameters
        const icoToken = await viem.deployContract("ICOToken", [owner.account.address]);
        const amount = 10000n;

        // call mint
        const tx = await icoToken.write.mint([alice.account.address, amount], {account: owner.account})
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log("receipt", receipt);
        assert.equal(receipt.status, "success");

        const balance = await icoToken.read.balanceOf([alice.account.address]);
        assert.equal(balance, amount);
        const totalSupply = await icoToken.read.totalSupply();
        assert.equal(totalSupply, amount);
        console.log("totalSupply", totalSupply, "\nbalance", balance, "\namount", amount);
    });
});
