// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./RealitioERC20V2.sol";

contract RealitioERC20V3 is RealitioERC20V2 {
    // Registry for pagination
    bytes32[] private _questionIds;
    mapping(bytes32 => uint256) public indexPlusOne; // 1-based index (0 means not registered)

    // Runtime snapshot per question
    struct Runtime {
        uint64 lastAnswerTs;
        bytes32 bestAnswer;
        uint256 bestBond;
        bool finalized;
        bool pendingArbitration;
    }
    mapping(bytes32 => Runtime) private _rt;

    // Events
    event QuestionRegistered(bytes32 indexed questionId, uint256 index);
    event RuntimeUpdated(
        bytes32 indexed questionId,
        uint64 lastAnswerTs,
        bytes32 bestAnswer,
        uint256 bestBond,
        bool finalized,
        bool pendingArbitration
    );

    constructor(
        address _feeRecipient,
        uint16 _feeBps,
        address _permit2
    ) RealitioERC20V2(_feeRecipient, _feeBps, _permit2) {}

    // Registry hook
    function _registerQuestion(bytes32 questionId) private {
        if (indexPlusOne[questionId] == 0) {
            _questionIds.push(questionId);
            indexPlusOne[questionId] = _questionIds.length;
            emit QuestionRegistered(questionId, _questionIds.length - 1);
        }
    }

    // New V3 method that wraps V2's askQuestionERC20Full
    function askQuestionERC20V3(
        address bondToken,
        uint32 templateId,
        string calldata content,
        string memory outcomesPacked,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce,
        string memory language,
        string memory category,
        string memory metadataURI
    ) public returns (bytes32 questionId) {
        // Call parent implementation
        questionId = super.askQuestionERC20Full(
            bondToken,
            templateId,
            content,
            outcomesPacked,
            arbitrator,
            timeout,
            openingTs,
            nonce,
            language,
            category,
            metadataURI
        );

        // Register in our registry
        _registerQuestion(questionId);

        // Initialize runtime (all zeros/false)
        _rt[questionId] = Runtime({
            lastAnswerTs: 0,
            bestAnswer: bytes32(0),
            bestBond: 0,
            finalized: false,
            pendingArbitration: false
        });

        emit RuntimeUpdated(questionId, 0, bytes32(0), 0, false, false);

        return questionId;
    }

    // View functions for pagination and batch reading
    function totalQuestions() external view returns (uint256) {
        return _questionIds.length;
    }

    function getQuestions(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        if (offset >= _questionIds.length) {
            return new bytes32[](0);
        }

        uint256 end = offset + limit;
        if (end > _questionIds.length) {
            end = _questionIds.length;
        }

        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = _questionIds[offset + i];
        }
        return result;
    }

    function getQuestionsDesc(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        if (_questionIds.length == 0 || offset >= _questionIds.length) {
            return new bytes32[](0);
        }

        uint256 startIdx = _questionIds.length - 1 - offset;
        uint256 count = limit;
        if (count > startIdx + 1) {
            count = startIdx + 1;
        }

        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _questionIds[startIdx - i];
        }
        return result;
    }

    struct QuestionFullV3 {
        // Header fields (from V2)
        address asker;
        address arbitrator;
        address bondToken;
        uint32 templateId;
        uint32 timeout;
        uint32 openingTs;
        bytes32 contentHash;
        uint64 createdAt;
        // Details fields (from V2)
        string content;
        string outcomesPacked;
        string language;
        string category;
        string metadataURI;
        // Runtime fields (from V3)
        uint64 lastAnswerTs;
        bytes32 bestAnswer;
        uint256 bestBond;
        bool finalized;
        bool pendingArbitration;
    }

    function getQuestionFullV3(bytes32 questionId) public view returns (QuestionFullV3 memory) {
        QuestionHeader memory h = _headers[questionId];
        QuestionDetails memory d = _details[questionId];
        Runtime memory rt = _rt[questionId];

        // Also check the base contract's finalized state
        bool isFinalized = questions[questionId].finalized || rt.finalized;
        
        // Get current best answer/bond from base contract if not in runtime
        bytes32 currentBestAnswer = rt.bestAnswer != bytes32(0) ? rt.bestAnswer : questions[questionId].bestAnswer;
        uint256 currentBestBond = rt.bestBond > 0 ? rt.bestBond : questions[questionId].bestBond;

        return QuestionFullV3({
            asker: h.asker,
            arbitrator: h.arbitrator,
            bondToken: h.bondToken,
            templateId: h.templateId,
            timeout: h.timeout,
            openingTs: h.openingTs,
            contentHash: h.contentHash,
            createdAt: h.createdAt,
            content: d.content,
            outcomesPacked: d.outcomesPacked,
            language: d.language,
            category: d.category,
            metadataURI: d.metadataURI,
            lastAnswerTs: uint64(questions[questionId].lastAnswerTs),
            bestAnswer: currentBestAnswer,
            bestBond: currentBestBond,
            finalized: isFinalized,
            pendingArbitration: questions[questionId].arbitrationPending
        });
    }

    function getQuestionFullBatch(bytes32[] calldata questionIds) external view returns (QuestionFullV3[] memory) {
        QuestionFullV3[] memory results = new QuestionFullV3[](questionIds.length);
        for (uint256 i = 0; i < questionIds.length; i++) {
            results[i] = getQuestionFullV3(questionIds[i]);
        }
        return results;
    }

    // Public method to register existing questions (for migration)
    function registerExistingQuestion(bytes32 questionId) external {
        require(questions[questionId].timeout > 0, "Question does not exist");
        _registerQuestion(questionId);
        
        // Sync runtime with current state
        _rt[questionId] = Runtime({
            lastAnswerTs: uint64(questions[questionId].lastAnswerTs),
            bestAnswer: questions[questionId].bestAnswer,
            bestBond: questions[questionId].bestBond,
            finalized: questions[questionId].finalized,
            pendingArbitration: questions[questionId].arbitrationPending
        });
    }

    // Batch register for migration
    function registerExistingQuestionsBatch(bytes32[] calldata questionIds) external {
        for (uint256 i = 0; i < questionIds.length; i++) {
            if (questions[questionIds[i]].timeout > 0 && indexPlusOne[questionIds[i]] == 0) {
                _registerQuestion(questionIds[i]);
                
                // Sync runtime with current state
                _rt[questionIds[i]] = Runtime({
                    lastAnswerTs: uint64(questions[questionIds[i]].lastAnswerTs),
                    bestAnswer: questions[questionIds[i]].bestAnswer,
                    bestBond: questions[questionIds[i]].bestBond,
                    finalized: questions[questionIds[i]].finalized,
                    pendingArbitration: questions[questionIds[i]].arbitrationPending
                });
            }
        }
    }
}