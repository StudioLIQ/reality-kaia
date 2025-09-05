// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IReality {
    function askQuestion(
        uint32 templateId,
        string calldata question,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce
    ) external returns (bytes32 questionId);

    function submitAnswer(bytes32 questionId, bytes32 answer, uint256 bond) external;

    function submitAnswerCommitment(bytes32 questionId, bytes32 answerHash, uint256 bond) external;

    function revealAnswer(bytes32 questionId, bytes32 answer, bytes32 nonce) external;

    function finalize(bytes32 questionId) external;

    function resultFor(bytes32 questionId) external view returns (bytes32);

    function getFinalAnswerIfMatches(
        bytes32 questionId,
        bytes32 contentHash,
        address arbitrator,
        uint32 minTimeout,
        uint256 minBond
    ) external view returns (bytes32);

    function claimWinnings(bytes32 questionId) external;

    function requestArbitration(bytes32 questionId) external payable;

    event LogNewQuestion(
        bytes32 indexed questionId,
        address indexed asker,
        uint32 templateId,
        string question,
        bytes32 contentHash,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce,
        uint256 createdTs
    );

    event LogNewAnswer(
        bytes32 indexed questionId, bytes32 indexed answer, address indexed answerer, uint256 bond, uint256 ts
    );

    event LogNewCommitment(
        bytes32 indexed questionId, bytes32 indexed answerHash, address indexed committer, uint256 bond, uint256 ts
    );

    event LogReveal(
        bytes32 indexed questionId, address indexed revealer, bytes32 indexed answer, bytes32 answerHash, uint256 bond
    );

    event LogFinalize(bytes32 indexed questionId, bytes32 indexed answer);

    event LogArbitrationRequested(bytes32 indexed questionId, address indexed requester);

    event LogArbitratorAnswered(bytes32 indexed questionId, bytes32 indexed answer, address indexed arbitrator);

    event LogClaim(bytes32 indexed questionId, address indexed winner, uint256 amount);
}
