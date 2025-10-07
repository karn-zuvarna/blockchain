// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ICO is Ownable, ReentrancyGuard {
    IERC20 public immutable token;
    address public immutable wallet;

    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable rate; // Number of token units per ether
    uint256 public immutable hardCap; // Maximum amount of wei to be raised

    uint256 public totalRaised; // Total amount of wei raised
    bool public isFinalized;

    event TokensPurchased(address indexed purchaser, uint256 value, uint256 amount);
    event ICOFinalized(address indexed by, uint256 totalRaised);

    constructor(
        address tokenAddress_,
        address walletAddress_,
        uint256 startTime_,
        uint256 endTime_,
        uint256 rate_,
        uint256 hardCap_
    ) Ownable(msg.sender) {
require(tokenAddress_ != address(0), "Invalid token address");
        require(walletAddress_ != address(0), "Invalid wallet address");
        require(startTime_ < endTime_, "Start time must be before end time");
        require(rate_ > 0, "Rate must be greater than 0");
        require(hardCap_ > 0, "Hard cap must be greater than 0");

        token = IERC20(tokenAddress_);
        wallet = walletAddress_;
        startTime = startTime_;
        endTime = endTime_;
        rate = rate_;
        hardCap = hardCap_;
    }

    modifier onlyWhileOpen() {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "ICO is not open");
        _;
    }

    receive() external payable {
        _buy(msg.sender);
    }

     function buy() external payable nonReentrant onlyWhileOpen {
        _buy(msg.sender);
    }

    function _buy(address beneficiary) internal {
        require(!isFinalized, "ICO is finalized");
        uint256 amount = msg.value;
        
        // require(beneficiary != address(0), "Beneficiary is the zero address");
        require(amount > 0, "Wei amount is 0");
        require(totalRaised + amount <= hardCap, "Hard cap exceeded");

        // Calculate token amount to be created
        uint256 tokenAmount = amount * rate;

        // Update state
        totalRaised += amount;

        // โทเคนต้องถูก approve/mint โดยตัวสัญญานี้ถือสิทธิ์ mint (หรือ owner ของ Token=ICO)
        // ในตัวอย่างนี้ เราจะให้ MyToken.owner = deployer แล้ว transferOwnership มาเป็น ICO ก่อนเริ่มขาย
        // เพื่อให้ ICO เรียก mint ได้
        // แต่เพราะ token เป็น IERC20 ธรรมดา เราจะใช้ pattern: ICO เป็น owner ของ MyToken ที่มีฟังก์ชัน mint
        // เรียกผ่าน low-level interface
        (bool ok,  ) =address(token).call(abi.encodeWithSignature("mint(address,uint256)", beneficiary, tokenAmount));
        require(ok, "Token minting failed");

        // Emit event
        emit TokensPurchased(beneficiary, amount, tokenAmount);
    }

    // @notice โอน ETH ที่ระดมได้ไปยัง fundsWallet
    function withdrawFunds() external onlyOwner {
        require(address(this).balance > 0, "No funds to withdraw");
        (bool success, ) = wallet.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    // @notice ปิดการขาย (กันซื้อเพิ่ม)
    function finalize() external onlyOwner {
        require(!isFinalized, "already");
        require(block.timestamp > endTime || totalRaised == hardCap, "not end");
        isFinalized = true;
        emit ICOFinalized(msg.sender, totalRaised);
    }
}