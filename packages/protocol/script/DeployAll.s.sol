// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {RealitioERC20V3} from "../src/oracles/Reality/RealitioERC20V3.sol";
import {ArbitratorSimple} from "../src/ArbitratorSimple.sol";
import {MockUSDT} from "../src/tokens/MockUSDT.sol";
import {ZapperWKAIA} from "../src/zapper/ZapperWKAIA.sol";
import {DeployPermit2} from "./DeployPermit2.s.sol";
import {stdJson} from "forge-std/StdJson.sol";

contract DeployAll is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying from:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // Read fee params from environment with defaults for CI
        address feeRecipient = vm.envOr("FEE_RECIPIENT", address(0x7abEdc832254DaA2032505e33A8Dd325841D6f2D));
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(25)));

        // Read token addresses from environment with fallback defaults
        address usdtMainnet = vm.envOr("USDT_MAINNET", 0xd077A400968890Eacc75cdc901F0356c943e4fDb);
        address wkaiaMainnet = vm.envOr("WKAIA_MAINNET", 0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432);
        address wkaiaTestnet = vm.envOr("WKAIA_TESTNET", 0x043c471bEe060e00A56CcD02c0Ca286808a5A436);

        // Determine WKAIA address based on chain
        address wkaia = block.chainid == 8217 ? wkaiaMainnet : wkaiaTestnet;

        // Determine Permit2 address - same address on both Kaia networks
        address permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
        console2.log("Using Permit2:", permit2);

        // Deploy MockUSDT only on testnet
        address mockUSDT = address(0);
        if (block.chainid == 1001) {
            MockUSDT tUSDT = new MockUSDT();
            mockUSDT = address(tUSDT);
            console2.log("MockUSDT (tUSDT) deployed at:", mockUSDT);
        }

        // Deploy RealitioERC20V3 with fee configuration and Permit2
        RealitioERC20V3 realitio = new RealitioERC20V3(feeRecipient, feeBps, permit2);
        console2.log("RealitioERC20V3 deployed at:", address(realitio));
        console2.log("  Fee recipient:", feeRecipient);
        console2.log("  Fee BPS:", feeBps);
        console2.log("  Permit2:", permit2);

        // Deploy ArbitratorSimple with 1-of-1 multisig (deployer as sole signer)
        address[] memory signers = new address[](1);
        signers[0] = deployer;
        uint256 threshold = 1;

        ArbitratorSimple arbitrator = new ArbitratorSimple(signers, threshold);
        console2.log("ArbitratorSimple deployed at:", address(arbitrator));

        // Deploy ZapperWKAIA
        ZapperWKAIA zapper = new ZapperWKAIA(wkaia, address(realitio), permit2);
        console2.log("ZapperWKAIA deployed at:", address(zapper));

        // Set zapper as allowed in RealitioERC20
        realitio.setZapper(address(zapper), true);
        console2.log("ZapperWKAIA set as allowed zapper");

        vm.stopBroadcast();

        // Log deployment info for script to parse
        console2.log("===DEPLOYMENT_INFO===");
        console2.log("REALITIO:", address(realitio));
        console2.log("ARBITRATOR:", address(arbitrator));
        console2.log("ZAPPER:", address(zapper));
        console2.log("FEE_RECIPIENT:", feeRecipient);
        console2.log("FEE_BPS:", feeBps);
        console2.log("WKAIA:", wkaia);
        console2.log("PERMIT2:", permit2);
        if (block.chainid == 1001 && mockUSDT != address(0)) {
            console2.log("MOCK_USDT:", mockUSDT);
        }
        console2.log("===END_DEPLOYMENT_INFO===");
    }
}
