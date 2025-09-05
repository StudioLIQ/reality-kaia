// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Reality_Fixture.t.sol";

contract Reality_Templates_E2E is Reality_Fixture {
    struct TemplateCase {
        uint32 templateId;
        string question;
        bytes32 answer1;
        bytes32 answer2;
        bytes32 answer3;
        bytes32 answer4;
        string description;
    }

    TemplateCase[] internal cases;

    function setUp() public override {
        super.setUp();

        // Setup test cases for each template
        // Template 1: Binary (YES/NO)
        cases.push(
            TemplateCase({
                templateId: 1,
                question: "Will ETH price exceed $5000 by 2025-12-31 00:00 UTC?",
                answer1: encodeBinary(true), // YES
                answer2: encodeBinary(false), // NO
                answer3: encodeBinary(true), // YES
                answer4: encodeBinary(false), // NO
                description: "Binary YES/NO"
            })
        );

        // Template 3: Multiple choice (0-indexed)
        cases.push(
            TemplateCase({
                templateId: 3,
                question: "Who will win the election? [A/B/C/D]",
                answer1: encodeMulti(0), // Choice A
                answer2: encodeMulti(1), // Choice B
                answer3: encodeMulti(2), // Choice C
                answer4: encodeMulti(3), // Choice D
                description: "Multiple choice"
            })
        );

        // Template 4: Integer
        cases.push(
            TemplateCase({
                templateId: 4,
                question: "How many transactions will be processed?",
                answer1: encodeInt(42),
                answer2: encodeInt(100),
                answer3: encodeInt(999),
                answer4: encodeInt(1337),
                description: "Integer value"
            })
        );

        // Template 5: Date/Unix timestamp
        cases.push(
            TemplateCase({
                templateId: 5,
                question: "When will the contract be deployed? (Unix timestamp)",
                answer1: encodeUnix(1700000000),
                answer2: encodeUnix(1800000000),
                answer3: encodeUnix(1900000000),
                answer4: encodeUnix(2000000000),
                description: "Unix timestamp"
            })
        );

        // Template 7: Text (hashed)
        cases.push(
            TemplateCase({
                templateId: 7,
                question: "What is the secret code?",
                answer1: encodeText("alpha"),
                answer2: encodeText("beta"),
                answer3: encodeText("gamma"),
                answer4: encodeText("delta"),
                description: "Text/hash"
            })
        );
    }

    function test_templates_opening_enforcement() public {
        // Test only the first template to isolate the issue
        TemplateCase memory tc = cases[0];

        // Start at a fixed timestamp
        vm.warp(100);

        uint32 timeoutSec = 3 days;
        uint32 openingTs = uint32(block.timestamp + 100);
        uint256 bond = 1_000e6; // 1000 tUSDT

        bytes32 qid = ask(tc.templateId, tc.question, timeoutSec, openingTs);

        // Test 1: Cannot submit before opening
        vm.prank(U1);
        vm.expectRevert("Question not yet open");
        reality.submitAnswerWithToken(qid, tc.answer1, bond, address(usdt));

        // Warp to opening time
        warpTo(uint256(openingTs));

        // Test 2: Can submit after opening
        uint256 feeBefore = usdt.balanceOf(FEE);
        (uint256 expectedFee,) = feeOn(bond);

        vm.prank(U1);
        reality.submitAnswerWithToken(qid, tc.answer1, bond, address(usdt));

        // Verify fee was collected
        assertFeeTransfer(feeBefore, usdt.balanceOf(FEE), expectedFee);

        // Verify answer was recorded
        assertEq(
            getBestAnswer(qid),
            tc.answer1,
            string.concat("Template ", vm.toString(tc.templateId), ": Answer should be recorded")
        );
        assertEq(getBestBond(qid), bond, "Bond should be recorded");
    }

    function test_templates_timeout_finalization() public {
        for (uint256 i = 0; i < cases.length; i++) {
            TemplateCase memory tc = cases[i];

            uint32 timeoutSec = 2 days;
            // Use current timestamp + offset to ensure future opening time
            uint32 openingTs = uint32(block.timestamp + 10);
            uint256 bond = 500e6; // 500 tUSDT

            bytes32 qid = ask(tc.templateId, tc.question, timeoutSec, openingTs);

            // Warp to opening and submit answer
            warpTo(uint256(openingTs));
            vm.prank(U1);
            reality.submitAnswerWithToken(qid, tc.answer1, bond, address(usdt));

            uint64 lastAnswerTs = getLastAnswerTs(qid);

            // Test: Not finalized before timeout
            warpTo(uint256(lastAnswerTs) + uint256(timeoutSec) - 1);
            assertFalse(
                isFinalized(qid),
                string.concat("Template ", vm.toString(tc.templateId), ": Should not be finalized before timeout")
            );

            // Test: Can finalize after timeout
            warpTo(uint256(lastAnswerTs) + uint256(timeoutSec));
            reality.finalize(qid);

            assertTrue(
                isFinalized(qid),
                string.concat("Template ", vm.toString(tc.templateId), ": Should be finalized after timeout")
            );
            assertEq(getBestAnswer(qid), tc.answer1, "Final answer should match submitted answer");

            // Reset timestamp for next iteration to avoid issues
            vm.warp(1);
        }
    }

    function test_templates_competition_and_fees() public {
        for (uint256 i = 0; i < cases.length; i++) {
            TemplateCase memory tc = cases[i];

            uint32 timeoutSec = 1 days;
            // Use current timestamp for each question to avoid "opening time in past" error
            uint32 openingTs = uint32(block.timestamp);

            bytes32 qid = ask(tc.templateId, tc.question, timeoutSec, openingTs);

            // Competition between users with properly increasing bonds
            // Each bond must be at least double the previous
            uint256[4] memory bonds = [uint256(1_000e6), 2_000e6, 4_000e6, 8_000e6];
            address[4] memory users = [U1, U2, U3, U4];
            bytes32[4] memory answers = [tc.answer1, tc.answer2, tc.answer3, tc.answer4];

            uint256 totalFeesCollected = 0;
            uint256 feeBalanceBefore = usdt.balanceOf(FEE);

            for (uint256 j = 0; j < 4; j++) {
                (uint256 fee,) = feeOn(bonds[j]);

                vm.prank(users[j]);
                reality.submitAnswerWithToken(qid, answers[j], bonds[j], address(usdt));

                totalFeesCollected += fee;

                // Verify current best answer
                assertEq(
                    getBestAnswer(qid),
                    answers[j],
                    string.concat("Template ", vm.toString(tc.templateId), ": Best answer should update")
                );
                assertEq(getBestBond(qid), bonds[j], "Best bond should update");
            }

            // Verify total fees collected
            assertEq(
                usdt.balanceOf(FEE) - feeBalanceBefore,
                totalFeesCollected,
                string.concat("Template ", vm.toString(tc.templateId), ": Total fees should match")
            );

            // Finalize with last answer
            warpBy(timeoutSec);
            reality.finalize(qid);

            assertEq(getBestAnswer(qid), tc.answer4, "Final answer should be the last submission");

            // Reset timestamp for next iteration to avoid issues
            vm.warp(block.timestamp + 100);
        }
    }

    function test_templates_no_answer_no_finalization() public {
        uint32 timeoutSec = 2 days;

        // Create questions for all templates but don't answer
        for (uint256 i = 0; i < cases.length; i++) {
            TemplateCase memory tc = cases[i];
            // Use current timestamp + offset for each question to ensure it's in the future
            uint32 openingTs = uint32(block.timestamp + 10);
            bytes32 qid = ask(tc.templateId, string.concat(tc.question, " [NO ANSWER TEST]"), timeoutSec, openingTs);

            // Warp to opening first, then past timeout
            warpTo(uint256(openingTs));
            warpBy(timeoutSec * 2);

            // Should not be finalized (no answers submitted)
            assertFalse(
                isFinalized(qid),
                string.concat("Template ", vm.toString(tc.templateId), ": Should not finalize without answers")
            );

            // Attempting to finalize should revert
            vm.expectRevert("No answers submitted");
            reality.finalize(qid);

            // Reset timestamp for next iteration
            vm.warp(1);
        }
    }

    function test_templates_minimum_bond_doubling() public {
        for (uint256 i = 0; i < cases.length; i++) {
            TemplateCase memory tc = cases[i];

            uint32 timeoutSec = 1 days;
            uint32 openingTs = uint32(block.timestamp);
            uint256 initialBond = 100e6; // 100 tUSDT

            bytes32 qid = ask(tc.templateId, tc.question, timeoutSec, openingTs);

            // First answer
            vm.prank(U1);
            reality.submitAnswerWithToken(qid, tc.answer1, initialBond, address(usdt));

            // Second answer must have at least double bond
            vm.prank(U2);
            vm.expectRevert("Bond too low");
            reality.submitAnswerWithToken(qid, tc.answer2, initialBond, address(usdt));

            // Should work with double bond
            vm.prank(U2);
            reality.submitAnswerWithToken(qid, tc.answer2, initialBond * 2, address(usdt));

            assertEq(
                getBestBond(qid),
                initialBond * 2,
                string.concat("Template ", vm.toString(tc.templateId), ": Bond should double")
            );

            // Third answer needs 4x initial
            vm.prank(U3);
            vm.expectRevert("Bond too low");
            reality.submitAnswerWithToken(qid, tc.answer3, initialBond * 3, address(usdt));

            vm.prank(U3);
            reality.submitAnswerWithToken(qid, tc.answer3, initialBond * 4, address(usdt));

            assertEq(getBestBond(qid), initialBond * 4, "Bond should be 4x initial");
        }
    }

    function test_templates_fee_calculation_precision() public {
        // Test fee calculation with various bond amounts for precision
        uint256[10] memory testBonds = [
            uint256(1e6), // 1 tUSDT
            10e6, // 10 tUSDT
            100e6, // 100 tUSDT
            999e6, // 999 tUSDT
            1_000e6, // 1,000 tUSDT
            12_345e6, // 12,345 tUSDT
            100_000e6, // 100,000 tUSDT
            999_999e6, // 999,999 tUSDT
            1_000_000e6, // 1,000,000 tUSDT
            10_000_000e6 // 10,000,000 tUSDT
        ];

        uint32 timeoutSec = 1 days;
        uint32 openingTs = uint32(block.timestamp);

        for (uint256 i = 0; i < testBonds.length; i++) {
            // Use template 4 (integer) for this test
            bytes32 qid = ask(4, string.concat("Fee test ", vm.toString(i)), timeoutSec, openingTs);

            uint256 bond = testBonds[i];
            (uint256 expectedFee, uint256 expectedTotal) = feeOn(bond);

            // Verify fee calculation (25 bps = 0.25%)
            assertEq(expectedFee, bond * FEE_BPS / 10000, "Fee should be exactly 25 bps");
            assertEq(expectedTotal, bond + expectedFee, "Total should be bond + fee");

            uint256 feeBefore = usdt.balanceOf(FEE);
            uint256 userBefore = usdt.balanceOf(U1);

            vm.prank(U1);
            reality.submitAnswerWithToken(qid, encodeInt(i), bond, address(usdt));

            // Verify exact fee transfer
            assertEq(usdt.balanceOf(FEE) - feeBefore, expectedFee, string.concat("Fee for bond ", vm.toString(bond)));
            assertEq(userBefore - usdt.balanceOf(U1), expectedTotal, "User should pay bond + fee");
        }
    }

    function test_templates_rapid_competition() public {
        // Test rapid-fire competition on a single question
        uint32 templateId = 3; // Multiple choice
        uint32 timeoutSec = 1 hours;
        uint32 openingTs = uint32(block.timestamp);

        bytes32 qid = ask(templateId, "Rapid competition test", timeoutSec, openingTs);

        uint256 currentBond = 10e6; // Start with 10 tUSDT

        // 20 rounds of competition
        for (uint256 i = 0; i < 20; i++) {
            address user = i % 2 == 0 ? U1 : U2;
            bytes32 answer = encodeMulti(i % 4);

            vm.prank(user);
            reality.submitAnswerWithToken(qid, answer, currentBond, address(usdt));

            assertEq(getBestAnswer(qid), answer, string.concat("Round ", vm.toString(i)));
            assertEq(getBestBond(qid), currentBond, string.concat("Bond round ", vm.toString(i)));

            currentBond = currentBond * 2; // Double for next round
        }

        // Finalize after timeout
        warpBy(timeoutSec);
        reality.finalize(qid);

        assertTrue(isFinalized(qid), "Should be finalized after rapid competition");
    }
}
