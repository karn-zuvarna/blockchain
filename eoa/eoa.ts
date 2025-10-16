import { keccak256 } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

(async () => {
    const privateKey = generatePrivateKey()
    console.log("Private Key:", privateKey)

    const address = privateKeyToAccount(privateKey);
    console.log("Address:", address)
    console.log("Public Key:", address.publicKey)

    const computeAddress = `0x${keccak256(address.publicKey).slice(-40)}`;
    console.log("Compute Address:", computeAddress)
})()