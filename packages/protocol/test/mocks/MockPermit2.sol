// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../src/interfaces/IPermit2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPermit2 is IPermit2 {
    mapping(address => mapping(address => mapping(address => uint256))) public allowance;

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata /* signature */
    ) external override {
        // Simple mock implementation that just transfers tokens
        // In a real implementation, this would verify signatures
        IERC20 token = IERC20(permit.permitted.token);

        // Transfer from owner to the recipient
        require(token.transferFrom(owner, transferDetails.to, transferDetails.requestedAmount), "Transfer failed");
    }
}
