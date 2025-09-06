// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../RealitioERC20.sol";
import {RealityLib} from "../../RealityLib.sol";

contract RealitioERC20V2 is RealitioERC20 {
    using RealityLib for *;
    // Pack outcomes as US unit separator `\x1F` to simplify bindings
    string constant SEP = "\x1F";

    struct QuestionHeader {
        address asker;
        address arbitrator;
        address bondToken;
        uint32 templateId;
        uint32 timeout;
        uint32 openingTs;
        bytes32 contentHash; // keep for integrity
        uint64 createdAt;
    }

    struct QuestionDetails {
        string content;         // full question text (markdown/plain)
        string outcomesPacked;  // "optA␟optB␟optC" (for multi)
        string language;        // e.g. "en"
        string category;        // e.g. "sports"
        string metadataURI;     // optional offchain (kept for reference)
    }

    mapping(bytes32 => QuestionHeader) internal _headers;
    mapping(bytes32 => QuestionDetails) internal _details;

    event QuestionStored(bytes32 indexed questionId);

    constructor(
        address _feeRecipient,
        uint16 _feeBps,
        address _permit2
    ) RealitioERC20(_feeRecipient, _feeBps, _permit2) {}

    /**
     * @dev ask with full metadata stored on-chain.
     *      Keep v1 askQuestionERC20(...) for backward comp; internally call this with defaults if needed.
     */
    function askQuestionERC20Full(
        address bondToken,
        uint32 templateId,
        string calldata content,          // full text
        string memory outcomesPacked,     // "" for non-multi; pack with SEP
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce,
        string memory language,
        string memory category,
        string memory metadataURI
    ) public returns (bytes32 questionId)
    {
        require(timeout > 24, "Timeout too short");
        require(openingTs >= block.timestamp || openingTs == 0, "Opening time in past");
        require(bondToken != address(0), "Invalid bond token");

        // Reuse v1 behavior to compute questionId/contentHash for compatibility
        bytes32 contentHash = RealityLib.calculateContentHash(templateId, content);
        questionId = RealityLib.calculateQuestionId(templateId, content, arbitrator, timeout, openingTs, nonce, msg.sender);

        require(questions[questionId].timeout == 0, "Question already exists");

        // Store in v1 structure for compatibility
        Question storage q = questions[questionId];
        q.arbitrator = arbitrator;
        q.bondToken = bondToken;
        q.timeout = timeout;
        q.openingTs = openingTs;
        q.contentHash = contentHash;

        // Store on-chain metadata
        _headers[questionId] = QuestionHeader({
            asker: msg.sender,
            arbitrator: arbitrator,
            bondToken: bondToken,
            templateId: templateId,
            timeout: timeout,
            openingTs: openingTs,
            contentHash: contentHash,
            createdAt: uint64(block.timestamp)
        });

        _details[questionId] = QuestionDetails({
            content: content,
            outcomesPacked: outcomesPacked,
            language: language,
            category: category,
            metadataURI: metadataURI
        });

        // Emit v1 event for compatibility
        emit LogNewQuestion(
            questionId,
            msg.sender,
            templateId,
            content,
            contentHash,
            arbitrator,
            timeout,
            openingTs,
            nonce,
            block.timestamp
        );

        emit QuestionStored(questionId);
    }

    // Backward-compatible wrapper if needed:
    function askQuestionERC20Compat(
        address bondToken,
        uint32 templateId,
        string calldata content,   // treat as full text now
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce
    ) public returns (bytes32 questionId) {
        return askQuestionERC20Full(
            bondToken, templateId, content, "", arbitrator, timeout, openingTs, nonce, "en", "", ""
        );
    }

    // --- Views for FE/Subgraph ---
    function getQuestionHeader(bytes32 qid)
        external view
        returns (
            address asker,
            address arbitrator,
            address bondToken,
            uint32 templateId,
            uint32 timeout,
            uint32 openingTs,
            bytes32 contentHash,
            uint64 createdAt
        )
    {
        QuestionHeader memory h = _headers[qid];
        return (
            h.asker, h.arbitrator, h.bondToken, h.templateId,
            h.timeout, h.openingTs, h.contentHash, h.createdAt
        );
    }

    function getQuestionDetails(bytes32 qid)
        external view
        returns (string memory content, string memory outcomesPacked, string memory language, string memory category, string memory metadataURI)
    {
        QuestionDetails memory d = _details[qid];
        return (d.content, d.outcomesPacked, d.language, d.category, d.metadataURI);
    }

    // Optional helper for The Graph (tuple return)
    function getQuestionFull(bytes32 qid)
        external view
        returns (
            address asker,
            address arbitrator,
            address bondToken,
            uint32 templateId,
            uint32 timeout,
            uint32 openingTs,
            bytes32 contentHash,
            uint64 createdAt,
            string memory content,
            string memory outcomesPacked,
            string memory language,
            string memory category,
            string memory metadataURI
        )
    {
        QuestionHeader memory h = _headers[qid];
        QuestionDetails memory d = _details[qid];
        return (
            h.asker, h.arbitrator, h.bondToken, h.templateId, h.timeout, h.openingTs, h.contentHash, h.createdAt,
            d.content, d.outcomesPacked, d.language, d.category, d.metadataURI
        );
    }

}