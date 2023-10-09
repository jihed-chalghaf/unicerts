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
    let studentCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      const cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );

      studentCID = getBytes32FromCID(cid);
    });

    it("should add student", async function () {
      const addStudentTx = await unicerts.connect(acc1).addStudent(studentCID);

      await expect(addStudentTx)
        .to.emit(unicerts, "AddStudent")
        .withArgs(acc1.address, studentCID);

      const student = await unicerts.getStudent(acc1.address);

      expect(student.addr).to.eq(acc1.address, "address should match");
      expect(student.cid).to.eq(studentCID, "cid should match");
      expect(student.certsCIDs, "certs should be empty").to.be.empty;
    });

    it("should revert if student already exists", async function () {
      await unicerts.connect(acc1).addStudent(studentCID);

      await expect(
        unicerts.connect(acc1).addStudent(studentCID)
      ).to.be.revertedWith("UNICERTS: STUDENT_ALREADY_EXISTS");
    });

    it("should revert if sent by admin", async function () {
      await expect(unicerts.addStudent(studentCID)).to.be.revertedWith(
        "UNICERTS: ADMIN_CANNOT_ENTROLL_AS_A_STUDENT"
      );
    });

    it("gas usage simulation [ @skip-on-coverage ]", async function () {
      const addStudentTx = await unicerts.connect(acc1).addStudent(studentCID);

      const receipt = await addStudentTx.wait();

      expect(receipt.gasUsed).to.eq(114631, "gas should match"); // with full storage was 289702, with student cid as string => 165704
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

      await unicerts.connect(acc1).addStudent(bytes32CID);
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

    it("should revert if called by an unauthorized account", async function () {
      await expect(
        unicerts.connect(acc2).getStudent(acc1.address)
      ).to.be.revertedWith("UNICERTS: ONLY_VALID_STUDENT_OR_ADMIN");
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
      await unicerts.connect(acc1).addStudent(student1CID);
      await unicerts.connect(acc2).addStudent(student2CID);
    });

    it("should retrieve students when called by the admin", async function () {
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

  describe("requestCertificate", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const studentCid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const certCid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(studentCid);
      certCID = getBytes32FromCID(certCid);

      // add the student to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
    });

    it("should pass when called by a student", async function () {
      const requestCertTx = await unicerts
        .connect(acc1)
        .requestCertificate(certCID);

      await expect(requestCertTx)
        .to.emit(unicerts, "RequestCertificate")
        .withArgs(acc1.address, certCID);

      let cert = await unicerts.getCertificate(certCID);

      expect(cert.cid).to.eq(certCID, "cid should match");
      expect(cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(cert.approved, "approved should match").to.be.false;
      expect(cert.pending, "pending should match").to.be.true;
    });

    it("should revert otherwise", async function () {
      await expect(unicerts.requestCertificate(certCID)).to.be.revertedWith(
        "UNICERTS: ONLY_STUDENT"
      );
    });

    it("gas usage simulation [ @skip-on-coverage ]", async function () {
      const requestCertTx = await unicerts
        .connect(acc1)
        .requestCertificate(certCID);

      const receipt = await requestCertTx.wait();

      expect(receipt.gasUsed).to.eq(161231, "gas should match"); // was 115658 before pushing cid to student certsCIDs array & adding check
    });
  });

  describe("getCertificate", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const studentCid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const certCid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(studentCid);
      certCID = getBytes32FromCID(certCid);

      // add the student & his certificate to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
      await unicerts.connect(acc1).requestCertificate(certCID);
    });

    it("should get existing certificate", async function () {
      let cert = await unicerts.getCertificate(certCID);

      expect(cert.cid).to.eq(certCID, "cid should match");
      expect(cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(cert.approved, "approved should match").to.be.false;
      expect(cert.pending, "pending should match").to.be.true;
    });

    it("should revert if certificate does not exist", async function () {
      await expect(unicerts.getCertificate(studentCID)).to.be.revertedWith(
        "UNICERTS: CERTIFICATE_NOT_FOUND"
      );
    });
  });

  describe("getCertificates", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const studentCid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const certCid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(studentCid);
      certCID = getBytes32FromCID(certCid);

      // add the student & his certificate to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
      await unicerts.connect(acc1).requestCertificate(certCID);
    });

    it("should pass when called by the admin", async function () {
      const [cert] = await unicerts.getCertificates();

      expect(cert.cid).to.eq(certCID, "cid should match");
      expect(cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(cert.approved, "approved should match").to.be.false;
      expect(cert.pending, "pending should match").to.be.true;
    });

    it("should revert otherwise", async function () {
      await expect(unicerts.connect(acc1).getCertificates()).to.be.revertedWith(
        "UNICERTS: ONLY_ADMIN"
      );
    });
  });

  describe("getStudentCertificates", function () {
    let student1CID: string;
    let student2CID: string;
    let cert1CID: string;
    let cert2CID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the students & the certificates to IPFS
      const student1Cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const student2Cid = await uploadFile(
        ipfs,
        students[1].sid,
        JSON.stringify(students[1])
      );
      const cert1Cid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );
      const cert2Cid = await uploadFile(
        ipfs,
        certs[1].id,
        JSON.stringify(certs[1])
      );

      student1CID = getBytes32FromCID(student1Cid);
      student2CID = getBytes32FromCID(student2Cid);
      cert1CID = getBytes32FromCID(cert1Cid);
      cert2CID = getBytes32FromCID(cert2Cid);

      // add the students & their certificates to the Unicerts contract
      await unicerts.connect(acc1).addStudent(student1CID);
      await unicerts.connect(acc2).addStudent(student2CID);
      await unicerts.connect(acc1).requestCertificate(cert1CID);
      await unicerts.connect(acc2).requestCertificate(cert2CID);
    });

    it("should get certs when called by the admin", async function () {
      const [student1Cert] = await unicerts.getStudentCertificates(
        students[0].addr
      );

      expect(student1Cert.cid).to.eq(cert1CID, "first cid should match");
      expect(student1Cert.studentAddr).to.eq(
        students[0].addr,
        "first student address should match"
      ); // eq acc1.address
      expect(student1Cert.approved, "first approved should match").to.be.false;
      expect(student1Cert.pending, "first pending should match").to.be.true;

      const [student2Cert] = await unicerts.getStudentCertificates(
        students[1].addr
      );

      expect(student2Cert.cid).to.eq(cert2CID, "second cid should match");
      expect(student2Cert.studentAddr).to.eq(
        students[1].addr,
        "second student address should match"
      ); // eq acc2.address
      expect(student2Cert.approved, "second approved should match").to.be.false;
      expect(student2Cert.pending, "second pending should match").to.be.true;
    });

    it("should get certs when called by the concerned student", async function () {
      const [student1Cert] = await unicerts
        .connect(acc1)
        .getStudentCertificates(students[0].addr);

      expect(student1Cert.cid).to.eq(cert1CID, "first cid should match");
      expect(student1Cert.studentAddr).to.eq(
        students[0].addr,
        "first student address should match"
      ); // eq acc1.address
      expect(student1Cert.approved, "first approved should match").to.be.false;
      expect(student1Cert.pending, "first pending should match").to.be.true;

      const [student2Cert] = await unicerts
        .connect(acc2)
        .getStudentCertificates(students[1].addr);

      expect(student2Cert.cid).to.eq(cert2CID, "second cid should match");
      expect(student2Cert.studentAddr).to.eq(
        students[1].addr,
        "second student address should match"
      ); // eq acc2.address
      expect(student2Cert.approved, "second approved should match").to.be.false;
      expect(student2Cert.pending, "second pending should match").to.be.true;
    });

    it("should revert when called by unauthorized user", async function () {
      await expect(
        unicerts.connect(acc2).getStudentCertificates(acc1.address)
      ).to.be.revertedWith("UNICERTS: ONLY_VALID_STUDENT_OR_ADMIN");
    });

    it("should revert if student does not exist", async function () {
      await expect(
        unicerts.getStudentCertificates(deployer.address)
      ).to.be.revertedWith("UNICERTS: STUDENT_NOT_FOUND");
    });
  });

  describe("reviewCertificate", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const student1Cid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const cert1Cid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(student1Cid);
      certCID = getBytes32FromCID(cert1Cid);

      // add the student & the certificate to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
      await unicerts.connect(acc1).requestCertificate(certCID);
    });

    it("should review certificate by admin", async function () {
      const reviewCertTx = await unicerts.reviewCertificate(certCID, true);

      await expect(reviewCertTx)
        .to.emit(unicerts, "ReviewCertificate")
        .withArgs(certCID, true);

      const [cert] = await unicerts.getCertificates();

      expect(cert.cid).to.eq(certCID, "cid should match");
      expect(cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(cert.approved, "approved should match").to.be.true;
      expect(cert.pending, "pending should match").to.be.false;
    });

    it("should revert when not called by admin", async function () {
      await expect(
        unicerts.connect(acc1).reviewCertificate(studentCID, true)
      ).to.be.revertedWith("UNICERTS: ONLY_ADMIN");
    });

    it("should revert if certificate does not exist", async function () {
      await expect(
        unicerts.reviewCertificate(studentCID, true)
      ).to.be.revertedWith("UNICERTS: CERTIFICATE_DOES_NOT_EXIST");
    });

    it("should revert if certificate is not pending", async function () {
      await unicerts.reviewCertificate(certCID, true);

      await expect(
        unicerts.reviewCertificate(certCID, true)
      ).to.be.revertedWith("UNICERTS: CERTIFICATE_IS_NOT_PENDING");
    });

    it("gas usage simulation [ @skip-on-coverage ]", async function () {
      const reviewCertTx = await unicerts.reviewCertificate(certCID, true);

      await expect(reviewCertTx)
        .to.emit(unicerts, "ReviewCertificate")
        .withArgs(certCID, true);

      const receipt = await reviewCertTx.wait();

      expect(receipt.gasUsed).to.eq(34586, "gas should match");
    });
  });

  describe("issueCertificate", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const studentCid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const certCid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(studentCid);
      certCID = getBytes32FromCID(certCid);

      // add the student to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
    });

    it("should issue certificate by admin", async function () {
      const issueCertTx = await unicerts.issueCertificate(
        students[0].addr,
        certCID
      );

      await expect(issueCertTx)
        .to.emit(unicerts, "IssueCertificate")
        .withArgs(certCID, students[0].addr);

      const [cert] = await unicerts.getCertificates();

      expect(cert.cid).to.eq(certCID, "cid should match");
      expect(cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(cert.approved, "approved should match").to.be.true;
      expect(cert.pending, "pending should match").to.be.false;

      const [student1Cert] = await unicerts.getStudentCertificates(
        students[0].addr
      );

      expect(student1Cert.cid).to.eq(certCID, "cid should match");
      expect(student1Cert.studentAddr).to.eq(
        students[0].addr,
        "student address should match"
      ); // eq acc1.address
      expect(student1Cert.approved, "approved should match").to.be.true;
      expect(student1Cert.pending, "pending should match").to.be.false;
    });

    it("should revert if called by a non-admin", async function () {
      await expect(
        unicerts.connect(acc1).issueCertificate(students[0].addr, certCID)
      ).to.be.revertedWith("UNICERTS: ONLY_ADMIN");
    });

    it("should revert if student does not exist", async function () {
      await expect(
        unicerts.issueCertificate(students[1].addr, certCID)
      ).to.be.revertedWith("UNICERTS: STUDENT_NOT_FOUND");
    });

    it("should revert if student does not exist", async function () {
      await unicerts.issueCertificate(students[0].addr, certCID);

      await expect(
        unicerts.issueCertificate(students[0].addr, certCID)
      ).to.be.revertedWith("UNICERTS: CERTIFICATE_ALREADY_EXISTS");
    });

    it("gas usage simulation [ @skip-on-coverage ]", async function () {
      let issueCertTx = await unicerts.issueCertificate(
        students[0].addr,
        certCID
      );

      await expect(issueCertTx)
        .to.emit(unicerts, "IssueCertificate")
        .withArgs(certCID, students[0].addr);

      let receipt = await issueCertTx.wait();

      expect(receipt.gasUsed).to.eq(161737, "gas should match");

      const cert2Cid = await uploadFile(
        ipfs,
        certs[1].id,
        JSON.stringify(certs[1])
      );

      certCID = getBytes32FromCID(cert2Cid);

      issueCertTx = await unicerts.issueCertificate(students[0].addr, certCID);

      await expect(issueCertTx)
        .to.emit(unicerts, "IssueCertificate")
        .withArgs(certCID, students[0].addr);

      receipt = await issueCertTx.wait();

      expect(receipt.gasUsed).to.eq(127537, "gas should match");
    });
  });

  describe("checkCertificateValidity", function () {
    let studentCID: string;
    let certCID: string;

    beforeEach(async () => {
      const fixture = await loadFixture(unicertsFixture);

      unicerts = fixture.unicerts;

      // upload the student & the certificate to IPFS
      const studentCid = await uploadFile(
        ipfs,
        students[0].sid,
        JSON.stringify(students[0])
      );
      const certCid = await uploadFile(
        ipfs,
        certs[0].id,
        JSON.stringify(certs[0])
      );

      studentCID = getBytes32FromCID(studentCid);
      certCID = getBytes32FromCID(certCid);

      // add the student to the Unicerts contract
      await unicerts.connect(acc1).addStudent(studentCID);
    });

    it("should pass when the certificate exists", async function () {
      await unicerts.issueCertificate(students[0].addr, certCID);

      const valid = await unicerts.checkCertificateValidity(certCID);

      expect(valid, "cert validity should match").to.be.true;
    });

    it("should revert otherwise", async function () {
      await expect(
        unicerts.checkCertificateValidity(certCID)
      ).to.be.revertedWith("UNICERTS: CERTIFICATE_NOT_FOUND");
    });
  });
});
