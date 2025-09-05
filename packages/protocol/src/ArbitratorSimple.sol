// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {RealitioERC20} from "./RealitioERC20.sol";

contract ArbitratorSimple {
    struct ArbitrationRequest {
        address requester;
        uint256 fee;
        bool pending;
        bytes32 answer;
        uint256 confirmations;
        mapping(address => bool) hasConfirmed;
    }

    address[] public signers;
    uint256 public threshold;
    uint256 public arbitrationFee;

    mapping(bytes32 => ArbitrationRequest) public requests;
    mapping(address => bool) public isSigner;

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 newThreshold);
    event ArbitrationRequested(bytes32 indexed questionId, address indexed requester);
    event ArbitrationConfirmed(bytes32 indexed questionId, address indexed signer, bytes32 answer);
    event ArbitrationExecuted(bytes32 indexed questionId, bytes32 answer);

    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "No signers");
        require(_threshold > 0 && _threshold <= _signers.length, "Invalid threshold");

        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer");
            require(!isSigner[_signers[i]], "Duplicate signer");

            signers.push(_signers[i]);
            isSigner[_signers[i]] = true;

            emit SignerAdded(_signers[i]);
        }

        threshold = _threshold;
        arbitrationFee = 100 ether;
    }

    function requestArbitration(bytes32 questionId) external payable {
        require(msg.value >= arbitrationFee, "Insufficient fee");
        require(!requests[questionId].pending, "Already pending");

        ArbitrationRequest storage request = requests[questionId];
        request.requester = msg.sender;
        request.fee = msg.value;
        request.pending = true;
        request.confirmations = 0;

        emit ArbitrationRequested(questionId, msg.sender);
    }

    function submitAnswerByArbitrator(bytes32 questionId, bytes32 answer, address realitioAddress)
        external
        onlySigner
    {
        ArbitrationRequest storage request = requests[questionId];
        require(request.pending, "No pending arbitration");
        require(!request.hasConfirmed[msg.sender], "Already confirmed");

        if (request.confirmations == 0) {
            request.answer = answer;
        } else {
            require(request.answer == answer, "Answer mismatch");
        }

        request.hasConfirmed[msg.sender] = true;
        request.confirmations++;

        emit ArbitrationConfirmed(questionId, msg.sender, answer);

        if (request.confirmations >= threshold) {
            request.pending = false;

            RealitioERC20(realitioAddress).submitAnswerByArbitrator(questionId, answer);

            if (request.fee > 0) {
                uint256 feePerSigner = request.fee / threshold;
                for (uint256 i = 0; i < signers.length; i++) {
                    if (request.hasConfirmed[signers[i]]) {
                        payable(signers[i]).transfer(feePerSigner);
                    }
                }
            }

            emit ArbitrationExecuted(questionId, answer);
        }
    }

    function addSigner(address signer) external onlySigner {
        require(signer != address(0), "Invalid signer");
        require(!isSigner[signer], "Already a signer");

        signers.push(signer);
        isSigner[signer] = true;

        emit SignerAdded(signer);
    }

    function removeSigner(address signer) external onlySigner {
        require(isSigner[signer], "Not a signer");
        require(signers.length > threshold, "Would break threshold");

        isSigner[signer] = false;

        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signer);
    }

    function updateThreshold(uint256 newThreshold) external onlySigner {
        require(newThreshold > 0 && newThreshold <= signers.length, "Invalid threshold");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getRequestInfo(bytes32 questionId)
        external
        view
        returns (address requester, uint256 fee, bool pending, bytes32 answer, uint256 confirmations)
    {
        ArbitrationRequest storage request = requests[questionId];
        return (request.requester, request.fee, request.pending, request.answer, request.confirmations);
    }
}
