// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MockUSDT is ERC20, ERC20Permit {
    uint8 private constant _DECIMALS = 6;
    uint256 public constant MINT_AMOUNT = 10000 * 10 ** _DECIMALS; // 10,000 tUSDT per mint
    mapping(address => uint256) public lastMintTimestamp;

    constructor() ERC20("Testnet USDT", "tUSDT") ERC20Permit("Testnet USDT") {}

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Faucet function - allows users to mint tokens once per day
     */
    function mintDaily() external {
        require(block.timestamp >= lastMintTimestamp[msg.sender] + 1 days, "Can only mint once per day");

        lastMintTimestamp[msg.sender] = block.timestamp;
        _mint(msg.sender, MINT_AMOUNT);
    }

    /**
     * @dev Mint function for testing - only for testnet
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
