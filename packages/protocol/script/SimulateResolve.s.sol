// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {RealitioERC20} from "../src/RealitioERC20.sol";
import {RealityLib} from "../src/RealityLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {stdJson} from "forge-std/StdJson.sol";
import "./helpers/Time.s.sol";

contract SimulateResolve is Script {
    using stdJson for string;
    using RealityLib for *;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Load deployment addresses
        string memory chainId = vm.toString(block.chainid);
        string memory path = string.concat("../../deployments/", chainId, ".json");
        string memory json = vm.readFile(path);

        address realitioAddress = json.readAddress(".realitioERC20");
        console2.log("Using RealitioERC20 at:", realitioAddress);

        // Get question ID from environment or use a default
        bytes32 questionId;
        try vm.envBytes32("QUESTION_ID") returns (bytes32 id) {
            questionId = id;
        } catch {
            // Use a sample question ID for demonstration
            questionId = keccak256(abi.encodePacked("sample"));
            console2.log("Using sample question ID");
        }

        console2.log("Simulating resolution for question:", vm.toString(questionId));

        vm.startBroadcast(deployerPrivateKey);

        RealitioERC20 realitio = RealitioERC20(realitioAddress);

        // Get question details
        (
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
        ) = realitio.getQuestion(questionId);

        if (timeout == 0) {
            console2.log("Question does not exist. Please create one first with AskQuestion script.");
            vm.stopBroadcast();
            return;
        }

        console2.log("Question details:");
        console2.log("  Bond token:", bondToken);
        console2.log("  Timeout:", timeout);
        console2.log("  Opening timestamp:", openingTs);
        console2.log("  Finalized:", finalized);

        if (finalized) {
            console2.log("Question already finalized with answer:", vm.toString(bestAnswer));
            vm.stopBroadcast();
            return;
        }

        // Ensure we have a bond token
        require(bondToken != address(0), "Bond token not set for this question");

        IERC20 token = IERC20(bondToken);

        // Step 1: Submit commitment
        bytes32 answer = bytes32(uint256(1)); // YES answer
        bytes32 commitNonce = keccak256(abi.encodePacked(block.timestamp));
        bytes32 answerHash = RealityLib.calculateAnswerHash(answer, commitNonce);
        uint256 bond = 1 ether;

        console2.log("Step 1: Submitting answer commitment...");
        console2.log("  Answer hash:", vm.toString(answerHash));
        console2.log("  Bond amount:", bond);

        // Approve and submit commitment
        token.approve(realitioAddress, bond);
        realitio.submitAnswerCommitment(questionId, answerHash, bond);

        console2.log("Commitment submitted!");

        // Step 2: Fast forward time to reveal window
        uint256 revealWindow = timeout / 8;
        console2.log("Step 2: Waiting for reveal window...");
        console2.log("  Reveal window duration:", revealWindow);

        // Use Time helper to advance time (in test environment)
        Time.skipTime(1); // Skip 1 second to enter reveal window

        // Step 3: Reveal answer
        console2.log("Step 3: Revealing answer...");
        realitio.revealAnswer(questionId, answer, commitNonce);
        console2.log("Answer revealed!");

        // Step 4: Fast forward past timeout
        console2.log("Step 4: Waiting for timeout to expire...");
        Time.skipTime(timeout + 1);

        // Step 5: Finalize
        console2.log("Step 5: Finalizing question...");
        realitio.finalize(questionId);
        console2.log("Question finalized!");

        // Step 6: Check result
        bytes32 result = realitio.resultFor(questionId);
        console2.log("Step 6: Final result:", vm.toString(result));

        // Step 7: Claim winnings
        console2.log("Step 7: Claiming winnings...");
        realitio.claimWinnings(questionId);
        console2.log("Winnings claimed!");

        vm.stopBroadcast();

        console2.log("\nSimulation complete!");
    }
}
