import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Unicerts", function () {
  let deployer: SignerWithAddress;
  let acc1: SignerWithAddress;
  let acc2: SignerWithAddress;
  let accounts: SignerWithAddress[];

  async function deployFixture() {
    // Get the ContractFactory and Signers here.
    const Unicerts = await ethers.getContractFactory("Unicerts");
    [deployer, acc1, acc2, ...accounts] = await ethers.getSigners();

    // Deploy the contract
    const unicerts = await Unicerts.deploy();

    return { unicerts };
  }

  describe("Deployment", function () {
    it("should track admin", async function () {
      const { unicerts } = await loadFixture(deployFixture);

      expect(await unicerts.admin()).to.equal(deployer.address);
    });
  });
});
