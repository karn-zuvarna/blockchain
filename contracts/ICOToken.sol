// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ICOToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNABLE_ROLE = keccak256("BURNABLE_ROLE");

    uint256 public immutable maxSupply;

    error NonTransferable();
    error MaxSupplyExceeded(uint256 requested, uint256 available);

    constructor(string memory _name, string memory _symbol, uint256 _maxSupply) ERC20(_name, _symbol) {
        maxSupply = _maxSupply;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNABLE_ROLE, msg.sender);
    }

    // Block all transfers — only mint (from=0) and burn (to=0) are allowed
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) revert NonTransferable();
        super._update(from, to, value);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 available = maxSupply - totalSupply();
        if (amount > available) revert MaxSupplyExceeded(amount, available);
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyRole(BURNABLE_ROLE) {
        _burn(msg.sender, amount);
    }

    function burnFrom(
        address account,
        uint256 amount
    ) external onlyRole(BURNABLE_ROLE) {
        require(account == address(this), "can only burn from token contract");
        _burn(account, amount);
    }
}
