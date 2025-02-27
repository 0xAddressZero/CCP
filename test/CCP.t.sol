// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../src/CCP.sol";

contract CCPTest is Test {
    CCP public ccp;
    address public owner = address(0x123);
    address public handler = address(0x456);
    uint public ownerUserId = 1;
    uint public constant MAX_SUPPLY = 69_000_000 ether;

    // Set up the contract before each test
    function setUp() public {
        vm.prank(owner);
        ccp = new CCP(owner, ownerUserId);
    }

    // Test deployment and initialization
    function testDeployment() public view {
        assertEq(ccp.totalSupply(), MAX_SUPPLY, "Total supply should be MAX_SUPPLY");
        assertEq(ccp.balanceOf(ownerUserId), MAX_SUPPLY, "Owner user ID should have MAX_SUPPLY");
        assertEq(ccp.owner(), owner, "Owner should be set correctly");
        assertEq(ccp.userLength(), 0, "User array should start empty");
    }

    // Test setting and updating usernames
    function testSetUsername() public {
        vm.startPrank(owner); // Owner is a handler by default
        ccp.setUsername(2, "user2");
        
        CCP.UserInfo memory user2 = ccp.user(2);
        assertEq(user2.id, 2, "User ID should match");
        assertEq(user2.username, "user2", "Username should be set");
        assertEq(user2.balance, 0, "New user balance should be 0");
        assertEq(ccp.userLength(), 1, "User array length should be 1");

        ccp.setUsername(2, "user2_updated");
        user2 = ccp.user(2);
        assertEq(user2.username, "user2_updated", "Username should be updated");
        assertEq(ccp.userLength(), 1, "User array length should not increase");
        vm.stopPrank();
    }

    // Test token transfer
    function testTransfer() public {
        vm.startPrank(owner);
        ccp.transfer(ownerUserId, 2, 1000 ether);
        
        assertEq(ccp.balanceOf(ownerUserId), MAX_SUPPLY - 1000 ether, "Sender balance should decrease");
        assertEq(ccp.balanceOf(2), 1000 ether, "Receiver balance should increase");
        assertEq(ccp.totalSupply(), MAX_SUPPLY, "Total supply should not change");

        vm.expectRevert();
        ccp.transfer(2, ownerUserId, 1001 ether);
        vm.stopPrank();
    }

    // Test minting (should fail due to max supply)
    function testMint() public {
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(CCP.ExceedsMaxSupply.selector));
        ccp.mint(2, 1 ether);
        vm.stopPrank();
    }

    // Test burning
    function testBurn() public {
        vm.startPrank(owner);
        ccp.burn(ownerUserId, 1000 ether);
        
        assertEq(ccp.balanceOf(ownerUserId), MAX_SUPPLY - 1000 ether, "User balance should decrease");
        assertEq(ccp.totalSupply(), MAX_SUPPLY - 1000 ether, "Total supply should decrease");

        vm.expectRevert();
        ccp.burn(ownerUserId, MAX_SUPPLY); // Burn more than balance
        vm.stopPrank();
    }

    // Test handler management
    function testHandlerManagement() public {
        vm.startPrank(owner);
        ccp.setHandlerEnabled(handler, true);
        assertTrue(ccp.handlers(handler), "Handler should be enabled");

        vm.stopPrank();
        vm.prank(handler);
        ccp.transfer(ownerUserId, 2, 1000 ether);
        assertEq(ccp.balanceOf(2), 1000 ether, "Handler should perform transfer");

        vm.prank(owner);
        ccp.setHandlerEnabled(handler, false);
        vm.prank(handler);
        vm.expectRevert(abi.encodeWithSelector(CCP.Unauthorized.selector));
        ccp.transfer(ownerUserId, 2, 1000 ether);
    }

    // Test ownership transfer
    function testTransferOwnership() public {
        address newOwner = address(0x789);
        vm.prank(owner);
        ccp.transferOwnership(newOwner);
        
        assertEq(ccp.owner(), newOwner, "Ownership should transfer");

        vm.prank(newOwner);
        ccp.setHandlerEnabled(handler, true); // New owner can manage handlers
        assertTrue(ccp.handlers(handler), "New owner should enable handler");

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CCP.Unauthorized.selector));
        ccp.setHandlerEnabled(handler, false); // Old owner cannot
    }

    // Test retrieving users
    function testUsers() public {
        vm.startPrank(owner);
        ccp.setUsername(2, "user2");
        ccp.setUsername(3, "user3");
        ccp.transfer(ownerUserId, 2, 1000 ether);

        CCP.UserInfo[] memory userList = ccp.users(0, 2);
        assertEq(userList.length, 2, "Should return 2 users");
        assertEq(userList[0].id, 2, "First user ID should be 2");
        assertEq(userList[0].username, "user2", "First username should match");
        assertEq(userList[0].balance, 1000 ether, "First user balance should match");
        assertEq(userList[1].id, 3, "Second user ID should be 3");
        vm.stopPrank();
    }

    // Test edge case: transfer to user ID 0
    function testTransferToUserIdZero() public {
        vm.startPrank(owner);
        ccp.transfer(ownerUserId, 0, 1000 ether);
        assertEq(ccp.balanceOf(0), 1000 ether, "User ID 0 should receive tokens");
        
        vm.expectRevert(abi.encodeWithSelector(CCP.UserDoesNotExist.selector));
        ccp.user(0); // Should revert until username is set

        ccp.setUsername(0, "user0");
        CCP.UserInfo memory user0 = ccp.user(0);
        assertEq(user0.username, "user0", "User ID 0 username should be set");
        assertEq(user0.balance, 1000 ether, "User ID 0 balance should match");
        vm.stopPrank();
    }
}