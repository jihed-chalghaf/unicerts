import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  getBytes32FromCID,
  initIPFS,
  readFile,
  uploadFile,
} from "./utils/ipfs_helper";
import * as IPFS from "ipfs-core";
import { Certificate, Student } from "./utils/models";
import { loadCertificates, loadStudents } from "./utils/data";
import { Unicerts } from "../typechain-types";

describe("Unicerts", function () {
  let unicerts: Unicerts;
  let deployer: SignerWithAddress;
  let acc1: SignerWithAddress;
  let acc2: SignerWithAddress;
  let accounts: SignerWithAddress[];
  let ipfs: IPFS.IPFS;
  let students: Student[];
  let certs: Certificate[];

  before(async () => {
    // Deploy a local IPFS node
    ipfs = await initIPFS();

    // Fill with dummy students.
    students = await loadStudents();

    // Fill with dummy certificates.
    certs = await loadCertificates();
  });

  async function unicertsFixture() {
    // Get the ContractFactory and Signers here.
    const Unicerts = await ethers.getContractFactory("Unicerts");
    [deployer, acc1, acc2, ...accounts] = await ethers.getSigners();

    // Deploy the contract
    const unicerts = await Unicerts.deploy();

    return { unicerts };
  }

  describe("Deployment", function () {
    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;
    });

    it("should track admin", async function () {
      expect(await unicerts.admin()).to.equal(deployer.address);
    });
  });

  describe("IPFS", function () {
    it("should upload & read student", async function () {
      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      const storedStudent: JSON = await readFile(ipfs, cid, students[0].sid);

      expect(JSON.stringify(storedStudent)).to.eq(JSON.stringify(students[0]));
    });

    it("should upload & read certificate", async function () {
      const cid = await uploadFile(ipfs, certs[0].id, JSON.stringify(certs[0]));

      const storedCert: JSON = await readFile(ipfs, cid, certs[0].id);

      expect(JSON.stringify(storedCert)).to.eq(JSON.stringify(certs[0]));
    });
  });

  describe("addStudent", function () {
    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;
    });

    it("should add student", async function () {
      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      const bytes32CID = getBytes32FromCID(cid);

      const addStudentTx = await unicerts
        .connect(acc1)
        .addStudent(bytes32CID, []);

      await expect(addStudentTx)
        .to.emit(unicerts, "AddStudent")
        .withArgs(acc1.address, bytes32CID);

      const receipt = await addStudentTx.wait();

      expect(receipt.gasUsed).to.eq(118350, "gas should match"); // with full storage was 289702, with student cid as string => 165704

      const student = await unicerts.getStudent(acc1.address);

      expect(student.addr).to.eq(acc1.address, "address should match");
      expect(student.cid).to.eq(bytes32CID, "cid should match");
      expect(student.certsCIDs, "certs should be empty").to.be.empty;
    });

    it("should revert if student already exists", async function () {
      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      const bytes32CID = getBytes32FromCID(cid);

      await unicerts.connect(acc1).addStudent(bytes32CID, []);

      await expect(
        unicerts.connect(acc1).addStudent(bytes32CID, [])
      ).to.be.revertedWith("UNICERTS: STUDENT_ALREADY_EXISTS");
    });

    it("should revert if sent by admin", async function () {
      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      const bytes32CID = getBytes32FromCID(cid);

      await expect(unicerts.addStudent(bytes32CID, [])).to.be.revertedWith(
        "UNICERTS: ADMIN_CANNOT_ENTROLL_AS_A_STUDENT"
      );
    });
  });

  describe("getStudent", function () {
    let bytes32CID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      bytes32CID = getBytes32FromCID(cid);

      await unicerts.connect(acc1).addStudent(bytes32CID, []);
    });

    it("should pass if called by the concerned student", async function () {
      const [addr, cid, certs] = await unicerts
        .connect(acc1)
        .getStudent(acc1.address);

      expect(addr).to.eq(acc1.address, "addr should match");
      expect(cid).to.eq(bytes32CID, "cid should match");
      expect(certs, "certs should match").to.be.empty;
    });

    it("should pass if called by the admin", async function () {
      const [addr, cid, certs] = await unicerts.getStudent(acc1.address);

      expect(addr).to.eq(acc1.address, "addr should match");
      expect(cid).to.eq(bytes32CID, "cid should match");
      expect(certs, "certs should match").to.be.empty;
    });

    it("should revert if student does not exist", async function () {
      await expect(unicerts.getStudent(acc2.address)).to.be.revertedWith(
        "UNICERTS: STUDENT_NOT_FOUND"
      );
    });
  });

  describe("getStudents", function () {
    let student1CID: string;
    let student2CID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the 2 students to IPFS
      const cid1 = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const cid2 = await uploadFile(
        ipfs,
        students[1].sid,
        JSON.stringify(students[1])
      );

      student1CID = getBytes32FromCID(cid1);
      student2CID = getBytes32FromCID(cid2);

      // add the 2 students to the contract
      await unicerts.connect(acc1).addStudent(student1CID, []);
      await unicerts.connect(acc2).addStudent(student2CID, []);
    });

    it("should retrieve studends when called by the admin", async function () {
      const [student1, student2] = await unicerts.getStudents();

      expect(student1.addr).to.eq(
        students[0].addr,
        "first student addr should match"
      );
      expect(student1.cid).to.eq(student1CID, "first student cid should match");
      expect(student1.certsCIDs, "first student certs should match").to.be
        .empty;

      expect(student2.addr).to.eq(
        students[1].addr,
        "second student addr should match"
      );
      expect(student2.cid).to.eq(
        student2CID,
        "second student cid should match"
      );
      expect(student2.certsCIDs, "second student certs should match").to.be
        .empty;
    });

    it("should revert otherwise", async function () {
      await expect(unicerts.connect(acc1).getStudents()).to.be.revertedWith(
        "UNICERTS: ONLY_ADMIN"
      );
    });
  });
});
