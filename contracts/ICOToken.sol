// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ICOToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");
    bytes32 public constant BURNABLE_ROLE = keccak256("BURNABLE_ROLE");

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(TRANSFER_ROLE, msg.sender);
        _grantRole(BURNABLE_ROLE, msg.sender);
    }

    function transfer(
        address to,
        uint256 amount
    ) public override onlyRole(TRANSFER_ROLE) returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override onlyRole(TRANSFER_ROLE) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyRole(BURNABLE_ROLE) {
        _burn(msg.sender, amount);
    }

    function burnFrom(
        address account,
        uint256 amount
    ) external onlyRole(BURNABLE_ROLE) {
        if (balanceOf(account) < amount) revert("ERC20: insufficient balance");
        _burn(account, amount);
    }
}
