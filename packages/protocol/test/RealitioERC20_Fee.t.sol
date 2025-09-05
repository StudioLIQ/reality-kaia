// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/RealitioERC20.sol";
import "../src/tokens/MockUSDT.sol";
import "../src/zapper/ZapperWKAIA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWKAIA is ERC20 {
    constructor() ERC20("Wrapped KAIA", "WKAIA") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
}

contract RealitioERC20FeeTest is Test {
    RealitioERC20 public realitio;
    MockUSDT public tUSDT;
    MockWKAIA public wkaia;
    ZapperWKAIA public zapper;

    address constant FEE_RECIPIENT = 0x7abEdc832254DaA2032505e33A8Dd325841D6f2D;
    uint16 constant FEE_BPS = 25; // 0.25%

    address alice = address(0xa11ce);
    address bob = address(0xb0b);

    bytes32 questionId;

    function setUp() public {
        // Deploy contracts
        address permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3; // Permit2 address
        realitio = new RealitioERC20(FEE_RECIPIENT, FEE_BPS, permit2);
        tUSDT = new MockUSDT();
        wkaia = new MockWKAIA();
        zapper = new ZapperWKAIA(address(wkaia), address(realitio), permit2);

        // Set zapper as allowed in RealitioERC20
        realitio.setZapper(address(zapper), true);

        // Setup test users with tokens
        tUSDT.mint(alice, 10_000 * 10 ** 6); // 10,000 tUSDT (6 decimals)
        tUSDT.mint(bob, 10_000 * 10 ** 6);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // Create a question with tUSDT as bond token
        questionId = realitio.askQuestionERC20(
            address(tUSDT),
            0, // templateId
            "Test question?",
            address(0), // arbitrator
            86400, // timeout
            0, // openingTs
            bytes32(uint256(1)) // nonce
        );
    }

    function testFeeCalculation() public view {
        uint256 bondAmount = 1_000_000; // 1 USDT (6 decimals)
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        assertEq(fee, 2_500, "Fee should be 0.25% of bond");
        assertEq(total, 1_002_500, "Total should be bond + fee");
    }

    function testSubmitAnswerWithFee() public {
        uint256 bondAmount = 1_000_000; // 1 USDT
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        vm.startPrank(alice);

        // Approve total amount (bond + fee)
        tUSDT.approve(address(realitio), total);

        uint256 aliceBalanceBefore = tUSDT.balanceOf(alice);
        uint256 contractBalanceBefore = tUSDT.balanceOf(address(realitio));
        uint256 feeRecipientBalanceBefore = tUSDT.balanceOf(FEE_RECIPIENT);

        // Submit answer
        realitio.submitAnswerWithToken(
            questionId,
            bytes32(uint256(1)), // answer
            bondAmount,
            address(tUSDT)
        );

        vm.stopPrank();

        // Check balances
        assertEq(tUSDT.balanceOf(alice), aliceBalanceBefore - total, "Alice should pay bond + fee");
        assertEq(
            tUSDT.balanceOf(address(realitio)), contractBalanceBefore + bondAmount, "Contract should receive only bond"
        );
        assertEq(tUSDT.balanceOf(FEE_RECIPIENT), feeRecipientBalanceBefore + fee, "Fee recipient should receive fee");
    }

    function testDoubleRuleWithoutFee() public {
        uint256 firstBond = 1_000_000; // 1 USDT
        (uint256 fee1, uint256 total1) = realitio.feeOn(firstBond);

        // Alice submits first answer
        vm.startPrank(alice);
        tUSDT.approve(address(realitio), total1);
        realitio.submitAnswerWithToken(questionId, bytes32(uint256(1)), firstBond, address(tUSDT));
        vm.stopPrank();

        // Bob tries to submit with less than 2x bond (should fail)
        uint256 insufficientBond = 2_000_000 - 1; // Just under 2x
        (uint256 fee2, uint256 total2) = realitio.feeOn(insufficientBond);

        vm.startPrank(bob);
        tUSDT.approve(address(realitio), total2);

        vm.expectRevert("Bond too low");
        realitio.submitAnswerWithToken(questionId, bytes32(uint256(2)), insufficientBond, address(tUSDT));
        vm.stopPrank();

        // Bob submits with exactly 2x bond (should succeed)
        uint256 sufficientBond = 2_000_000;
        (uint256 fee3, uint256 total3) = realitio.feeOn(sufficientBond);

        vm.startPrank(bob);
        tUSDT.approve(address(realitio), total3);
        realitio.submitAnswerWithToken(questionId, bytes32(uint256(2)), sufficientBond, address(tUSDT));
        vm.stopPrank();
    }

    function testCommitmentWithFee() public {
        uint256 bondAmount = 1_000_000; // 1 USDT
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        vm.startPrank(alice);
        tUSDT.approve(address(realitio), total);

        uint256 feeRecipientBalanceBefore = tUSDT.balanceOf(FEE_RECIPIENT);

        // Submit commitment
        bytes32 answerHash = keccak256(abi.encode(bytes32(uint256(1)), bytes32(uint256(123))));
        realitio.submitAnswerCommitment(questionId, answerHash, bondAmount);

        vm.stopPrank();

        // Check fee was paid
        assertEq(
            tUSDT.balanceOf(FEE_RECIPIENT),
            feeRecipientBalanceBefore + fee,
            "Fee recipient should receive fee for commitment"
        );
    }

    // TODO: Update this test to work with new ZapperWKAIA API
    /*function testZapperWithFee() public {
        // Create question with WKAIA as bond token
        bytes32 wkaiaQuestionId = realitio.askQuestionERC20(
            address(wkaia),
            0,
            "WKAIA question?",
            address(0),
            86400,
            0,
            bytes32(uint256(2))
        );
        
        uint256 bondAmount = 1 ether;
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);
        
        uint256 feeRecipientWKAIABefore = wkaia.balanceOf(FEE_RECIPIENT);
        
        vm.prank(alice);
        // zapper.bondAndSubmitAnswerWithKAIA{value: total}(
        //     wkaiaQuestionId,
        //     bytes32(uint256(1)),
        //     bondAmount
        // );
        
        // Check fee was paid in WKAIA
        assertEq(
            wkaia.balanceOf(FEE_RECIPIENT),
            feeRecipientWKAIABefore + fee,
            "Fee recipient should receive fee in WKAIA"
        );
    }*/

    // TODO: Update this test to work with new ZapperWKAIA API
    /*function testZapperRequiresExactValue() public {
        bytes32 wkaiaQuestionId = realitio.askQuestionERC20(
            address(wkaia),
            0,
            "WKAIA question?",
            address(0),
            86400,
            0,
            bytes32(uint256(3))
        );
        
        uint256 bondAmount = 1 ether;
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);
        
        // Try with insufficient value
        vm.prank(alice);
        vm.expectRevert("BAD_VALUE: Send exact bond + fee");
        // zapper.bondAndSubmitAnswerWithKAIA{value: bondAmount}( // Missing fee
        //     wkaiaQuestionId,
        //     bytes32(uint256(1)),
        //     bondAmount
        // );
        
        // Try with excess value
        vm.prank(alice);
        vm.expectRevert("BAD_VALUE: Send exact bond + fee");
        // zapper.bondAndSubmitAnswerWithKAIA{value: total + 1}( // Too much
        //     wkaiaQuestionId,
        //     bytes32(uint256(1)),
        //     bondAmount
        // );
    }*/
}
