// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ICOToken1 is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    constructor() ERC20("ICOToken1", "ICO1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

contract SoftcapCrowdsale is ReentrancyGuard, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public immutable deadline;
    uint256 public immutable hardCap;
    uint256 public immutable softCap;
    uint256 public immutable rate;

    bool public finalized;
    bool public softCapReached;
    uint256 public total;

    mapping(address => uint256) public contributions; // เงินที่คนๆนั้นลง (ไว้ใช้ refund/check)
    mapping(address => uint256) public claimable; // โทเคนที่รอ mint

    event Contributed(
        address indexed buyer,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event SoftcapHit(uint256 totalRaised);

    constructor(
        uint256 _deadline,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _rate
    ) {
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(
            _softCap > 0 && _softCap <= _hardCap,
            "Soft cap must be between 0 and hard cap"
        );
        require(_rate > 0, "Rate must be greater than 0");

        hardCap = _hardCap;
        softCap = _softCap;
        deadline = _deadline;
        rate = _rate;
    }

    function contribute() external payable nonReentrant {
        require(block.timestamp < deadline, "Sale ended");
        require(!finalized, "Sale finalized");
        require(msg.value > 0, "Contribution must be greater than 0");
        require(total + msg.value <= hardCap, "Contribution exceeds hard cap");

        uint256 token = msg.value * rate;
        contributions[msg.sender] += msg.value;
        claimable[msg.sender] += token;
        total += msg.value;

        emit Contributed(msg.sender, msg.value, token);
        if (!softCapReached && total >= softCap) {
            softCapReached = true;
            emit SoftcapHit(total);
        }
    }
}
