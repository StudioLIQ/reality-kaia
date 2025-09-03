// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IReality.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RealityLib} from "./RealityLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RealitioERC20 is IReality, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using RealityLib for *;

    struct Question {
        address arbitrator;
        address bondToken;
        uint32 timeout;
        uint32 openingTs;
        bytes32 contentHash;
        bytes32 bestAnswer;
        uint256 bestBond;
        address bestAnswerer;
        uint64 lastAnswerTs;
        bool finalized;
        bool arbitrationPending;
        mapping(address => uint256) claimableRewards;
    }

    struct Commitment {
        bytes32 answerHash;
        uint256 bond;
        uint64 commitTs;
        bool revealed;
    }

    mapping(bytes32 => Question) public questions;
    mapping(bytes32 => mapping(address => Commitment)) public commitments;
    mapping(bytes32 => uint256) public totalClaimable;
    mapping(bytes32 => address[]) public answerers;
    mapping(bytes32 => mapping(address => bytes32)) public answersByAnswerer;
    mapping(bytes32 => mapping(address => uint256)) public bondsByAnswerer;

    modifier questionExists(bytes32 questionId) {
        require(questions[questionId].timeout > 0, "Question does not exist");
        _;
    }

    modifier notFinalized(bytes32 questionId) {
        require(!questions[questionId].finalized, "Question already finalized");
        _;
    }

    modifier isFinalized(bytes32 questionId) {
        require(questions[questionId].finalized, "Question not finalized");
        _;
    }

    function askQuestion(
        uint32 templateId,
        string calldata question,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce
    ) external override returns (bytes32 questionId) {
        require(timeout > 24, "Timeout too short");
        require(openingTs >= block.timestamp || openingTs == 0, "Opening time in past");
        
        questionId = RealityLib.calculateQuestionId(
            templateId,
            question,
            arbitrator,
            timeout,
            openingTs,
            nonce,
            msg.sender
        );
        
        require(questions[questionId].timeout == 0, "Question already exists");
        
        Question storage q = questions[questionId];
        q.arbitrator = arbitrator;
        q.bondToken = address(0);
        q.timeout = timeout;
        q.openingTs = openingTs;
        q.contentHash = RealityLib.calculateContentHash(templateId, question);
        
        emit LogNewQuestion(
            questionId,
            msg.sender,
            templateId,
            question,
            q.contentHash,
            arbitrator,
            timeout,
            openingTs,
            nonce,
            block.timestamp
        );
        
        return questionId;
    }

    function submitAnswer(
        bytes32 questionId,
        bytes32 answer,
        uint256 bond
    ) external override nonReentrant questionExists(questionId) notFinalized(questionId) {
        _submitAnswerInternal(questionId, answer, bond);
    }

    function submitAnswerWithToken(
        bytes32 questionId,
        bytes32 answer,
        uint256 bond,
        address bondToken
    ) external nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        
        if (q.bondToken == address(0)) {
            q.bondToken = bondToken;
        } else {
            require(q.bondToken == bondToken, "Wrong bond token");
        }
        
        _submitAnswerInternal(questionId, answer, bond);
    }
    
    function _submitAnswerInternal(
        bytes32 questionId,
        bytes32 answer,
        uint256 bond
    ) internal {
        Question storage q = questions[questionId];
        
        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");
        
        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");
        
        if (q.bondToken == address(0) && bond > 0) {
            revert("Bond token not set for this question");
        }
        
        if (bond > 0) {
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);
        }
        
        if (q.bestAnswerer != address(0) && q.bestAnswer != answer) {
            totalClaimable[questionId] += q.bestBond;
        }
        
        if (bondsByAnswerer[questionId][msg.sender] == 0) {
            answerers[questionId].push(msg.sender);
        }
        
        answersByAnswerer[questionId][msg.sender] = answer;
        bondsByAnswerer[questionId][msg.sender] = bond;
        
        q.bestAnswer = answer;
        q.bestBond = bond;
        q.bestAnswerer = msg.sender;
        q.lastAnswerTs = uint64(block.timestamp);
        
        emit LogNewAnswer(questionId, answer, msg.sender, bond, block.timestamp);
    }

    function submitAnswerCommitment(
        bytes32 questionId,
        bytes32 answerHash,
        uint256 bond
    ) external override nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        
        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");
        
        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");
        
        Commitment storage c = commitments[questionId][msg.sender];
        require(c.answerHash == bytes32(0), "Already committed");
        
        if (q.bondToken != address(0) && bond > 0) {
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);
        }
        
        c.answerHash = answerHash;
        c.bond = bond;
        c.commitTs = uint64(block.timestamp);
        
        emit LogNewCommitment(questionId, answerHash, msg.sender, bond, block.timestamp);
    }

    function revealAnswer(
        bytes32 questionId,
        bytes32 answer,
        bytes32 nonce
    ) external override nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        Commitment storage c = commitments[questionId][msg.sender];
        
        require(c.answerHash != bytes32(0), "No commitment");
        require(!c.revealed, "Already revealed");
        require(!q.arbitrationPending, "Arbitration pending");
        
        bytes32 calculatedHash = RealityLib.calculateAnswerHash(answer, nonce);
        require(calculatedHash == c.answerHash, "Invalid reveal");
        
        require(
            RealityLib.isInRevealWindow(q.openingTs, q.timeout, c.commitTs),
            "Outside reveal window"
        );
        
        c.revealed = true;
        
        if (q.bestAnswerer != address(0) && q.bestAnswer != answer) {
            totalClaimable[questionId] += q.bestBond;
        }
        
        if (bondsByAnswerer[questionId][msg.sender] == 0) {
            answerers[questionId].push(msg.sender);
        }
        
        answersByAnswerer[questionId][msg.sender] = answer;
        bondsByAnswerer[questionId][msg.sender] = c.bond;
        
        q.bestAnswer = answer;
        q.bestBond = c.bond;
        q.bestAnswerer = msg.sender;
        q.lastAnswerTs = uint64(block.timestamp);
        
        emit LogReveal(questionId, msg.sender, answer, c.answerHash, c.bond);
        emit LogNewAnswer(questionId, answer, msg.sender, c.bond, block.timestamp);
    }

    function finalize(bytes32 questionId) external override nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        
        require(q.bestAnswerer != address(0), "No answers submitted");
        require(
            RealityLib.isFinalizationReady(q.lastAnswerTs, q.timeout),
            "Timeout not reached"
        );
        
        q.finalized = true;
        
        if (q.bestAnswer != RealityLib.INVALID_ANSWER) {
            q.claimableRewards[q.bestAnswerer] = totalClaimable[questionId] + q.bestBond;
        }
        
        emit LogFinalize(questionId, q.bestAnswer);
    }

    function resultFor(bytes32 questionId) external view override returns (bytes32) {
        Question storage q = questions[questionId];
        require(q.finalized, "Not finalized");
        return q.bestAnswer;
    }

    function getFinalAnswerIfMatches(
        bytes32 questionId,
        bytes32 contentHash,
        address arbitrator,
        uint32 minTimeout,
        uint256 minBond
    ) external view override returns (bytes32) {
        Question storage q = questions[questionId];
        
        require(q.finalized, "Not finalized");
        require(q.contentHash == contentHash, "Content hash mismatch");
        require(q.arbitrator == arbitrator, "Arbitrator mismatch");
        require(q.timeout >= minTimeout, "Timeout too short");
        require(q.bestBond >= minBond, "Bond too low");
        
        return q.bestAnswer;
    }

    function claimWinnings(bytes32 questionId) external override nonReentrant isFinalized(questionId) {
        Question storage q = questions[questionId];
        uint256 amount = q.claimableRewards[msg.sender];
        
        require(amount > 0, "Nothing to claim");
        
        q.claimableRewards[msg.sender] = 0;
        
        if (q.bondToken != address(0)) {
            IERC20(q.bondToken).safeTransfer(msg.sender, amount);
        }
        
        emit LogClaim(questionId, msg.sender, amount);
    }

    function requestArbitration(bytes32 questionId) external payable override questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        
        require(q.arbitrator != address(0), "No arbitrator set");
        require(!q.arbitrationPending, "Already requested");
        
        q.arbitrationPending = true;
        
        (bool success, ) = q.arbitrator.call{value: msg.value}(
            abi.encodeWithSignature("requestArbitration(bytes32)", questionId)
        );
        require(success, "Arbitration request failed");
        
        emit LogArbitrationRequested(questionId, msg.sender);
    }

    function submitAnswerByArbitrator(
        bytes32 questionId,
        bytes32 answer
    ) external questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];
        
        require(msg.sender == q.arbitrator, "Not arbitrator");
        require(q.arbitrationPending, "Arbitration not requested");
        
        q.bestAnswer = answer;
        q.bestAnswerer = msg.sender;
        q.finalized = true;
        
        emit LogArbitratorAnswered(questionId, answer, msg.sender);
        emit LogFinalize(questionId, answer);
    }

    function getQuestion(bytes32 questionId) external view returns (
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
    ) {
        Question storage q = questions[questionId];
        return (
            q.arbitrator,
            q.bondToken,
            q.timeout,
            q.openingTs,
            q.contentHash,
            q.bestAnswer,
            q.bestBond,
            q.bestAnswerer,
            q.lastAnswerTs,
            q.finalized
        );
    }
}