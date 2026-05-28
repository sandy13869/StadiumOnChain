const { ethers, upgrades } = require("hardhat");

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/upgrade.js --network <network> <proxyAddress> <contractName>");
    console.error("Example: npx hardhat run scripts/upgrade.js --network amoy 0x1234... StreamToken");
    process.exit(1);
  }

  const proxyAddress = args[0];
  const contractName = args[1];

  console.log(`Upgrading ${contractName} at proxy ${proxyAddress}...`);

  const NewImplementation = await ethers.getContractFactory(contractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, NewImplementation);
  await upgraded.waitForDeployment();

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`${contractName} upgraded successfully.`);
  console.log("New implementation address:", implAddress);
  console.log("Proxy address (unchanged):  ", proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
