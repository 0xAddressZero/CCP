// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import { SPXP } from "src/SPXP.sol";

contract SPXPScript is Script {
    address constant BOT_WALLET = 0x690048BE7FF20B2c4a11f348a49A147541aD0718;
    uint constant ROOT_TG_USER_ID = 6685201394; // telegram user id of the user receiving all initial points
    
    function run() public {
        vm.startBroadcast();
        SPXP spxp = new SPXP(tx.origin, 6685201394);
        spxp.setTransferAllowed(BOT_WALLET, true);
        vm.stopBroadcast();
    }
}
