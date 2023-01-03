// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping, OwnableUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableMap for EnumerableMap.Bytes32ToUintMap;

    mapping(bytes32 => StampInfo) internal stamps_;

    mapping(address => mapping(bytes32 => uint256)) internal _signersTimetamps;
    mapping(address => EnumerableSet.Bytes32Set) internal _signersStampHashes;

    function __TimeStamping_init() external override initializer {
        __Ownable_init();
    }

    function createStamp(
        bytes32 stampHash_,
        address[] calldata signers_
    ) external override {
        StampInfo storage stampInfo = stamps_[stampHash_];
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
            _sign(stampHash_);
        }

        emit StampCreated(stampHash_, block.timestamp, signers_);
    }

    function sign(bytes32 stampHash_) external override {
        StampInfo storage stampInfo = stamps_[stampHash_];
        require(stampInfo.timestamp != 0, "TimeStamping: Hash is not exists");
        require(
            stampInfo.signers.contains(msg.sender),
            "TimeStamping: User is not admitted."
        );
        require(
            !_signersStampHashes[msg.sender].contains(stampHash_),
            "TimeStamping: User has signed already."
        );

        _sign(stampHash_);
    }

    function getStampsInfo(
        bytes32[] calldata stampHashes_
    ) external view override returns (DetailedStampInfo[] memory detailedStampsInfo_) {
        detailedStampsInfo_ = new DetailedStampInfo[](stampHashes_.length);

        for (uint256 i = 0; i < stampHashes_.length; i++) {
            StampInfo storage stampInfo = stamps_[stampHashes_[i]];
            address[] memory hashSigners_ = stampInfo.signers.values();

            detailedStampsInfo_[i] = DetailedStampInfo(
                stampInfo.timestamp,
                hashSigners_.length,
                stampInfo.usersSigned,
                stampHashes_[i],
                _getUsersInfo(stampHashes_[i], hashSigners_)
            );
        }
    }

    function getStampStatus(bytes32 stampHash_) external view override returns (bool) {
        return stamps_[stampHash_].usersSigned == stamps_[stampHash_].signers.length();
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        return _signersStampHashes[user_].values();
    }

    function _getUsersInfo(
        bytes32 stampHash_,
        address[] memory users_
    ) internal view returns (SignerInfo[] memory signerInfo_) {
        signerInfo_ = new SignerInfo[](users_.length);
        for (uint256 i = 0; i < users_.length; i++) {
            address currentUser_ = users_[i];
            signerInfo_[i] = SignerInfo(
                currentUser_,
                _signersTimetamps[currentUser_][stampHash_]
            );
        }
    }

    function _sign(bytes32 stampHash_) internal {
        _signersStampHashes[msg.sender].add(stampHash_);
        _signersTimetamps[msg.sender][stampHash_] = block.timestamp;
        stamps_[stampHash_].usersSigned += 1;
        emit StampSigned(stampHash_, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
