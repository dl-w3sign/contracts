// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @notice The Iime Stamping contract is used to store time stamps of documents.
 */
interface ITimeStamping {
    /**
     * @notice A structure that stores information about time stamp
     * @param timestamp a time stamp
     * @param lastCumulativeSum an array of signers
     */
    struct StampInfo {
        uint256 timestamp;
        EnumerableSet.AddressSet signers;
    }

    /**
     * @notice The event that is emitted during the adding new time stamps
     * @param hash a hash of the added time stamp
     * @param timestamp a time stamp
     * @param signers an array of the signers
     */
    event StampCreated(bytes32 indexed hash, uint256 timestamp, address[] signers);

    /**
     * @notice Function for create new time stamp
     * @param hash_ a new hash for time stamp
     * @param signers_ an array of signers
     * @param r_ an array of r parameters of the ECDSA signature
     * @param s_ an array of s parameters of the ECDSA signature
     * @param v_ an array of v parameters of the ECDSA signature
     */
    function createStamp(
        bytes32 hash_,
        address[] calldata signers_,
        bytes32[] calldata r_,
        bytes32[] calldata s_,
        uint8[] calldata v_
    ) external;

    /**
     * @notice Function for obtain time stamp and its signers
     * @param hash_ a hash of time stamp
     * @return timestamp a time stamp
     * @return signers an array of the signers
     */
    function getStampInfo(
        bytes32 hash_
    ) external view returns (uint256 timestamp, address[] memory signers);

    /**
     * @notice Function for obtain array of hashes that user signed
     * @param user_ an address of user
     * @return hashes an array of hashes signed by user
     */
    function getHashesByUserAddress(
        address user_
    ) external view returns (bytes32[] memory hashes);

    /**
     * @notice Function to check if a user signed a hash
     * @param user_ an address of a user
     * @param hash_ a hash of time stamp
     * @return true if a user signed a hash, false - otherwise
     */
    function isUserSignedHash(address user_, bytes32 hash_) external view returns (bool);
}
