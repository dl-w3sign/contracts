// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "../TimeStamping.sol";

contract Tester {
    function test(
        TimeStamping target,
        bytes32 data,
        bool isSigned,
        address[] memory signers,
        ITimeStamping.ZKPPoints memory zkpPoints
    ) public payable {
        target.createStamp{value: msg.value}(data, isSigned, signers, zkpPoints);
    }
}
