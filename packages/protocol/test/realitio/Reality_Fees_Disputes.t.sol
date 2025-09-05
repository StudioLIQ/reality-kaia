// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Reality_Fixture.t.sol";
import {MockArbitrator} from "./mocks/MockArbitrator.sol";

contract Reality_Fees_Disputes is Reality_Fixture {
    MockArbitrator internal arbitrator;

    function setUp() public override {
        super.setUp();

        // Deploy and setup MockArbitrator
        vm.startPrank(ADMIN);
        arbitrator = new MockArbitrator();
        arbitrator.setReality(address(reality));
        vm.stopPrank();

        vm.label(address(arbitrator), "MOCK_ARBITRATOR");

        // Fund arbitrator account for gas
        vm.deal(address(arbitrator), 10 ether);
    }

    function test_fee_rounding_edge_cases() public {
        uint32 timeoutSec = 1 days;
        uint32 openingTs = uint32(block.timestamp);

        // Test various bond amounts for fee calculation edge cases
        uint256[] memory bonds = new uint256[](12);
        bonds[0] = 1e6; // 1 tUSDT - minimum
        bonds[1] = 10e6; // 10 tUSDT
        bonds[2] = 39e6; // 39 tUSDT - tests rounding
        bonds[3] = 40e6; // 40 tUSDT - exact 0.01 fee
        bonds[4] = 100e6; // 100 tUSDT
        bonds[5] = 399e6; // 399 tUSDT
        bonds[6] = 999e6; // 999 tUSDT
        bonds[7] = 1_000e6; // 1,000 tUSDT
        bonds[8] = 12_345e6; // 12,345 tUSDT
        bonds[9] = 99_999e6; // 99,999 tUSDT
        bonds[10] = 100_000e6; // 100,000 tUSDT
        bonds[11] = 1_000_000e6; // 1,000,000 tUSDT

        for (uint256 i = 0; i < bonds.length; i++) {
            bytes32 qid = ask(4, string.concat("Fee rounding test ", vm.toString(i)), timeoutSec, openingTs);

            uint256 bond = bonds[i];
            (uint256 expectedFee, uint256 expectedTotal) = feeOn(bond);

            // Verify fee calculation (25 bps = 0.25% = bond * 25 / 10000)
            uint256 calculatedFee = (bond * FEE_BPS) / 10000;
            assertEq(expectedFee, calculatedFee, string.concat("Fee calculation for bond ", vm.toString(bond)));

            // Track balances
            uint256 feeBalanceBefore = usdt.balanceOf(FEE);
            uint256 userBalanceBefore = usdt.balanceOf(U1);
            uint256 contractBalanceBefore = usdt.balanceOf(address(reality));

            // Submit answer
            vm.prank(U1);
            reality.submitAnswerWithToken(qid, encodeInt(i), bond, address(usdt));

            // Verify transfers
            assertEq(
                usdt.balanceOf(FEE) - feeBalanceBefore,
                expectedFee,
                string.concat("Fee recipient should receive exact fee for bond ", vm.toString(bond))
            );

            assertEq(
                userBalanceBefore - usdt.balanceOf(U1),
                expectedTotal,
                string.concat("User should pay bond + fee for bond ", vm.toString(bond))
            );

            assertEq(
                usdt.balanceOf(address(reality)) - contractBalanceBefore,
                bond,
                string.concat("Contract should hold bond amount for bond ", vm.toString(bond))
            );
        }
    }

    function test_arbitration_basic_flow() public {
        uint32 timeoutSec = 3 days;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid = askWithBondToken(3, "Who wins? A/B/C", address(arbitrator), timeoutSec, openingTs, address(usdt));

        // U1 and U2 submit different answers
        vm.prank(U1);
        reality.submitAnswerWithToken(qid, encodeMulti(0), 1_000e6, address(usdt));

        vm.prank(U2);
        reality.submitAnswerWithToken(qid, encodeMulti(1), 2_000e6, address(usdt));

        // U1 requests arbitration
        vm.deal(U1, 1 ether);
        vm.prank(U1);
        reality.requestArbitration{value: 0.01 ether}(qid);

        // Arbitrator decides
        vm.prank(ADMIN);
        arbitrator.submitDecision(qid, encodeMulti(0)); // Decide for option A

        // Should be finalized with arbitrator's answer
        assertTrue(isFinalized(qid), "Should be finalized after arbitration");
        assertEq(getBestAnswer(qid), encodeMulti(0), "Answer should match arbitrator decision");
    }

    function test_arbitration_prevents_further_answers() public {
        uint32 timeoutSec = 2 days;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid =
            askWithBondToken(1, "Binary arbitration test", address(arbitrator), timeoutSec, openingTs, address(usdt));

        // Initial answers
        vm.prank(U1);
        reality.submitAnswerWithToken(qid, encodeBinary(true), 500e6, address(usdt));

        vm.prank(U2);
        reality.submitAnswerWithToken(qid, encodeBinary(false), 1_000e6, address(usdt));

        // Request arbitration
        vm.deal(U3, 1 ether);
        vm.prank(U3);
        reality.requestArbitration{value: 0.01 ether}(qid);

        // Further answers should be blocked
        vm.prank(U3);
        vm.expectRevert("Arbitration pending");
        reality.submitAnswerWithToken(qid, encodeBinary(true), 2_000e6, address(usdt));

        // Arbitrator resolves
        vm.prank(ADMIN);
        arbitrator.submitDecision(qid, encodeBinary(false));

        assertTrue(isFinalized(qid), "Should be finalized");
        assertEq(getBestAnswer(qid), encodeBinary(false), "Should have arbitrator's answer");
    }

    function test_competition_with_increasing_fees() public {
        uint32 timeoutSec = 1 days;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid = ask(5, "Competition with fees tracking", timeoutSec, openingTs);

        // Track cumulative fees
        uint256 cumulativeFees = 0;
        uint256 initialFeeBalance = usdt.balanceOf(FEE);

        // Multiple rounds with exponentially increasing bonds
        uint256 bond = 100e6; // Start at 100 tUSDT

        for (uint256 i = 0; i < 10; i++) {
            address user = i % 2 == 0 ? U1 : U2;
            bytes32 answer = encodeUnix(1_600_000_000 + i * 1_000_000);

            (uint256 fee,) = feeOn(bond);
            cumulativeFees += fee;

            vm.prank(user);
            reality.submitAnswerWithToken(qid, answer, bond, address(usdt));

            // Verify cumulative fees
            assertEq(
                usdt.balanceOf(FEE) - initialFeeBalance,
                cumulativeFees,
                string.concat("Cumulative fees after round ", vm.toString(i))
            );

            bond = bond * 2; // Double bond for next round
        }

        // Final fee check
        assertEq(
            usdt.balanceOf(FEE) - initialFeeBalance, cumulativeFees, "Total fees collected should match cumulative"
        );
    }

    function test_zero_bond_rejection() public {
        uint32 timeoutSec = 1 days;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid = ask(1, "Zero bond test", timeoutSec, openingTs);

        // Attempting to submit with zero bond should fail
        vm.prank(U1);
        vm.expectRevert(); // Exact error depends on implementation
        reality.submitAnswerWithToken(qid, encodeBinary(true), 0, address(usdt));
    }

    function test_commitment_reveal_with_fees() public {
        uint32 timeoutSec = 3 days;
        uint32 openingTs = uint32(block.timestamp);
        uint256 bond = 1_000e6;

        bytes32 qid = ask(7, "Commit-reveal test", timeoutSec, openingTs);

        // Create commitment
        bytes32 answer = encodeText("secret");
        bytes32 nonce = keccak256("my_nonce");
        bytes32 commitment = keccak256(abi.encodePacked(answer, nonce));

        (uint256 expectedFee,) = feeOn(bond);
        uint256 feeBefore = usdt.balanceOf(FEE);

        // Submit commitment
        vm.prank(U1);
        reality.submitAnswerCommitment(qid, commitment, bond);

        // Verify fee was charged
        assertEq(usdt.balanceOf(FEE) - feeBefore, expectedFee, "Fee should be charged on commitment");

        // Reveal answer
        vm.prank(U1);
        reality.revealAnswer(qid, answer, nonce);

        // Check answer was revealed
        assertEq(getBestAnswer(qid), answer, "Answer should be revealed");
        assertEq(getBestBond(qid), bond, "Bond should be set");
    }

    function test_extreme_competition_stress() public {
        uint32 timeoutSec = 30 minutes;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid = ask(4, "Extreme competition", timeoutSec, openingTs);

        uint256 totalFees = 0;
        uint256 bond = 1e6; // Start with 1 tUSDT

        // Reduce to 20 rounds with smaller increases to avoid overflow
        for (uint256 i = 0; i < 20; i++) {
            address user = i % 4 == 0 ? U1 : i % 4 == 1 ? U2 : i % 4 == 2 ? U3 : U4;
            bytes32 answer = encodeInt(i);

            (uint256 fee,) = feeOn(bond);
            totalFees += fee;

            vm.prank(user);
            reality.submitAnswerWithToken(qid, answer, bond, address(usdt));

            // Very conservative bond increase to avoid overflow
            if (i % 5 == 4) {
                bond = bond * 3; // Reduced from 5x to 3x
            } else {
                bond = bond * 2;
            }
        }

        // Verify final state
        assertEq(getBestAnswer(qid), encodeInt(19), "Last answer should win");
        assertTrue(getBestBond(qid) > 10_000e6, "Bond should be very large");

        // Finalize
        warpBy(timeoutSec);
        reality.finalize(qid);
        assertTrue(isFinalized(qid), "Should finalize after extreme competition");
    }

    function test_arbitrator_immediate_finalization() public {
        uint32 timeoutSec = 7 days;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid =
            askWithBondToken(1, "Immediate arbitration", address(arbitrator), timeoutSec, openingTs, address(usdt));

        // Single answer
        vm.prank(U1);
        reality.submitAnswerWithToken(qid, encodeBinary(true), 100e6, address(usdt));

        // Request arbitration immediately
        vm.deal(U2, 1 ether);
        vm.prank(U2);
        reality.requestArbitration{value: 0.01 ether}(qid);

        // Arbitrator decides immediately (no need to wait for timeout)
        vm.prank(ADMIN);
        arbitrator.submitDecision(qid, encodeBinary(false));

        // Should be finalized immediately
        assertTrue(isFinalized(qid), "Should finalize immediately via arbitrator");
        assertEq(getBestAnswer(qid), encodeBinary(false), "Should have arbitrator answer");

        // Cannot submit more answers after finalization
        vm.prank(U3);
        vm.expectRevert("Question already finalized");
        reality.submitAnswerWithToken(qid, encodeBinary(true), 200e6, address(usdt));
    }

    function test_fee_recipient_accumulation() public {
        uint256 initialBalance = usdt.balanceOf(FEE);
        uint256 expectedTotalFees = 0;

        // Create and answer multiple questions
        for (uint256 i = 0; i < 10; i++) {
            uint32 timeoutSec = 1 days;
            uint32 openingTs = uint32(block.timestamp);

            bytes32 qid = ask(1, string.concat("Fee accumulation ", vm.toString(i)), timeoutSec, openingTs);

            // Multiple answers per question
            uint256 bond = 100e6 * (i + 1); // Increasing bonds

            for (uint256 j = 0; j < 3; j++) {
                address user = j == 0 ? U1 : j == 1 ? U2 : U3;
                (uint256 fee,) = feeOn(bond);
                expectedTotalFees += fee;

                vm.prank(user);
                reality.submitAnswerWithToken(qid, encodeBinary(j % 2 == 0), bond, address(usdt));

                bond = bond * 2;
            }
        }

        // Verify total fees accumulated
        assertEq(usdt.balanceOf(FEE) - initialBalance, expectedTotalFees, "Fee recipient should accumulate all fees");
    }
}
