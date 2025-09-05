// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import {RealitioERC20} from "../../src/RealitioERC20.sol";
import {MockUSDT} from "../../src/tokens/MockUSDT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Reality_Fixture is Test {
    RealitioERC20 internal reality;
    MockUSDT internal usdt;

    address internal ADMIN = address(0xA0);
    address internal ARB = address(0xA1);
    address internal FEE = address(0xA2);
    address internal U1 = address(0xB1);
    address internal U2 = address(0xB2);
    address internal U3 = address(0xB3);
    address internal U4 = address(0xB4);

    uint16 internal constant FEE_BPS = 25;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function setUp() public virtual {
        vm.startPrank(ADMIN);

        // 1) Deploy tUSDT (6 decimals)
        usdt = new MockUSDT();

        // 2) Deploy Reality with correct constructor parameters
        // constructor(address _feeRecipient, uint16 _feeBps, address _permit2)
        reality = new RealitioERC20(FEE, FEE_BPS, PERMIT2);

        vm.stopPrank();

        // Labeling for better test output
        vm.label(ADMIN, "ADMIN");
        vm.label(ARB, "ARBITRATOR");
        vm.label(FEE, "FEE_RECIPIENT");
        vm.label(U1, "USER1");
        vm.label(U2, "USER2");
        vm.label(U3, "USER3");
        vm.label(U4, "USER4");
        vm.label(address(usdt), "tUSDT");
        vm.label(address(reality), "REALITY");

        // Initial funding - 100M tUSDT each for ample testing
        dealUSDT(U1, 100_000_000e6);
        dealUSDT(U2, 100_000_000e6);
        dealUSDT(U3, 100_000_000e6);
        dealUSDT(U4, 100_000_000e6);

        // Pre-approve for all users
        vm.prank(U1);
        usdt.approve(address(reality), type(uint256).max);
        vm.prank(U2);
        usdt.approve(address(reality), type(uint256).max);
        vm.prank(U3);
        usdt.approve(address(reality), type(uint256).max);
        vm.prank(U4);
        usdt.approve(address(reality), type(uint256).max);
    }

    function dealUSDT(address to, uint256 amount) internal {
        usdt.mint(to, amount);
    }

    // ===== Answer Encoding Helpers =====

    function encodeBinary(bool yes) public pure returns (bytes32) {
        return bytes32(yes ? uint256(1) : uint256(0));
    }

    function encodeMulti(uint256 index) public pure returns (bytes32) {
        return bytes32(index);
    }

    function encodeInt(uint256 v) public pure returns (bytes32) {
        return bytes32(v);
    }

    function encodeUnix(uint256 ts) public pure returns (bytes32) {
        return bytes32(ts);
    }

    function encodeText(string memory s) public pure returns (bytes32) {
        // Simple hash encoding for text template
        return keccak256(abi.encodePacked(_normalize(s)));
    }

    function _normalize(string memory s) internal pure returns (string memory) {
        // For simplicity, just return as-is (could add lowercase/trim logic)
        return s;
    }

    // ===== Question Creation Helper =====

    function askWithBondToken(
        uint32 templateId,
        string memory text,
        address arbitrator,
        uint32 timeoutSec,
        uint32 openingTs,
        address bondToken
    ) internal returns (bytes32 qid) {
        vm.startPrank(ADMIN);

        // Use askQuestionERC20 to specify bond token
        qid = reality.askQuestionERC20(
            bondToken,
            templateId,
            text,
            arbitrator,
            timeoutSec,
            openingTs,
            bytes32(uint256(block.timestamp)) // nonce
        );

        vm.stopPrank();
    }

    function ask(uint32 templateId, string memory text, uint32 timeoutSec, uint32 openingTs)
        internal
        returns (bytes32 qid)
    {
        return askWithBondToken(templateId, text, ARB, timeoutSec, openingTs, address(usdt));
    }

    // ===== Fee Calculation Helper =====

    function feeOn(uint256 amount) internal view returns (uint256 fee, uint256 total) {
        return reality.feeOn(amount);
    }

    // ===== Assertion Helpers =====

    function assertFeeTransfer(uint256 balanceBefore, uint256 balanceAfter, uint256 expectedFee) internal {
        assertEq(balanceAfter - balanceBefore, expectedFee, "Fee transfer mismatch");
    }

    // ===== Time Helpers =====

    function warpTo(uint256 timestamp) internal {
        vm.warp(timestamp);
    }

    function warpBy(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
    }

    function now_() internal view returns (uint256) {
        return block.timestamp;
    }

    // ===== Question State Helpers =====

    function getQuestionState(bytes32 qid)
        internal
        view
        returns (
            address arbitrator,
            address bondToken,
            uint32 timeout,
            uint32 openingTs,
            bytes32 contentHash,
            bytes32 bestAnswer,
            uint256 bestBond,
            address bestAnswerer,
            uint64 lastAnswerTs,
            bool finalized
        )
    {
        return reality.getQuestion(qid);
    }

    function isFinalized(bytes32 qid) internal view returns (bool) {
        (,,,,,,,,, bool finalized) = getQuestionState(qid);
        return finalized;
    }

    function getBestAnswer(bytes32 qid) internal view returns (bytes32) {
        (,,,,, bytes32 bestAnswer,,,,) = getQuestionState(qid);
        return bestAnswer;
    }

    function getBestBond(bytes32 qid) internal view returns (uint256) {
        (,,,,,, uint256 bestBond,,,) = getQuestionState(qid);
        return bestBond;
    }

    function getLastAnswerTs(bytes32 qid) internal view returns (uint64) {
        (,,,,,,,, uint64 lastAnswerTs,) = getQuestionState(qid);
        return lastAnswerTs;
    }
}
