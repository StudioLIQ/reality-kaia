// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Vm} from "forge-std/Vm.sol";

library Time {
    address constant HEVM_ADDRESS = address(bytes20(uint160(uint256(keccak256("hevm cheat code")))));
    Vm constant vm = Vm(HEVM_ADDRESS);

    function skipTime(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
    }

    function setTime(uint256 timestamp) internal {
        vm.warp(timestamp);
    }

    function skipBlocks(uint256 blocks) internal {
        vm.roll(block.number + blocks);
    }
}
