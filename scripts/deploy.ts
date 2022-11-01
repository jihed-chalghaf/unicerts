import { ethers } from "hardhat";

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();

  const Unicerts = await ethers.getContractFactory("Unicerts");
  const unicerts = await Unicerts.deploy();

  await unicerts.deployed();

  console.log(
    `Unicerts deployed to ${unicerts.address} by the admin (${deployer.address})`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
