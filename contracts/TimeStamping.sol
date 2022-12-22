// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping, EIP712 {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using ECDSA for bytes32;

    bytes32 internal constant _CREATE_TYPEHASH = keccak256("Create(bytes32 hash)");

    mapping(bytes32 => StampInfo) internal _history;
    mapping(address => EnumerableSet.Bytes32Set) internal _signersHistory;

    constructor() EIP712("TimeStamping", "1") {}

    function createStamp(
        bytes32 hash_,
        address[] calldata signers_,
        bytes32[] calldata r_,
        bytes32[] calldata s_,
        uint8[] calldata v_
    ) external override {
        require(_history[hash_].timestamp == 0, "TimeStamping: Hash collision.");

        uint256 signersCount_ = signers_.length;
        require(
            signersCount_ > 0 &&
                signersCount_ == r_.length &&
                signersCount_ == s_.length &&
                signersCount_ == v_.length,
            "TimeStamping: Incorect parameters length."
        );

        StampInfo storage stampInfo = _history[hash_];
        stampInfo.timestamp = block.timestamp;

        bytes32 typeHash_ = _hashTypedDataV4(
            keccak256(abi.encode(_CREATE_TYPEHASH, hash_))
        );
        for (uint256 i = 0; i < signersCount_; i++) {
            address signer_ = typeHash_.recover(v_[i], r_[i], s_[i]);
            stampInfo.signers.add(signer_);
            _signersHistory[signer_].add(hash_);
        }

        require(
            stampInfo.signers.length() == signersCount_,
            "TimeStamping: Incorect signers parameters."
        );

        for (uint256 i = 0; i < signersCount_; i++) {
            require(
                stampInfo.signers.contains(signers_[i]),
                "TimeStamping: Incorect signers parameters."
            );
        }

        emit StampCreated(hash_, block.timestamp, signers_);
    }

    function getStampInfo(
        bytes32 hash_
    ) external view override returns (uint256, address[] memory) {
        return (_history[hash_].timestamp, _history[hash_].signers.values());
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        return _signersHistory[user_].values();
    }
}
