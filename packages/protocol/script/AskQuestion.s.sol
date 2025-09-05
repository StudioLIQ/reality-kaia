// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {RealitioERC20} from "../src/RealitioERC20.sol";
import {RealityLib} from "../src/RealityLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {stdJson} from "forge-std/StdJson.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AskQuestion is Script {
    using stdJson for string;
    using RealityLib for *;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Load deployment addresses
        string memory chainId = vm.toString(block.chainid);
        string memory path = string.concat("../../deployments/", chainId, ".json");
        string memory json = vm.readFile(path);

        address realitioAddress = json.readAddress(".realitioERC20");
        address arbitratorAddress = json.readAddress(".arbitratorSimple");

        console2.log("Using RealitioERC20 at:", realitioAddress);
        console2.log("Using ArbitratorSimple at:", arbitratorAddress);

        // Get or deploy bond token
        address bondTokenAddress;
        try vm.envAddress("BOND_TOKEN_ADDRESS") returns (address addr) {
            bondTokenAddress = addr;
            console2.log("Using existing bond token at:", bondTokenAddress);
        } catch {
            console2.log("Deploying mock ERC20 token for testing...");
            vm.startBroadcast(deployerPrivateKey);
            MockERC20 mockToken = new MockERC20();
            bondTokenAddress = address(mockToken);
            vm.stopBroadcast();
            console2.log("Mock token deployed at:", bondTokenAddress);
        }

        vm.startBroadcast(deployerPrivateKey);

        RealitioERC20 realitio = RealitioERC20(realitioAddress);

        // Create example question
        uint32 templateId = 0;
        string memory question = "Will ETH price be above $3000 on 2025-01-01?";
        uint32 timeout = 86400; // 24 hours
        uint32 openingTs = uint32(block.timestamp); // Open immediately
        bytes32 nonce = keccak256(abi.encodePacked(block.timestamp, deployer));

        bytes32 questionId = realitio.askQuestion(templateId, question, arbitratorAddress, timeout, openingTs, nonce);

        console2.log("Question created!");
        console2.log("Question ID:", vm.toString(questionId));
        console2.log("Content Hash:", vm.toString(RealityLib.calculateContentHash(templateId, question)));
        console2.log("Timeout:", timeout);
        console2.log("Opening timestamp:", openingTs);
        console2.log("Bond token:", bondTokenAddress);

        vm.stopBroadcast();
    }
}
