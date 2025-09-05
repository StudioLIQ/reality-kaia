// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/RealitioERC20.sol";
import "../src/zapper/ZapperWKAIA.sol";
import "../src/interfaces/IPermit2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock WKAIA contract
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

// Mock Permit2 contract
contract MockPermit2 is IPermit2 {
    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external override {
        // Mock implementation - just transfer the tokens
        IERC20(permit.permitted.token).transferFrom(owner, transferDetails.to, transferDetails.requestedAmount);
    }
}

contract ZapperWKAIATest is Test {
    RealitioERC20 public realitio;
    ZapperWKAIA public zapper;
    MockWKAIA public wkaia;
    MockPermit2 public permit2;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public feeRecipient = address(0x3);
    uint16 public constant FEE_BPS = 25;

    bytes32 public questionId;

    function setUp() public {
        // Deploy contracts
        wkaia = new MockWKAIA();
        permit2 = new MockPermit2();
        realitio = new RealitioERC20(feeRecipient, FEE_BPS, address(permit2));
        zapper = new ZapperWKAIA(address(wkaia), address(realitio), address(permit2));

        // Set zapper as allowed
        realitio.setZapper(address(zapper), true);

        // Setup test accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // Alice gets some WKAIA
        vm.prank(alice);
        wkaia.deposit{value: 50 ether}();

        // Create a test question with WKAIA as bond token
        questionId = realitio.askQuestionERC20(
            address(wkaia),
            0, // templateId
            "Test question?",
            address(0), // arbitrator
            86400, // timeout
            0, // openingTs
            bytes32(uint256(1)) // nonce
        );
    }

    function testZapperMixedPayment() public {
        uint256 bondAmount = 1 ether;
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        // Alice uses 0.5 WKAIA and the rest in KAIA
        uint256 wkaiaAmount = 0.5 ether;
        uint256 kaiaNeeded = total - wkaiaAmount;

        // Approve permit2 to spend WKAIA (since MockPermit2 does the transfer)
        vm.prank(alice);
        wkaia.approve(address(permit2), wkaiaAmount);

        // Create permit data (simplified for test)
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(wkaia), amount: wkaiaAmount}),
            nonce: 1,
            deadline: block.timestamp + 3600
        });

        bytes memory signature = ""; // Empty signature for test

        // Submit answer with mixed payment
        vm.prank(alice);
        zapper.answerMixedWithPermit2{value: kaiaNeeded}(
            questionId,
            bytes32(uint256(1)), // answer = YES
            bondAmount,
            permit,
            signature,
            alice,
            wkaiaAmount
        );

        // Check the answer was recorded
        (,,,,, bytes32 bestAnswer,,,,) = realitio.getQuestion(questionId);
        assertEq(bestAnswer, bytes32(uint256(1)), "Answer should be recorded");

        // Check fee was paid
        assertEq(wkaia.balanceOf(feeRecipient), fee, "Fee should be paid to recipient");
    }

    function testZapperOnlyKAIA() public {
        uint256 bondAmount = 1 ether;
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        // Bob uses only KAIA (no WKAIA)
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(wkaia), amount: 0}),
            nonce: 1,
            deadline: block.timestamp + 3600
        });

        bytes memory signature = ""; // Empty signature for test

        // Submit answer with only KAIA
        vm.prank(bob);
        zapper.answerMixedWithPermit2{value: total}(
            questionId,
            bytes32(uint256(2)), // answer = NO
            bondAmount,
            permit,
            signature,
            bob,
            0 // wkaiaMaxFromPermit = 0
        );

        // Check the answer was recorded
        (,,,,, bytes32 bestAnswer,,,,) = realitio.getQuestion(questionId);
        assertEq(bestAnswer, bytes32(uint256(2)), "Answer should be recorded");

        // Check that WKAIA was minted from KAIA
        assertEq(wkaia.balanceOf(address(zapper)), 0, "Zapper should not hold WKAIA");
        assertEq(wkaia.balanceOf(feeRecipient), fee, "Fee should be paid in WKAIA");
    }

    function testZapperRevertsForNonWKAIA() public {
        // Create question with different token
        MockWKAIA otherToken = new MockWKAIA();
        bytes32 otherQuestionId = realitio.askQuestionERC20(
            address(otherToken), 0, "Other question?", address(0), 86400, 0, bytes32(uint256(2))
        );

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(wkaia), amount: 0}),
            nonce: 1,
            deadline: block.timestamp + 3600
        });

        // Should revert when question doesn't use WKAIA
        vm.expectRevert(ZapperWKAIA.BondTokenNotWKAIA.selector);
        zapper.answerMixedWithPermit2{value: 1 ether}(
            otherQuestionId, bytes32(uint256(1)), 1 ether, permit, "", alice, 0
        );
    }

    function testZapperRefundsExcessKAIA() public {
        uint256 bondAmount = 1 ether;
        (uint256 fee, uint256 total) = realitio.feeOn(bondAmount);

        uint256 aliceBalanceBefore = alice.balance;
        uint256 excessKaia = 0.5 ether;

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(wkaia), amount: 0}),
            nonce: 1,
            deadline: block.timestamp + 3600
        });

        // Send excess KAIA
        vm.prank(alice);
        zapper.answerMixedWithPermit2{value: total + excessKaia}(
            questionId, bytes32(uint256(1)), bondAmount, permit, "", alice, 0
        );

        // Check that excess was refunded
        assertEq(alice.balance, aliceBalanceBefore - total, "Excess KAIA should be refunded");
    }
}
