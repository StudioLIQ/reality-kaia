// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/RealitioERC20.sol";
import "../src/tokens/MockUSDT.sol";
import "./mocks/MockPermit2.sol";
import "../src/interfaces/IPermit2.sol";

contract Permit2Test is Test {
    RealitioERC20 public realitio;
    MockUSDT public usdt;
    MockPermit2 public permit2;

    address public deployer = address(0x1);
    address public user = address(0x2);
    address public feeRecipient = address(0x3);

    uint16 public constant FEE_BPS = 25; // 0.25%
    bytes32 public questionId;

    function setUp() public {
        vm.startPrank(deployer);

        // Deploy contracts
        permit2 = new MockPermit2();
        usdt = new MockUSDT();
        realitio = new RealitioERC20(feeRecipient, FEE_BPS, address(permit2));

        // Setup user with tokens
        usdt.mint(user, 10000 * 10 ** 6); // 10,000 USDT

        // Create a question
        questionId = realitio.askQuestionERC20(
            address(usdt),
            0, // templateId
            "Is Permit2 working?",
            address(0), // no arbitrator
            300, // 5 min timeout
            0, // open now
            bytes32(0)
        );

        vm.stopPrank();
    }

    function testSubmitAnswerWithPermit2() public {
        vm.startPrank(user);

        uint256 bondAmount = 100 * 10 ** 6; // 100 USDT
        uint256 feeAmount = (bondAmount * FEE_BPS) / 10000;
        uint256 totalAmount = bondAmount + feeAmount;

        // Approve Permit2 to spend tokens
        usdt.approve(address(permit2), totalAmount);

        // Create permit data
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdt), amount: totalAmount}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        // Mock signature (in real scenario, this would be signed off-chain)
        bytes memory signature = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        // Submit answer with Permit2
        realitio.submitAnswerWithPermit2(
            questionId,
            bytes32(uint256(1)), // YES answer
            bondAmount,
            permit,
            signature,
            user
        );

        // Verify answer was submitted
        (,,,,, bytes32 bestAnswer, uint256 bestBond,,,) = realitio.getQuestion(questionId);
        assertEq(bestAnswer, bytes32(uint256(1)));
        assertEq(bestBond, bondAmount);

        // Verify fee was transferred
        assertEq(usdt.balanceOf(feeRecipient), feeAmount);

        vm.stopPrank();
    }

    function testSubmitAnswerCommitmentWithPermit2() public {
        vm.startPrank(user);

        uint256 bondAmount = 100 * 10 ** 6;
        uint256 feeAmount = (bondAmount * FEE_BPS) / 10000;
        uint256 totalAmount = bondAmount + feeAmount;

        // Approve Permit2
        usdt.approve(address(permit2), totalAmount);

        // Create answer hash
        bytes32 answer = bytes32(uint256(1));
        bytes32 nonce = keccak256("secret");
        bytes32 answerHash = keccak256(abi.encodePacked(answer, nonce));

        // Create permit data
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdt), amount: totalAmount}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        bytes memory signature = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        // Submit commitment with Permit2
        realitio.submitAnswerCommitmentWithPermit2(questionId, answerHash, bondAmount, permit, signature, user);

        // Verify commitment was stored
        (bytes32 storedHash, uint256 storedBond,,) = realitio.commitments(questionId, user);
        assertEq(storedHash, answerHash);
        assertEq(storedBond, bondAmount);

        // Verify fee was transferred
        assertEq(usdt.balanceOf(feeRecipient), feeAmount);

        vm.stopPrank();
    }

    function testSubmitAnswerWithPermit2612() public {
        // Skip this test as EIP-2612 requires token support
        // MockUSDT doesn't implement permit
        vm.skip(true);
    }

    function testDoubleSpendProtection() public {
        vm.startPrank(user);

        uint256 bondAmount = 100 * 10 ** 6;
        uint256 feeAmount = (bondAmount * FEE_BPS) / 10000;
        uint256 totalAmount = bondAmount + feeAmount;

        // First answer to establish a bond
        usdt.approve(address(realitio), totalAmount);
        realitio.submitAnswerWithToken(
            questionId,
            bytes32(uint256(0)), // NO answer
            bondAmount,
            address(usdt)
        );

        // Try to submit again with double bond requirement
        uint256 doubleBond = bondAmount * 2;
        uint256 doubleFee = (doubleBond * FEE_BPS) / 10000;
        uint256 doubleTotal = doubleBond + doubleFee;

        usdt.approve(address(permit2), doubleTotal);

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdt), amount: doubleTotal}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        bytes memory signature = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        realitio.submitAnswerWithPermit2(
            questionId,
            bytes32(uint256(1)), // Different answer
            doubleBond,
            permit,
            signature,
            user
        );

        // Verify the new answer overwrote the old one
        (,,,,, bytes32 bestAnswer, uint256 bestBond,,,) = realitio.getQuestion(questionId);
        assertEq(bestAnswer, bytes32(uint256(1)));
        assertEq(bestBond, doubleBond);

        vm.stopPrank();
    }
}
