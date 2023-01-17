// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@dlsl/dev-modules/libs/arrays/Paginator.sol";

import "./interfaces/ITimeStamping.sol";

contract TimeStamping is ITimeStamping, OwnableUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using Paginator for EnumerableSet.AddressSet;

    mapping(bytes32 => StampInfo) internal _stamps;

    mapping(address => mapping(bytes32 => uint256)) internal _signersTimetamps;

    mapping(address => EnumerableSet.Bytes32Set) internal _signersStampHashes;

    function __TimeStamping_init() external override initializer {
        __Ownable_init();
    }

    function createStamp(bytes32 stampHash_, bool isSign_) external override {
        StampInfo storage _stampInfo = _stamps[stampHash_];

        require(_stampInfo.timestamp == 0, "TimeStamping: Hash collision.");

        _stampInfo.timestamp = block.timestamp;

        emit StampCreated(stampHash_, block.timestamp);

        if (isSign_) {
            _sign(stampHash_);
        }
    }

    function sign(bytes32 stampHash_) external override {
        StampInfo storage _stampInfo = _stamps[stampHash_];

        require(_stampInfo.timestamp != 0, "TimeStamping: Hash is not exists");

        require(
            !_stampInfo.signers.contains(msg.sender),
            "TimeStamping: User has signed already."
        );

        _sign(stampHash_);
    }

    function getStampInfo(
        bytes32 stampHash_
    ) external view override returns (DetailedStampInfo memory) {
        return
            getStampInfoWithPagination(
                stampHash_,
                0,
                _stamps[stampHash_].signers.length()
            );
    }

    function getStampInfoWithPagination(
        bytes32 stampHash_,
        uint256 offset_,
        uint256 limit_
    ) public view override returns (DetailedStampInfo memory) {
        StampInfo storage _stampInfo = _stamps[stampHash_];

        return
            DetailedStampInfo(
                _stampInfo.timestamp,
                _stampInfo.signers.length(),
                stampHash_,
                _getUsersInfo(stampHash_, _stampInfo.signers.part(offset_, limit_))
            );
    }

    function getHashesByUserAddress(
        address user_
    ) external view override returns (bytes32[] memory) {
        return _signersStampHashes[user_].values();
    }

    function getStampSignersCount(
        bytes32 stampHash_
    ) external view override returns (uint256) {
        return _stamps[stampHash_].signers.length();
    }

    function getUserInfo(
        address user_,
        bytes32 stampHash_
    ) public view override returns (SignerInfo memory signerInfo_) {
        return SignerInfo(user_, _signersTimetamps[user_][stampHash_]);
    }

    function _sign(bytes32 stampHash_) internal {
        _stamps[stampHash_].signers.add(msg.sender);

        _signersStampHashes[msg.sender].add(stampHash_);

        _signersTimetamps[msg.sender][stampHash_] = block.timestamp;

        emit StampSigned(stampHash_, msg.sender);
    }

    function _getUsersInfo(
        bytes32 stampHash_,
        address[] memory users_
    ) internal view returns (SignerInfo[] memory signersInfo_) {
        signersInfo_ = new SignerInfo[](users_.length);

        for (uint256 i = 0; i < users_.length; i++) {
            signersInfo_[i] = getUserInfo(users_[i], stampHash_);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
