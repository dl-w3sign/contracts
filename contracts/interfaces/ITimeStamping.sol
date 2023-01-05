// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @notice The Time Stamping contract is used to store timestamps of documents.
 */
interface ITimeStamping {
    /**
     * @notice A structure that stores information about timestamp
     * @param timestamp a timestamp
     * @param usersSigned a number of users who already signed
     * @param signers an array of signers
     */
    struct StampInfo {
        uint256 timestamp;
        uint256 usersSigned;
        EnumerableSet.AddressSet signers;
    }

    /**
     * @notice A structure that stores information about signer of certain timestamp
     * @param signer a signer
     * @param signatureTimestamp a timestamp of signature
     */
    struct SignerInfo {
        address signer;
        uint256 signatureTimestamp;
    }

    /**
     * @notice A structure that stores detailed information about timestamp
     * @param timestamp a timestamp
     * @param usersToSign a total number of users
     * @param usersSigned a number of users who already signed
     * @param stampHash a hash of timestamp
     * @param signersInfo an array with info about users
     */
    struct DetailedStampInfo {
        uint256 timestamp;
        uint256 usersToSign;
        uint256 usersSigned;
        bytes32 stampHash;
        SignerInfo[] signersInfo;
    }

    /**
     * @notice The event that is emitted during the adding new timestamps
     * @param stampHash a hash of the added timestamp
     * @param timestamp a timestamp
     * @param signers an array of the signers
     */
    event StampCreated(bytes32 indexed stampHash, uint256 timestamp, address[] signers);

    /**
     * @notice The event that is emitted during the signing stamp by user
     * @param stampHash a hash
     * @param signer a address of the signer
     */
    event StampSigned(bytes32 indexed stampHash, address indexed signer);

    /**
     * @notice Function for initial initialization of contract parameters
     */
    function __TimeStamping_init() external;

    /**
     * @notice Function for create new timestamp
     * @param stampHash_ a new hash for timestamp
     * @param signers_ an array of signers
     */
    function createStamp(bytes32 stampHash_, address[] calldata signers_) external;

    /**
     * @notice Function for sign existing timestamp
     * @param stampHash_ an existing hash
     */
    function sign(bytes32 stampHash_) external;

    /**
     * @notice Function for obtain information about hashes
     * @param stampHashes_ hashes of timestamps
     * @return detailedStampsInfo_ an array of informations about hashes
     */
    function getStampsInfo(
        bytes32[] calldata stampHashes_
    ) external view returns (DetailedStampInfo[] memory detailedStampsInfo_);

    /**
     * @notice Function for obtain status of stamp
     * @param stampHash_ a hash of timestamp
     * @return true if all users signed a hash, false - otherwise
     */
    function getStampStatus(bytes32 stampHash_) external view returns (bool);

    /**
     * @notice Function for obtain array of hashes that user signed
     * @param user_ an address of user
     * @return stampHashes an array of hashes signed by user
     */
    function getHashesByUserAddress(
        address user_
    ) external view returns (bytes32[] memory stampHashes);
}