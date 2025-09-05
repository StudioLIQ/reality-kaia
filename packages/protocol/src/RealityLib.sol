// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library RealityLib {
    bytes32 public constant INVALID_ANSWER = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    function calculateQuestionId(
        uint32 templateId,
        string memory question,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce,
        address asker
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(templateId, keccak256(bytes(question)), arbitrator, timeout, openingTs, nonce, asker));
    }

    function calculateContentHash(uint32 templateId, string memory question) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(templateId, question));
    }

    function calculateAnswerHash(bytes32 answer, bytes32 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(answer, nonce));
    }

    function isFinalizationReady(uint64 lastAnswerTs, uint32 timeout) internal view returns (bool) {
        return block.timestamp >= uint256(lastAnswerTs) + uint256(timeout);
    }

    function isInRevealWindow(uint32 openingTs, uint32 timeout, uint64 commitTs) internal view returns (bool) {
        if (block.timestamp < openingTs) return false;

        uint256 revealWindow = uint256(timeout) / 8;
        uint256 revealDeadline = uint256(commitTs) + revealWindow;

        return block.timestamp <= revealDeadline;
    }

    function calculateMinBond(uint256 currentBond) internal pure returns (uint256) {
        if (currentBond == 0) return 1;
        return currentBond * 2;
    }
}
