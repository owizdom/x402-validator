// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing and deployment
 */
contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**decimals); // Mint 1M tokens to deployer
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

