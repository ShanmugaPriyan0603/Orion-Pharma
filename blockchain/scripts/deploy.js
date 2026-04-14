const hre = require("hardhat");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     PharmaChain - Deploying Smart Contract               ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log();

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log();

  // Deploy the contract
  const LogStorage = await hre.ethers.getContractFactory("LogStorage");
  const logStorage = await LogStorage.deploy();

  await logStorage.waitForDeployment();

  const contractAddress = await logStorage.getAddress();
  console.log("✅ LogStorage contract deployed to:", contractAddress);
  console.log();

  // Verify deployment
  const info = await logStorage.getInfo();
  console.log("Contract Info:");
  console.log("  Owner:", info[0]);
  console.log("  Hash Count:", info[1].toString());
  console.log("  Block Number:", info[2].toString());
  console.log();

  // Test storing a hash
  console.log("Testing hash storage...");
  const testHash = hre.ethers.id("PharmaChain-Test-Hash");
  const tx = await logStorage.storeHash(testHash);
  await tx.wait();
  console.log("✅ Test hash stored successfully");

  // Verify the hash was stored
  const exists = await logStorage.hashExists(testHash);
  console.log("✅ Hash verification:", exists);
  console.log();

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     Deployment Complete!                                  ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Contract Address: ${contractAddress}  ║`);
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Save this contract address to backend/.env:");
  console.log(`BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
