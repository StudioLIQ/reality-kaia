// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {RealitioERC20} from "../src/oracles/Reality/RealitioERC20.sol";
import {ArbitratorSimple} from "../src/oracles/Reality/ArbitratorSimple.sol";
import {stdJson} from "forge-std/StdJson.sol";

contract DeployAll is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying from:", deployer);
        console2.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy RealitioERC20
        RealitioERC20 realitio = new RealitioERC20();
        console2.log("RealitioERC20 deployed at:", address(realitio));
        
        // Deploy ArbitratorSimple with 1-of-1 multisig (deployer as sole signer)
        address[] memory signers = new address[](1);
        signers[0] = deployer;
        uint256 threshold = 1;
        
        ArbitratorSimple arbitrator = new ArbitratorSimple(signers, threshold);
        console2.log("ArbitratorSimple deployed at:", address(arbitrator));
        
        vm.stopBroadcast();
        
        // Save deployment addresses
        string memory deploymentJson = "deploymentJson";
        vm.serializeAddress(deploymentJson, "realitioERC20", address(realitio));
        string memory finalJson = vm.serializeAddress(deploymentJson, "arbitratorSimple", address(arbitrator));
        
        string memory chainId = vm.toString(block.chainid);
        string memory path = string.concat("../../deployments/", chainId, ".json");
        
        vm.writeJson(finalJson, path);
        console2.log("Deployment addresses saved to:", path);
    }
}