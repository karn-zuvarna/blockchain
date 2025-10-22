import { createWalletClient, createPublicClient,http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import ICOTokenJson from "../../artifacts/contracts/ICOToken.sol/ICOToken.json" with {type: "json"};

dotenv.config();

export async function deploy() {
    const address = privateKeyToAccount(`0x${process.env.ISSUER_PRIVATE_KEY as string}`);
    console.log("deploy function called");
    const sepoliaUrl = process.env.SEPOLIA_INFURA_URL as string;
    // create public client
    const publicClient = createPublicClient({ chain: sepolia, transport: http(sepoliaUrl) });
    console.log("public client:", publicClient);
    // create wallet client from address that created by private key
    const walletClient = createWalletClient({ account: address, chain: sepolia, transport: http(sepoliaUrl) });
    console.log("wallet client:", walletClient);

    // get abi and bytecode from artifacts that create by command 'yarn hardhat compile'
    const abi = ICOTokenJson.abi;
    const bytecode = ICOTokenJson.bytecode as `0x${string}`;

    // deploy contract with abi and bytecode, Adds an EVM chain to the wallet
    const deployHash = await walletClient.deployContract({ abi, bytecode });
    // Waits for the [Transaction](https://viem.sh/docs/glossary/terms#transaction) to be included on a [Block](https://viem.sh/docs/glossary/terms#block)
    // (one confirmation), and then returns the [Transaction Receipt](https://viem.sh/docs/glossary/terms#transaction-receipt). If the Transaction reverts, 
    // then the action will throw an error.
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    const tokenAddress = deployReceipt.contractAddress as `0x${string}`;
    console.log("tokenAddress", tokenAddress);

    // check address of token that deployed contract is valid
    const code = await publicClient.getCode({ address: tokenAddress })
    if (!code || code === '0x') {
        console.log('❌ ไม่มีสัญญาที่ address นี้ (เป็น EOA)');
    }
    return tokenAddress;
}