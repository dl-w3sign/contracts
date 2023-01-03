// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping, OwnableUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(bytes32 => StampInfo) internal stamps_;
    mapping(address => EnumerableSet.Bytes32Set) internal _signersHashes;

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
            !_signersHashes[msg.sender].contains(stampHash_),
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

            detailedStampsInfo_[i] = DetailedStampInfo(
                stampInfo.timestamp,
                stampInfo.signers.length(),
                stampInfo.usersSigned,
                stampHashes_[i],
                stampInfo.signers.values(),
                _getAlreadySigners(stampHashes_[i], stampInfo)
            );
        }
    }

    function getStampStatus(bytes32 stampHash_) external view override returns (bool) {
        return stamps_[stampHash_].usersSigned == stamps_[stampHash_].signers.length();
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        return _signersHashes[user_].values();
    }

    function _sign(bytes32 stampHash_) internal {
        _signersHashes[msg.sender].add(stampHash_);
        stamps_[stampHash_].usersSigned += 1;
        emit StampSigned(stampHash_, msg.sender);
    }

    function _getAlreadySigners(
        bytes32 stampHash_,
        StampInfo storage stampInfo_
    ) internal view returns (address[] memory signersSigned_) {
        uint256 alereadySignersCount_ = stampInfo_.usersSigned;

        signersSigned_ = new address[](alereadySignersCount_);

        uint256 index_;

        for (uint256 i = 0; index_ < alereadySignersCount_; i++) {
            address currentSigner_ = stampInfo_.signers.at(i);

            if (_signersHashes[currentSigner_].contains(stampHash_)) {
                signersSigned_[index_++] = currentSigner_;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
