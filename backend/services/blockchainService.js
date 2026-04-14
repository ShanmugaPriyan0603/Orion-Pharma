const { ethers } = require('ethers');
const { generateHash } = require('../utils/hash');
const Log = require('../models/Log');

/**
 * Blockchain Service
 * Handles interaction with Ethereum smart contract for tamper-proof logging
 */

// Contract ABI (minimal - just the functions we need)
const CONTRACT_ABI = [
  "function storeHash(string memory hash) public",
  "function getHashes() public view returns (string[] memory)",
  "function getHashCount() public view returns (uint256)",
  "function hashExists(string memory hash) public view returns (bool)",
  "event HashStored(string hash, uint256 timestamp)"
];

// Contract address (will be set after deployment)
let CONTRACT_ADDRESS = null;

/**
 * Get provider and signer for local Hardhat network
 */
const getProvider = () => {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

const getSigner = (provider) => {
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat key
  return new ethers.Wallet(privateKey, provider);
};

/**
 * Get contract instance
 */
const getContract = async () => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set. Deploy contract first.');
  }

  const provider = getProvider();
  const signer = getSigner(provider);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

/**
 * Store data hash on blockchain
 * @param {Object} data - Data to hash and store
 * @returns {Object} - Hash and transaction info
 */
const storeDataHash = async (data) => {
  try {
    const hash = generateHash(data);

    // For demo purposes, we'll store the hash in the database
    // In production, this would be an actual blockchain transaction
    const contract = await getContract();
    const tx = await contract.storeHash(hash);
    const receipt = await tx.wait();

    return {
      hash,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Blockchain storage error:', error.message);
    // Fallback: store hash locally with timestamp
    return {
      hash: generateHash(data),
      transactionHash: 'pending',
      blockNumber: null,
      timestamp: new Date(),
      local: true
    };
  }
};

/**
 * Store hash locally (fallback/demo mode)
 */
const storeHashLocal = async (data) => {
  const hash = generateHash(data);

  return {
    hash,
    timestamp: new Date(),
    local: true,
    data
  };
};

/**
 * Get all hashes from blockchain
 */
const getAllHashes = async () => {
  try {
    const contract = await getContract();
    const hashes = await contract.getHashes();
    return { hashes, local: false };
  } catch (error) {
    console.error('Blockchain read error:', error.message);
    // Return locally stored hashes
    const logs = await Log.find({ blockchainHash: { $exists: true } }).distinct('blockchainHash');
    return { hashes: logs, local: true };
  }
};

/**
 * Verify data integrity by comparing hash
 */
const verifyDataIntegrity = async (data, storedHash) => {
  const computedHash = generateHash(data);
  return {
    isValid: computedHash === storedHash,
    computedHash,
    storedHash
  };
};

/**
 * Set contract address (called after deployment)
 */
const setContractAddress = (address) => {
  CONTRACT_ADDRESS = address;
  console.log('Contract address set:', CONTRACT_ADDRESS);
};

const getContractAddress = () => CONTRACT_ADDRESS;

/**
 * Check if blockchain is connected
 */
const checkConnection = async () => {
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    return {
      connected: true,
      blockNumber,
      network: await provider.getNetwork()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = {
  storeDataHash,
  storeHashLocal,
  getAllHashes,
  verifyDataIntegrity,
  setContractAddress,
  getContractAddress,
  checkConnection,
  generateHash
};
