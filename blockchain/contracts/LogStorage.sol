// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LogStorage
 * @dev Smart contract for storing tamper-proof hashes of pharmaceutical supply chain logs
 *
 * This contract stores SHA256 hashes of batch updates, providing an immutable
 * audit trail for the PharmaChain Intelligence System.
 */
contract LogStorage {
    // Owner of the contract (deployer)
    address public owner;

    // Array to store all hashes
    string[] public hashes;

    // Mapping to check if hash exists
    mapping(string => bool) public hashExists;

    // Mapping to store timestamp for each hash
    mapping(string => uint256) public hashTimestamps;

    // Events
    event HashStored(string indexed hash, uint256 timestamp, address indexed storedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Constructor - sets the deployer as owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Modifier to restrict functions to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Store a new hash on the blockchain
     * @param hash The hash to store (typically SHA256 of log data)
     */
    function storeHash(string memory hash) public {
        require(bytes(hash).length > 0, "Hash cannot be empty");
        require(!hashExists[hash], "Hash already exists");

        hashes.push(hash);
        hashExists[hash] = true;
        hashTimestamps[hash] = block.timestamp;

        emit HashStored(hash, block.timestamp, msg.sender);
    }

    /**
     * @dev Store multiple hashes in a single transaction
     * @param _hashes Array of hashes to store
     */
    function storeMultipleHashes(string[] memory _hashes) public {
        for (uint256 i = 0; i < _hashes.length; i++) {
            if (!hashExists[_hashes[i]]) {
                hashes.push(_hashes[i]);
                hashExists[_hashes[i]] = true;
                hashTimestamps[_hashes[i]] = block.timestamp;
                emit HashStored(_hashes[i], block.timestamp, msg.sender);
            }
        }
    }

    /**
     * @dev Get all stored hashes
     * @return Array of all hashes
     */
    function getHashes() public view returns (string[] memory) {
        return hashes;
    }

    /**
     * @dev Get the count of stored hashes
     * @return Number of hashes stored
     */
    function getHashCount() public view returns (uint256) {
        return hashes.length;
    }

    /**
     * @dev Get a specific hash by index
     * @param index The index of the hash
     * @return The hash at the given index
     */
    function getHashByIndex(uint256 index) public view returns (string memory) {
        require(index < hashes.length, "Index out of bounds");
        return hashes[index];
    }

    /**
     * @dev Get the timestamp when a hash was stored
     * @param hash The hash to look up
     * @return The timestamp when the hash was stored
     */
    function getHashTimestamp(string memory hash) public view returns (uint256) {
        require(hashExists[hash], "Hash not found");
        return hashTimestamps[hash];
    }

    /**
     * @dev Get the last N hashes
     * @param count Number of hashes to retrieve
     * @return Array of the last N hashes
     */
    function getLastHashes(uint256 count) public view returns (string[] memory) {
        uint256 actualCount = count > hashes.length ? hashes.length : count;
        string[] memory result = new string[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = hashes[hashes.length - actualCount + i];
        }

        return result;
    }

    /**
     * @dev Verify if data matches stored hash
     * @param hash The hash to verify
     * @return True if hash exists, false otherwise
     */
    function verifyHash(string memory hash) public view returns (bool) {
        return hashExists[hash];
    }

    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Get contract info
     * @return _owner Current contract owner
     * @return _hashCount Total number of stored hashes
     * @return _blockNumber Current block number
     * @return _timestamp Current block timestamp
     */
    function getInfo() public view returns (
        address _owner,
        uint256 _hashCount,
        uint256 _blockNumber,
        uint256 _timestamp
    ) {
        return (owner, hashes.length, block.number, block.timestamp);
    }
}
