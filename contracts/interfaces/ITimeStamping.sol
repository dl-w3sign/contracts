// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

/**
 * @notice The Iime Stamping contract is used to store time stamps of documents.
 */
interface ITimeStamping {
    /**
     * @notice A structure that stores information about time stamp
     * @param timeStamp a time stamp
     * @param lastCumulativeSum an array of signers
     */
    struct TimeStampInfo {
        uint256 timeStamp;
        address[] signers;
    }

    /**
     * @notice The event that is emitted during the adding new time stamps
     * @param hash a hash of the added time stamp
     * @param signers an array of the signers
     */
    event TimeStampCreated(bytes32 indexed hash, address[] signers);

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
     * @param hash_ a hash for time stamp
     * @return timeStampInfo a struct of TimeStampInfo
     */
    function getTimeStamp(
        bytes32 hash_
    ) external view returns (TimeStampInfo memory timeStampInfo);

    /**
     * @notice Function for obtain array of hashes that user signed
     * @param user_ a address of user
     * @return hashes an array of hashes signed by user
     */
    function getHashesByUserAddress(
        address user_
    ) external view returns (bytes32[] memory hashes);
}
