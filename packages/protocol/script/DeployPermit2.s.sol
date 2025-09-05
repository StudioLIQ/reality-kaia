// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";

// Simplified Permit2 for deployment
contract Permit2 {
    mapping(address => mapping(address => mapping(address => uint256))) public allowance;

    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external {
        // Simplified implementation for testnet
        // In production, use the official Uniswap Permit2 deployment
    }
}

contract DeployPermit2 is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Permit2 permit2 = new Permit2();
        console2.log("Permit2 deployed at:", address(permit2));

        vm.stopBroadcast();

        return address(permit2);
    }
}
