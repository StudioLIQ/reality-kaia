// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/insurance/FlightDelayProduct.sol";

contract DeployProduct is Script {
    function run(
        address usdt,
        address orakore,
        address vault,
        address arbitrator,
        address permit2
    ) external {
        vm.startBroadcast();
        
        FlightDelayProduct product = new FlightDelayProduct(
            usdt,
            orakore,
            vault,
            arbitrator,
            permit2
        );
        
        console.log("FLIGHT_PRODUCT:", address(product));
        
        vm.stopBroadcast();
    }
}