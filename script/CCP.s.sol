// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import { CCP } from "src/CCP.sol";

contract CCPScript is Script {
    address constant BOT_WALLET = 0x690048BE7FF20B2c4a11f348a49A147541aD0718;
    uint constant ROOT_TG_USER_ID = 6685201394; // telegram user id of the user receiving all initial points
    
    function run() public {
        vm.startBroadcast();
        CCP ccp = new CCP(tx.origin, 6685201394);
        ccp.setHandlerEnabled(BOT_WALLET, true);
        vm.stopBroadcast();
    }
}
