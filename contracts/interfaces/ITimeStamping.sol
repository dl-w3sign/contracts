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
     * @param signers an array of signers
     */
    struct StampInfo {
        uint256 timestamp;
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
     * @param signersCount a count of signers
     * @param stampHash a hash of timestamp
     * @param signersInfo an array with info about signers
     */
    struct DetailedStampInfo {
        uint256 timestamp;
        uint256 signersCount;
        bytes32 stampHash;
        SignerInfo[] signersInfo;
    }

    /**
     * @notice The event that is emitted during the adding new timestamps
     * @param stampHash a hash of the added timestamp
     * @param timestamp a timestamp
     */
    event StampCreated(bytes32 indexed stampHash, uint256 timestamp);

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
     * @param isSign_  a parameter that shows whether user sign this stamp
     */
    function createStamp(bytes32 stampHash_, bool isSign_) external;

    /**
     * @notice Function for sign existing timestamp
     * @param stampHash_ an existing hash
     */
    function sign(bytes32 stampHash_) external;

    /**
     * @notice Function for obtain number of signers of timestamp
     * @param stampHash_ a hash
     * @return count_ a count of signers
     */
    function getStampSignersCount(bytes32 stampHash_) external returns (uint256 count_);

    /**
     * @notice Function for obtain information about hash
     * @param stampHash_ hash of timestamps
     * @return detailedStampInfo_ a structure of informations about hash
     */
    function getStampInfo(
        bytes32 stampHash_
    ) external view returns (DetailedStampInfo memory detailedStampInfo_);

    /**
     * @notice Function for obtain information about hash
     * @param stampHash_ hash of timestamps
     * @param offset_ an offset for pagination
     * @param limit_ a maximum number of elements for pagination
     * @return detailedStampInfo_ aa structure of informations about hash
     */
    function getStampInfoWithPagination(
        bytes32 stampHash_,
        uint256 offset_,
        uint256 limit_
    ) external view returns (DetailedStampInfo memory detailedStampInfo_);

    /**
     * @notice Function for obtain array of hashes that user signed
     * @param user_ an address of user
     * @return stampHashes_ an array of hashes signed by user
     */
    function getHashesByUserAddress(
        address user_
    ) external view returns (bytes32[] memory stampHashes_);

    /**
     * @notice Function to get info about hash and user
     * @param user_ an address of user
     * @param stampHash_ hash of timestamps
     * @return signerInfo a struct with info about provided hash and signer
     */
    function getUserInfo(
        address user_,
        bytes32 stampHash_
    ) external view returns (SignerInfo memory signerInfo);
}
