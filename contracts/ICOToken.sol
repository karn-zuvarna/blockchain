// contracts/ICOToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ICOToken is ERC20,ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
    bytes32 public constant RECALL_ROLE = keccak256("RECALL_ROLE");
    bytes32 public constant BURNABLE_ROLE = keccak256("BURNABLE_ROLE");

    mapping(address => bool) public frozen;

    event Frozen(address indexed account);
    event Unfrozen(address indexed account);
    event Recalled(address indexed from, address indexed to, uint256 value);

    bool private _inRecall; // <-- bypass flag

    constructor() ERC20("KARN Token", "KARN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(FREEZER_ROLE, msg.sender);
        _grantRole(RECALL_ROLE, msg.sender);
        _grantRole(BURNABLE_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyRole(BURNABLE_ROLE) {
        uint256 currentAllowance = balanceOf(account);
        if (currentAllowance < amount) revert("ERC20: insufficient allowance");
        // _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }

     // ✅ เผาของตัวเอง (ใครก็ได้)
    function burn(uint256 amount) public override onlyRole(BURNABLE_ROLE) {
        _burn(_msgSender(), amount);
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
    address owner = _msgSender();
    _transfer(owner, to, amount);
    return true;
    }

    // ===== Freeze controls =====
    function freeze(address account) external onlyRole(FREEZER_ROLE) {
        require(!frozen[account], "Already frozen");
        frozen[account] = true;
        emit Frozen(account);
    }

    function unfreeze(address account) external onlyRole(FREEZER_ROLE) {
        require(frozen[account], "Not frozen");
        frozen[account] = false;
        emit Unfrozen(account);
    }

    // ===== Recall (force transfer) =====
    /// @notice ย้ายโทเค็นจากบัญชีที่ถูก freeze ไปยังผู้รับปลายทาง (เช่น treasury / เจ้าของเดิม)
    /// @dev เพื่อป้องกัน misuse เราบังคับให้ from ต้องถูก freeze ก่อน
    function recall(
        address from,
        address to,
        uint256 amount
    ) external onlyRole(RECALL_ROLE) {
        require(frozen[from], "Source not frozen");
        require(to != address(0), "Zero to");
        _inRecall = true; // set bypass
        _transfer(from, to, amount);
        _inRecall = false;
        emit Recalled(from, to, amount);
    }

    // ===== Hook: block outgoing transfer เมื่อถูก freeze =====
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from != address(0)) {
            // block frozen sender unless we're in a recall call
            if (!(_inRecall && hasRole(RECALL_ROLE, _msgSender()))) {
                require(!frozen[from], "Sender frozen");
            }
        }
        super._update(from, to, value);
    }
}
