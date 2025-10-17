// contracts/ICOToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ICOToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant RECOVER_ROLE = keccak256("RECOVER_ROLE");

    mapping(address => bool) private _frozen;

    event Frozen(address indexed account, bool isFrozen, string reason);

    constructor() ERC20("KARN Token", "KARN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(RECOVER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
    address owner = _msgSender();
    _transfer(owner, to, amount);
    return true;
    }

    // Freeze/Unfreeze
    function setFrozen(address account, bool frozen, string calldata reason)
        external
        onlyRole(RECOVER_ROLE)
    {
        _frozen[account] = frozen;
        emit Frozen(account, frozen, reason);
    }
}
