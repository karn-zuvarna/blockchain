import { createWalletClient, createPublicClient, parseAbi, parseUnits, http } from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import ICOTokenJson from "../../artifacts/contracts/ICOToken.sol/ICOToken.json" with {type: "json"};

dotenv.config();

// create account from private key of metamask Account1
const address = privateKeyToAccount(`0x${process.env.ISSUER_PRIVATE_KEY as string}`);
// const address = privateKeyToAccount(`0x${process.env.PRIVATE_KEY as string}`);
(async () => {
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
    const amount = parseUnits("1000", 18);
    const to = process.env.CLIENT3_ADDRESS as `0x${string}`;
    // Simulates/validates a contract interaction. This is useful for retrieving **return data** and **revert reasons** of contract write functions.
    const { request } = await publicClient.simulateContract({
        address: tokenAddress,
        abi: parseAbi(["function mint(address to, uint256 amount) external"]),
        functionName: "mint",
        args: [to, amount],
        account: address,
    })

    // Executes a write function on a contract.
    const hash = await walletClient.writeContract(request);
    // Waits for the [Transaction]
    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
    })
    console.log("Minted at block:", receipt.blockNumber);
})()

/**
ฟังก์ชัน | ใช้ publicClient | ใช้ walletClient
อ่านยอดคงเหลือ | ✅ readContract({ functionName: "balanceOf" }) | ❌
อ่านชื่อ token | ✅ readContract({ functionName: "name" }) | ❌
simulate เพื่อคำนวณ gas | ✅ simulateContract() | ❌
ส่งธุรกรรม mint / transfer | ❌ | ✅ writeContract()
deploy smart contract | ❌ | ✅ deployContract()
ตรวจสอบผล TX หลังส่ง | ✅ waitForTransactionReceipt() | ❌
อ่าน logs / event | ✅ | ❌
เซ็นข้อความ (sign message) | ❌ | ✅
*/