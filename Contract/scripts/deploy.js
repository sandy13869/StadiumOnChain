const { ethers, upgrades } = require("hardhat");

const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy StreamToken
  console.log("\n--- Deploying StreamToken ---");
  const StreamToken = await ethers.getContractFactory("StreamToken");
  const streamToken = await upgrades.deployProxy(
    StreamToken,
    ["Stream Token", "SPRX", ethers.parseEther("1000000"), deployer.address],
    { initializer: "initialize", kind: "transparent" }
  );
  await streamToken.waitForDeployment();
  const streamTokenAddress = await streamToken.getAddress();
  console.log("StreamToken proxy deployed to:", streamTokenAddress);

  // Deploy TokenizedAccess
  console.log("\n--- Deploying TokenizedAccess ---");
  const TokenizedAccess = await ethers.getContractFactory("TokenizedAccess");
  const tokenizedAccess = await upgrades.deployProxy(
    TokenizedAccess,
    ["Stream Access NFT", "SPRXNFT", deployer.address, 250, deployer.address],
    { initializer: "initialize", kind: "transparent", unsafeAllow: ["constructor"] }
  );
  await tokenizedAccess.waitForDeployment();
  const tokenizedAccessAddress = await tokenizedAccess.getAddress();
  console.log("TokenizedAccess proxy deployed to:", tokenizedAccessAddress);

  // Deploy StreamAccessController
  console.log("\n--- Deploying StreamAccessController ---");
  const StreamAccessController = await ethers.getContractFactory("StreamAccessController");
  const controller = await upgrades.deployProxy(
    StreamAccessController,
    [
      streamTokenAddress,
      tokenizedAccessAddress,
      USDC_POLYGON,
      100,    // 100 SPRX per 1 USDC
      10000,  // 0.01 USDC per minute (6 decimals)
      100,    // 1% fee (100 basis points)
      deployer.address,
    ],
    { initializer: "initialize", kind: "transparent" }
  );
  await controller.waitForDeployment();
  const controllerAddress = await controller.getAddress();
  console.log("StreamAccessController proxy deployed to:", controllerAddress);

  // Grant MINTER_ROLE on StreamToken to StreamAccessController
  console.log("\n--- Configuring roles ---");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  const tx1 = await streamToken.grantRole(MINTER_ROLE, controllerAddress);
  await tx1.wait();
  console.log("Granted MINTER_ROLE on StreamToken to StreamAccessController");

  // Grant MINTER_ROLE on TokenizedAccess to StreamAccessController
  const tx2 = await tokenizedAccess.grantRole(MINTER_ROLE, controllerAddress);
  await tx2.wait();
  console.log("Granted MINTER_ROLE on TokenizedAccess to StreamAccessController");

  // Transfer SPRX liquidity to controller for exchange operations
  console.log("\n--- Funding controller with SPRX liquidity ---");
  const liquidityAmount = ethers.parseEther("500000");
  const tx3 = await streamToken.transfer(controllerAddress, liquidityAmount);
  await tx3.wait();
  console.log("Transferred 500,000 SPRX to controller for exchange liquidity");

  // Print deployment summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("StreamToken proxy:          ", streamTokenAddress);
  console.log("TokenizedAccess proxy:      ", tokenizedAccessAddress);
  console.log("StreamAccessController proxy:", controllerAddress);
  console.log("USDC (Polygon):             ", USDC_POLYGON);
  console.log("========================================\n");

  console.log("Copy these addresses to Server/.env and Frontend/.env:");
  console.log(`TOKEN_ADDRESS=${streamTokenAddress}`);
  console.log(`TICKET_ADDRESS=${tokenizedAccessAddress}`);
  console.log(`ACCESS_ADDRESS=${controllerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
