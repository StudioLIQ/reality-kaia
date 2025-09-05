// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {RealitioERC20} from "../../../src/RealitioERC20.sol";

/**
 * @title MockArbitrator
 * @notice Simple arbitrator for testing arbitration flow
 */
contract MockArbitrator {
    RealitioERC20 public reality;
    address public owner;

    // Track arbitration requests
    mapping(bytes32 => bool) public hasArbitrationRequest;
    mapping(bytes32 => bytes32) public decisions;

    event ArbitrationRequested(bytes32 indexed questionId, address requester);
    event ArbitrationDecided(bytes32 indexed questionId, bytes32 answer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setReality(address _reality) external onlyOwner {
        reality = RealitioERC20(_reality);
    }

    /**
     * @notice Called when someone requests arbitration
     * @param questionId The question to arbitrate
     */
    function requestArbitration(bytes32 questionId) external payable {
        require(msg.value >= getDisputeFee(), "Insufficient arbitration fee");
        hasArbitrationRequest[questionId] = true;
        emit ArbitrationRequested(questionId, msg.sender);
    }

    /**
     * @notice Submit the arbitrator's decision
     * @param questionId The question ID
     * @param answer The arbitrator's answer
     */
    function submitDecision(bytes32 questionId, bytes32 answer) external onlyOwner {
        require(hasArbitrationRequest[questionId], "No arbitration request");
        require(address(reality) != address(0), "Reality not set");

        decisions[questionId] = answer;

        // Submit answer to Reality contract
        reality.submitAnswerByArbitrator(questionId, answer);

        emit ArbitrationDecided(questionId, answer);
    }

    /**
     * @notice Get the dispute fee required for arbitration
     */
    function getDisputeFee() public pure returns (uint256) {
        return 0.01 ether; // Simple fixed fee for testing
    }

    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
