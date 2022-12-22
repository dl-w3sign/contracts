// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping, EIP712 {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using ECDSA for bytes32;

    bytes32 internal constant _CREATE_TYPEHASH = keccak256("Create(bytes32 hash)");

    mapping(bytes32 => TimeStampInfo) private _history;
    mapping(address => bytes32[]) private _signersHistory;

    constructor() EIP712("TimeStamping", "1") {}

    function createStamp(
        bytes32 hash_,
        address[] calldata signers_,
        bytes32[] calldata r_,
        bytes32[] calldata s_,
        uint8[] calldata v_
    ) external override {
        require(_history[hash_].timeStamp == 0, "TimeStamping: Hash collision.");

        uint256 signersCount_ = signers_.length;
        require(signersCount_ > 0, "TimeStamping: Incorect number of signers.");
        require(
            signersCount_ == r_.length &&
                signersCount_ == s_.length &&
                signersCount_ == v_.length,
            "TimeStamping: Incorect parameters count."
        );

        bytes32 hashTypedDataV4_ = _hashTypedDataV4(
            keccak256(abi.encode(_CREATE_TYPEHASH, hash_))
        );
        for (uint256 i = 0; i < signersCount_; i++) {
            address signer_ = hashTypedDataV4_.recover(v_[i], r_[i], s_[i]);

            uint256 matchesCount_ = 0;
            for (uint256 j = 0; j < signersCount_; j++) {
                if (signers_[j] == signer_) {
                    matchesCount_++;
                }
            }
            require(matchesCount_ == 1, "TimeStamping: Incorect signers parameters.");
        }

        for (uint256 i = 0; i < signersCount_; i++) {
            _signersHistory[signers_[i]].push(hash_);
        }

        _history[hash_] = TimeStampInfo(block.timestamp, signers_);
        emit TimeStampCreated(hash_, signers_);
    }

    function getTimeStamp(
        bytes32 hash_
    ) external view override returns (TimeStampInfo memory) {
        require(_history[hash_].timeStamp != 0, "TimeStamping: Hash is not existing");
        return (_history[hash_]);
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        require(_signersHistory[user_].length != 0, "TimeStamping: User has not stamps");
        return _signersHistory[user_];
    }
}
