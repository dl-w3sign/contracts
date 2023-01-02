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
     * @param signersSigned an array of signers, who already signed 
     */
    struct StampInfo {
        uint256 timestamp;
        uint256 usersSigned;
        EnumerableSet.AddressSet signers;
        EnumerableSet.AddressSet signersSigned;
    }

    /**
     * @notice A structure that stores detailed information about timestamp
     * @param timestamp a timestamp
     * @param usersToSign a total number of users
     * @param usersSigned a number of users who already signed
     * @param hash a hash of timestamp
     * @param allSigners an array of all signers
     * @param alreadySigners an array of signers who allready have signed
     */
    struct DetailedStampInfo {
        uint256 timestamp;
        uint256 usersToSign;
        uint256 usersSigned;
        bytes32 hash;
        address[] signers;
        address[] alreadySigners;
    }

    /**
     * @notice The event that is emitted during the adding new timestamps
     * @param hash a hash of the added timestamp
     * @param timestamp a timestamp
     * @param signers an array of the signers
     */
    event StampCreated(bytes32 indexed hash, uint256 timestamp, address[] signers);

    /**
     * @notice The event that is emitted during the signing stamp by user
     * @param hash a hash
     * @param signer a address of the signer
     */
    event StampSigned(bytes32 indexed hash, address indexed signer);

    /**
     * @notice Function for initial initialization of contract parameters
     */
    function __TimeStamping_init() external;

    /**
     * @notice Function for create new timestamp
     * @param hash_ a new hash for timestamp
     * @param signers_ an array of signers
     */
    function createStamp(bytes32 hash_, address[] calldata signers_) external;

    /**
     * @notice Function for sign existing timestamp
     * @param hash_ an existing hash
     */
    function sign(bytes32 hash_) external;

    /**
     * @notice Function for obtain information about hashes
     * @param hashes_ hashes of timestamps
     * @return detailedStampsInfo_ an array of informations about hashes
     */
    function getStampsInfo(
        bytes32[] calldata hashes_
    ) external view returns (DetailedStampInfo[] memory detailedStampsInfo_);

    /**
     * @notice Function for obtain status of stamp
     * @param hash_ a hash of timestamp
     * @return true if all users signed a hash, false - otherwise
     */
    function getStampStatus(bytes32 hash_) external view returns (bool);

    /**
     * @notice Function for obtain array of hashes that user signed
     * @param user_ an address of user
     * @return hashes an array of hashes signed by user
     */
    function getHashesByUserAddress(
        address user_
    ) external view returns (bytes32[] memory hashes);
}
