// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IWKAIA {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface IRealitioERC20 {
    function submitAnswer(bytes32 questionId, bytes32 answer, uint256 bond) external;
    function submitAnswerCommitment(bytes32 questionId, bytes32 answerHash, uint256 bond) external;
    function submitAnswerWithToken(bytes32 questionId, bytes32 answer, uint256 bond, address bondToken) external;
    function bondTokenOf(bytes32 questionId) external view returns (address);
    function feeOn(uint256 amount) external view returns (uint256 fee, uint256 total);
}

/**
 * @title ZapperWKAIA
 * @dev Allows users to submit answers and commitments using native KAIA, which is wrapped to WKAIA
 */
contract ZapperWKAIA is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable WKAIA;
    address public immutable REALITY_ERC20;
    
    event ZappedAnswer(bytes32 indexed questionId, address indexed user, uint256 bondExact, uint256 feeAmount);
    event ZappedCommitment(bytes32 indexed questionId, address indexed user, uint256 bondExact, uint256 feeAmount);
    
    constructor(address _wkaia, address _realityERC20) {
        require(_wkaia != address(0), "Invalid WKAIA address");
        require(_realityERC20 != address(0), "Invalid RealitioERC20 address");
        WKAIA = _wkaia;
        REALITY_ERC20 = _realityERC20;
    }
    
    /**
     * @dev Submit an answer using native KAIA
     * @param questionId The question ID
     * @param answer The answer to submit
     * @param bondExact The exact bond amount (fee will be calculated on top)
     */
    function bondAndSubmitAnswerWithKAIA(
        bytes32 questionId,
        bytes32 answer,
        uint256 bondExact
    ) external payable nonReentrant {
        // Check that the question uses WKAIA as bond token
        require(IRealitioERC20(REALITY_ERC20).bondTokenOf(questionId) == WKAIA, "Question does not use WKAIA");
        
        // Calculate total amount needed (bond + fee)
        (uint256 fee, uint256 total) = IRealitioERC20(REALITY_ERC20).feeOn(bondExact);
        require(msg.value == total, "BAD_VALUE: Send exact bond + fee");
        
        // Wrap KAIA to WKAIA
        IWKAIA(WKAIA).deposit{value: total}();
        
        // Approve RealitioERC20 to spend WKAIA
        IERC20(WKAIA).safeIncreaseAllowance(REALITY_ERC20, total);
        
        // Submit answer with exact bond amount (contract will handle the fee)
        IRealitioERC20(REALITY_ERC20).submitAnswerWithToken(questionId, answer, bondExact, WKAIA);
        
        emit ZappedAnswer(questionId, msg.sender, bondExact, fee);
    }
    
    /**
     * @dev Submit a commitment using native KAIA
     * @param questionId The question ID
     * @param answerHash The answer hash to commit
     * @param bondExact The exact bond amount (fee will be calculated on top)
     */
    function commitWithKAIA(
        bytes32 questionId,
        bytes32 answerHash,
        uint256 bondExact
    ) external payable nonReentrant {
        // Check that the question uses WKAIA as bond token
        require(IRealitioERC20(REALITY_ERC20).bondTokenOf(questionId) == WKAIA, "Question does not use WKAIA");
        
        // Calculate total amount needed (bond + fee)
        (uint256 fee, uint256 total) = IRealitioERC20(REALITY_ERC20).feeOn(bondExact);
        require(msg.value == total, "BAD_VALUE: Send exact bond + fee");
        
        // Wrap KAIA to WKAIA
        IWKAIA(WKAIA).deposit{value: total}();
        
        // Approve RealitioERC20 to spend WKAIA
        IERC20(WKAIA).safeIncreaseAllowance(REALITY_ERC20, total);
        
        // Submit commitment with exact bond amount (contract will handle the fee)
        IRealitioERC20(REALITY_ERC20).submitAnswerCommitment(questionId, answerHash, bondExact);
        
        emit ZappedCommitment(questionId, msg.sender, bondExact, fee);
    }
    
    /**
     * @dev Rescue function to recover any stuck tokens
     * @param token The token address (use address(0) for KAIA)
     * @param amount The amount to rescue
     */
    function rescueFunds(address token, uint256 amount) external {
        // Only allow rescue by deployer or governance (can be made more restrictive)
        // For production, implement proper access control
        
        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
    
    receive() external payable {
        revert("Direct deposits not accepted");
    }
}