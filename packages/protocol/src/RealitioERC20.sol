// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IReality.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {RealityLib} from "./RealityLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RealitioERC20 is IReality, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using RealityLib for *;

    // Fee configuration
    uint16 public immutable feeBps;
    address public immutable feeRecipient;
    address public immutable PERMIT2;

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

    // Zapper allowlist
    mapping(address => bool) public isZapper;

    // Events for fees
    event LogFeeCharged(
        bytes32 indexed questionId, address indexed payer, address bondToken, uint256 bond, uint256 fee
    );
    event ZapperSet(address indexed zapper, bool allowed);

    constructor(address _feeRecipient, uint16 _feeBps, address _permit2) Ownable(msg.sender) {
        require(_feeBps <= 1000, "Fee too high (max 10%)");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
        PERMIT2 = _permit2;
    }

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

    /**
     * @dev Calculate fee on a bond amount
     * @param amount The bond amount
     * @return fee The fee amount
     * @return total The total amount (bond + fee)
     */
    function feeOn(uint256 amount) public view returns (uint256 fee, uint256 total) {
        fee = (amount * feeBps) / 10000;
        total = amount + fee;
    }

    /**
     * @dev Get fee configuration
     * @return _feeBps The fee in basis points
     * @return _feeRecipient The fee recipient address
     */
    function feeInfo() external view returns (uint16 _feeBps, address _feeRecipient) {
        return (feeBps, feeRecipient);
    }

    /**
     * @dev Get bond token for a question
     * @param questionId The question ID
     * @return The bond token address
     */
    function bondTokenOf(bytes32 questionId) external view returns (address) {
        return questions[questionId].bondToken;
    }

    /**
     * @dev Get Permit2 contract address
     * @return The Permit2 contract address
     */
    function permit2() external view returns (address) {
        return PERMIT2;
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

        questionId =
            RealityLib.calculateQuestionId(templateId, question, arbitrator, timeout, openingTs, nonce, msg.sender);

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

    /**
     * @dev Ask a question with an ERC20 bond token specified
     */
    function askQuestionERC20(
        address bondToken,
        uint32 templateId,
        string calldata question,
        address arbitrator,
        uint32 timeout,
        uint32 openingTs,
        bytes32 nonce
    ) external returns (bytes32 questionId) {
        require(timeout > 24, "Timeout too short");
        require(openingTs >= block.timestamp || openingTs == 0, "Opening time in past");
        require(bondToken != address(0), "Invalid bond token");

        questionId =
            RealityLib.calculateQuestionId(templateId, question, arbitrator, timeout, openingTs, nonce, msg.sender);

        require(questions[questionId].timeout == 0, "Question already exists");

        Question storage q = questions[questionId];
        q.arbitrator = arbitrator;
        q.bondToken = bondToken;
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

    function submitAnswer(bytes32 questionId, bytes32 answer, uint256 bond)
        external
        override
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        _submitAnswerInternal(questionId, answer, bond);
    }

    function submitAnswerWithToken(bytes32 questionId, bytes32 answer, uint256 bond, address bondToken)
        external
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];

        if (q.bondToken == address(0)) {
            q.bondToken = bondToken;
        } else {
            require(q.bondToken == bondToken, "Wrong bond token");
        }

        _submitAnswerInternal(questionId, answer, bond);
    }

    function _submitAnswerInternal(bytes32 questionId, bytes32 answer, uint256 bond) internal {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        if (q.bondToken == address(0) && bond > 0) {
            revert("Bond token not set for this question");
        }

        if (bond > 0) {
            // Transfer bond to contract
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);

            // Calculate and transfer fee to fee recipient
            (uint256 fee,) = feeOn(bond);
            if (fee > 0) {
                IERC20(q.bondToken).safeTransferFrom(msg.sender, feeRecipient, fee);
                emit LogFeeCharged(questionId, msg.sender, q.bondToken, bond, fee);
            }
        }

        _processAnswerSubmission(questionId, q, answer, bond, msg.sender);
    }

    function submitAnswerCommitment(bytes32 questionId, bytes32 answerHash, uint256 bond)
        external
        override
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        Commitment storage c = commitments[questionId][msg.sender];
        require(c.answerHash == bytes32(0), "Already committed");

        if (q.bondToken != address(0) && bond > 0) {
            // Transfer bond to contract
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);

            // Calculate and transfer fee to fee recipient
            (uint256 fee,) = feeOn(bond);
            if (fee > 0) {
                IERC20(q.bondToken).safeTransferFrom(msg.sender, feeRecipient, fee);
                emit LogFeeCharged(questionId, msg.sender, q.bondToken, bond, fee);
            }
        }

        c.answerHash = answerHash;
        c.bond = bond;
        c.commitTs = uint64(block.timestamp);

        emit LogNewCommitment(questionId, answerHash, msg.sender, bond, block.timestamp);
    }

    /**
     * @dev Submit answer with Permit2 signature (single transaction)
     */
    function submitAnswerWithPermit2(
        bytes32 questionId,
        bytes32 answer,
        uint256 bond,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature,
        address owner
    ) external nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        if (q.bondToken == address(0)) {
            revert("Bond token not set");
        }

        // Calculate fee
        (uint256 fee, uint256 total) = feeOn(bond);

        // Verify permit matches our requirements
        require(permit.permitted.token == q.bondToken, "TOKEN_MISMATCH");
        require(permit.permitted.amount >= total, "PERMIT_INSUFF_TOTAL");

        // Transfer total amount (bond + fee) from owner to this contract via Permit2
        IPermit2(PERMIT2).permitTransferFrom(
            permit, IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: total}), owner, signature
        );

        // Transfer fee to fee recipient
        if (fee > 0) {
            IERC20(q.bondToken).safeTransfer(feeRecipient, fee);
            emit LogFeeCharged(questionId, owner, q.bondToken, bond, fee);
        }

        // Process the answer submission (reuse internal logic)
        _processAnswerSubmission(questionId, q, answer, bond, owner);
    }

    /**
     * @dev Submit answer commitment with Permit2 signature
     */
    function submitAnswerCommitmentWithPermit2(
        bytes32 questionId,
        bytes32 answerHash,
        uint256 bond,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature,
        address owner
    ) external nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        Commitment storage c = commitments[questionId][owner];
        require(c.answerHash == bytes32(0), "Already committed");

        if (q.bondToken == address(0)) {
            revert("Bond token not set");
        }

        // Calculate fee
        (uint256 fee, uint256 total) = feeOn(bond);

        // Verify permit matches our requirements
        require(permit.permitted.token == q.bondToken, "TOKEN_MISMATCH");
        require(permit.permitted.amount >= total, "PERMIT_INSUFF_TOTAL");

        // Transfer total amount via Permit2
        IPermit2(PERMIT2).permitTransferFrom(
            permit, IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: total}), owner, signature
        );

        // Transfer fee to fee recipient
        if (fee > 0) {
            IERC20(q.bondToken).safeTransfer(feeRecipient, fee);
            emit LogFeeCharged(questionId, owner, q.bondToken, bond, fee);
        }

        // Store commitment
        c.answerHash = answerHash;
        c.bond = bond;
        c.commitTs = uint64(block.timestamp);

        emit LogNewCommitment(questionId, answerHash, owner, bond, block.timestamp);
    }

    /**
     * @dev Submit answer with EIP-2612 permit (single transaction)
     */
    function submitAnswerWithPermit2612(
        bytes32 questionId,
        bytes32 answer,
        uint256 bond,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address owner
    ) external nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        if (q.bondToken == address(0)) {
            revert("Bond token not set");
        }

        // Calculate fee
        (uint256 fee, uint256 total) = feeOn(bond);

        // Call permit on the token
        IERC20Permit(q.bondToken).permit(owner, address(this), total, deadline, v, r, s);

        // Transfer bond + fee from owner
        IERC20(q.bondToken).safeTransferFrom(owner, address(this), bond);
        if (fee > 0) {
            IERC20(q.bondToken).safeTransferFrom(owner, feeRecipient, fee);
            emit LogFeeCharged(questionId, owner, q.bondToken, bond, fee);
        }

        // Process the answer submission
        _processAnswerSubmission(questionId, q, answer, bond, owner);
    }

    /**
     * @dev Submit answer commitment with EIP-2612 permit
     */
    function submitAnswerCommitmentWithPermit2612(
        bytes32 questionId,
        bytes32 answerHash,
        uint256 bond,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address owner
    ) external nonReentrant questionExists(questionId) notFinalized(questionId) {
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        Commitment storage c = commitments[questionId][owner];
        require(c.answerHash == bytes32(0), "Already committed");

        if (q.bondToken == address(0)) {
            revert("Bond token not set");
        }

        // Calculate fee
        (uint256 fee, uint256 total) = feeOn(bond);

        // Call permit on the token
        IERC20Permit(q.bondToken).permit(owner, address(this), total, deadline, v, r, s);

        // Transfer bond + fee from owner
        IERC20(q.bondToken).safeTransferFrom(owner, address(this), bond);
        if (fee > 0) {
            IERC20(q.bondToken).safeTransferFrom(owner, feeRecipient, fee);
            emit LogFeeCharged(questionId, owner, q.bondToken, bond, fee);
        }

        // Store commitment
        c.answerHash = answerHash;
        c.bond = bond;
        c.commitTs = uint64(block.timestamp);

        emit LogNewCommitment(questionId, answerHash, owner, bond, block.timestamp);
    }

    /**
     * @dev Internal helper to process answer submission logic
     */
    function _processAnswerSubmission(
        bytes32 questionId,
        Question storage q,
        bytes32 answer,
        uint256 bond,
        address answerer
    ) internal {
        if (q.bestAnswerer != address(0) && q.bestAnswer != answer) {
            totalClaimable[questionId] += q.bestBond;
        }

        if (bondsByAnswerer[questionId][answerer] == 0) {
            answerers[questionId].push(answerer);
        }

        answersByAnswerer[questionId][answerer] = answer;
        bondsByAnswerer[questionId][answerer] = bond;

        q.bestAnswer = answer;
        q.bestBond = bond;
        q.bestAnswerer = answerer;
        q.lastAnswerTs = uint64(block.timestamp);

        emit LogNewAnswer(questionId, answer, answerer, bond, block.timestamp);
    }

    function revealAnswer(bytes32 questionId, bytes32 answer, bytes32 nonce)
        external
        override
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];
        Commitment storage c = commitments[questionId][msg.sender];

        require(c.answerHash != bytes32(0), "No commitment");
        require(!c.revealed, "Already revealed");
        require(!q.arbitrationPending, "Arbitration pending");

        bytes32 calculatedHash = RealityLib.calculateAnswerHash(answer, nonce);
        require(calculatedHash == c.answerHash, "Invalid reveal");

        require(RealityLib.isInRevealWindow(q.openingTs, q.timeout, c.commitTs), "Outside reveal window");

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

    function finalize(bytes32 questionId)
        external
        override
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];

        require(q.bestAnswerer != address(0), "No answers submitted");
        require(RealityLib.isFinalizationReady(q.lastAnswerTs, q.timeout), "Timeout not reached");

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

    function requestArbitration(bytes32 questionId)
        external
        payable
        override
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];

        require(q.arbitrator != address(0), "No arbitrator set");
        require(!q.arbitrationPending, "Already requested");

        q.arbitrationPending = true;

        (bool success,) =
            q.arbitrator.call{value: msg.value}(abi.encodeWithSignature("requestArbitration(bytes32)", questionId));
        require(success, "Arbitration request failed");

        emit LogArbitrationRequested(questionId, msg.sender);
    }

    function submitAnswerByArbitrator(bytes32 questionId, bytes32 answer)
        external
        questionExists(questionId)
        notFinalized(questionId)
    {
        Question storage q = questions[questionId];

        require(msg.sender == q.arbitrator, "Not arbitrator");
        require(q.arbitrationPending, "Arbitration not requested");

        q.bestAnswer = answer;
        q.bestAnswerer = msg.sender;
        q.finalized = true;

        emit LogArbitratorAnswered(questionId, answer, msg.sender);
        emit LogFinalize(questionId, answer);
    }

    function getQuestion(bytes32 questionId)
        external
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

    /**
     * @dev Set or unset a zapper address
     * @param zapper The zapper address to set
     * @param allowed Whether the zapper is allowed
     */
    function setZapper(address zapper, bool allowed) external onlyOwner {
        isZapper[zapper] = allowed;
        emit ZapperSet(zapper, allowed);
    }

    /**
     * @dev Submit answer from a zapper on behalf of a user
     * @param questionId The question ID
     * @param answer The answer to submit
     * @param bond The bond amount
     * @param answerer The user who is the actual answerer
     */
    function submitAnswerFromZapper(bytes32 questionId, bytes32 answer, uint256 bond, address answerer)
        external
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        require(isZapper[msg.sender], "NOT_ZAPPER");
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        (uint256 fee,) = feeOn(bond);

        // Pull funds from zapper (msg.sender)
        if (q.bondToken != address(0)) {
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);
            if (fee > 0) {
                IERC20(q.bondToken).safeTransferFrom(msg.sender, feeRecipient, fee);
                emit LogFeeCharged(questionId, answerer, q.bondToken, bond, fee);
            }
        }

        _processAnswerSubmission(questionId, q, answer, bond, answerer);
    }

    /**
     * @dev Submit answer commitment from a zapper on behalf of a user
     * @param questionId The question ID
     * @param commitment The commitment hash
     * @param bond The bond amount
     * @param committer The user who is the actual committer
     */
    function submitAnswerCommitmentFromZapper(bytes32 questionId, bytes32 commitment, uint256 bond, address committer)
        external
        nonReentrant
        questionExists(questionId)
        notFinalized(questionId)
    {
        require(isZapper[msg.sender], "NOT_ZAPPER");
        Question storage q = questions[questionId];

        require(block.timestamp >= q.openingTs, "Question not yet open");
        require(!q.arbitrationPending, "Arbitration pending");

        uint256 minBond = RealityLib.calculateMinBond(q.bestBond);
        require(bond >= minBond, "Bond too low");

        (uint256 fee,) = feeOn(bond);

        // Pull funds from zapper (msg.sender)
        if (q.bondToken != address(0)) {
            IERC20(q.bondToken).safeTransferFrom(msg.sender, address(this), bond);
            if (fee > 0) {
                IERC20(q.bondToken).safeTransferFrom(msg.sender, feeRecipient, fee);
                emit LogFeeCharged(questionId, committer, q.bondToken, bond, fee);
            }
        }

        Commitment storage c = commitments[questionId][committer];
        c.answerHash = commitment;
        c.bond = bond;
        c.commitTs = uint64(block.timestamp);

        emit LogNewCommitment(questionId, commitment, committer, bond, block.timestamp);
    }
}
