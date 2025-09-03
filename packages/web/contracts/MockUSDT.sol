// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Test USDT token with faucet functionality (24-hour cooldown)
 */
contract MockUSDT is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 100 * 10**6; // 100 USDT (6 decimals)
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    
    mapping(address => uint256) public lastMintTime;
    
    event FaucetUsed(address indexed user, uint256 amount, uint256 timestamp);
    
    constructor() ERC20("Test USDT", "tUSDT") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**6); // 1M USDT
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @dev Faucet function - users can claim 100 tUSDT every 24 hours
     */
    function faucet() external {
        require(
            block.timestamp >= lastMintTime[msg.sender] + COOLDOWN_PERIOD,
            "MockUSDT: Must wait 24 hours between faucet requests"
        );
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev Get remaining cooldown time for an address
     */
    function getRemainingCooldown(address user) external view returns (uint256) {
        if (lastMintTime[user] == 0) {
            return 0;
        }
        
        uint256 nextAvailable = lastMintTime[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextAvailable) {
            return 0;
        }
        
        return nextAvailable - block.timestamp;
    }
    
    /**
     * @dev Check if address can use faucet
     */
    function canUseFaucet(address user) external view returns (bool) {
        return block.timestamp >= lastMintTime[user] + COOLDOWN_PERIOD;
    }
    
    /**
     * @dev Owner can mint tokens (for testing)
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}