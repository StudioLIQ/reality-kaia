// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2} from "../interfaces/IPermit2.sol";

interface IWKAIA is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

interface IRealityERC20 {
    function feeOn(uint256 amount) external view returns (uint256 fee, uint256 total);
    function bondTokenOf(bytes32 qid) external view returns (address);
    function submitAnswerFromZapper(bytes32 qid, bytes32 answer, uint256 bond, address answerer) external;
    function submitAnswerCommitmentFromZapper(bytes32 qid, bytes32 commitment, uint256 bond, address committer)
        external;
}

/**
 * @title ZapperWKAIA
 * @notice Allows users to pay for Reality.eth answers using a mix of WKAIA and native KAIA
 * @dev Accepts WKAIA first via Permit2, then wraps any KAIA remainder to WKAIA
 */
contract ZapperWKAIA is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IWKAIA public immutable WKAIA;
    IRealityERC20 public immutable REALITY;
    address public immutable PERMIT2;

    error BondTokenNotWKAIA();
    error InsufficientKAIA();
    error RefundFailed();

    constructor(address _wkaia, address _reality, address _permit2) {
        WKAIA = IWKAIA(_wkaia);
        REALITY = IRealityERC20(_reality);
        PERMIT2 = _permit2;
    }

    receive() external payable {}

    /**
     * @notice Submit an answer using mixed WKAIA (via Permit2) and KAIA payment
     * @param qid The question ID
     * @param answer The answer to submit
     * @param bond The bond amount (without fee)
     * @param permit Permit2 transfer details
     * @param signature Permit2 signature
     * @param owner The user who signs Permit2 and is recorded as answerer
     * @param wkaiaMaxFromPermit Max WKAIA to pull via Permit2 (0 to skip Permit2)
     */
    function answerMixedWithPermit2(
        bytes32 qid,
        bytes32 answer,
        uint256 bond,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature,
        address owner,
        uint256 wkaiaMaxFromPermit
    ) external payable nonReentrant {
        // Ensure the question uses WKAIA as bond token
        if (REALITY.bondTokenOf(qid) != address(WKAIA)) revert BondTokenNotWKAIA();

        // Calculate total needed (bond + fee)
        (, uint256 total) = REALITY.feeOn(bond);

        uint256 pulled = 0;

        // 1) Pull WKAIA from user via Permit2 (optional)
        if (wkaiaMaxFromPermit > 0) {
            uint256 want = wkaiaMaxFromPermit > total ? total : wkaiaMaxFromPermit;
            // Use requestedAmount = min(want, permit.permitted.amount)
            uint256 req = want <= permit.permitted.amount ? want : permit.permitted.amount;

            if (req > 0) {
                IPermit2(PERMIT2).permitTransferFrom(
                    permit,
                    IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: req}),
                    owner,
                    signature
                );
                pulled = req;
            }
        }

        // 2) Wrap KAIA for the shortfall
        uint256 need = total > pulled ? total - pulled : 0;
        if (need > 0) {
            if (msg.value < need) revert InsufficientKAIA();
            WKAIA.deposit{value: need}();

            // Refund any excess msg.value
            if (msg.value > need) {
                (bool ok,) = msg.sender.call{value: msg.value - need}("");
                if (!ok) revert RefundFailed();
            }
        } else if (msg.value > 0) {
            // No need for KAIA; refund everything
            (bool ok,) = msg.sender.call{value: msg.value}("");
            if (!ok) revert RefundFailed();
        }

        // 3) Approve Reality to pull (bond + fee) from this zapper
        IERC20(address(WKAIA)).forceApprove(address(REALITY), total);

        // 4) Call Reality with user as answerer
        REALITY.submitAnswerFromZapper(qid, answer, bond, owner);

        // 5) Clear approval (optional hardening)
        IERC20(address(WKAIA)).forceApprove(address(REALITY), 0);
    }

    /**
     * @notice Submit a commitment using mixed WKAIA (via Permit2) and KAIA payment
     * @param qid The question ID
     * @param commitment The commitment hash
     * @param bond The bond amount (without fee)
     * @param permit Permit2 transfer details
     * @param signature Permit2 signature
     * @param owner The user who signs Permit2 and is recorded as committer
     * @param wkaiaMaxFromPermit Max WKAIA to pull via Permit2 (0 to skip Permit2)
     */
    function commitMixedWithPermit2(
        bytes32 qid,
        bytes32 commitment,
        uint256 bond,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature,
        address owner,
        uint256 wkaiaMaxFromPermit
    ) external payable nonReentrant {
        // Ensure the question uses WKAIA as bond token
        if (REALITY.bondTokenOf(qid) != address(WKAIA)) revert BondTokenNotWKAIA();

        // Calculate total needed (bond + fee)
        (, uint256 total) = REALITY.feeOn(bond);

        uint256 pulled = 0;

        // 1) Pull WKAIA from user via Permit2 (optional)
        if (wkaiaMaxFromPermit > 0) {
            uint256 want = wkaiaMaxFromPermit > total ? total : wkaiaMaxFromPermit;
            // Use requestedAmount = min(want, permit.permitted.amount)
            uint256 req = want <= permit.permitted.amount ? want : permit.permitted.amount;

            if (req > 0) {
                IPermit2(PERMIT2).permitTransferFrom(
                    permit,
                    IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: req}),
                    owner,
                    signature
                );
                pulled = req;
            }
        }

        // 2) Wrap KAIA for the shortfall
        uint256 need = total > pulled ? total - pulled : 0;
        if (need > 0) {
            if (msg.value < need) revert InsufficientKAIA();
            WKAIA.deposit{value: need}();

            // Refund any excess msg.value
            if (msg.value > need) {
                (bool ok,) = msg.sender.call{value: msg.value - need}("");
                if (!ok) revert RefundFailed();
            }
        } else if (msg.value > 0) {
            // No need for KAIA; refund everything
            (bool ok,) = msg.sender.call{value: msg.value}("");
            if (!ok) revert RefundFailed();
        }

        // 3) Approve Reality to pull (bond + fee) from this zapper
        IERC20(address(WKAIA)).forceApprove(address(REALITY), total);

        // 4) Call Reality with user as committer
        REALITY.submitAnswerCommitmentFromZapper(qid, commitment, bond, owner);

        // 5) Clear approval (optional hardening)
        IERC20(address(WKAIA)).forceApprove(address(REALITY), 0);
    }
}
