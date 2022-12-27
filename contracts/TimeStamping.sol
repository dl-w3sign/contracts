// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(bytes32 => StampInfo) internal stamps_;
    mapping(address => EnumerableSet.Bytes32Set) internal _signersHashes;

    function createStamp(bytes32 hash_, address[] calldata signers_) external override {
        StampInfo storage stampInfo = stamps_[hash_];
        require(stampInfo.timestamp == 0, "TimeStamping: Hash collision.");
        require(signers_.length > 0, "TimeStamping: Incorect signers count.");

        stampInfo.timestamp = block.timestamp;

        for (uint256 i = 0; i < signers_.length; i++) {
            require(
                stampInfo.signers.add(signers_[i]),
                "TimeStamping: Incorect signers."
            );
        }

        if (stampInfo.signers.contains(msg.sender)) {
            _sign(hash_);
        }

        emit StampCreated(hash_, block.timestamp, signers_);
    }

    function sign(bytes32 hash_) external override {
        StampInfo storage stampInfo = stamps_[hash_];
        require(stampInfo.timestamp != 0, "TimeStamping: Hash is not exists");
        require(
            stampInfo.signers.contains(msg.sender),
            "TimeStamping: User is not admitted."
        );
        require(
            !_signersHashes[msg.sender].contains(hash_),
            "TimeStamping: User has signed already."
        );

        _sign(hash_);
    }

    function _sign(bytes32 hash_) internal {
        _signersHashes[msg.sender].add(hash_);
        stamps_[hash_].usersSigned += 1;
        emit StampSigned(hash_, msg.sender);
    }

    function getStampsInfo(
        bytes32[] calldata hashes_
    ) external view override returns (DetailedStampInfo[] memory detailedStampsInfo_) {
        detailedStampsInfo_ = new DetailedStampInfo[](hashes_.length);

        for (uint256 i = 0; i < hashes_.length; i++) {
            StampInfo storage stampInfo = stamps_[hashes_[i]];

            detailedStampsInfo_[i] = DetailedStampInfo(
                stampInfo.timestamp,
                stampInfo.signers.length(),
                stampInfo.usersSigned,
                hashes_[i],
                stampInfo.signers.values()
            );
        }
    }

    function getStampStatus(bytes32 hash_) external view override returns (bool) {
        return stamps_[hash_].usersSigned == stamps_[hash_].signers.length();
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        return _signersHashes[user_].values();
    }
}
