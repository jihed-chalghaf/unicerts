// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Unicerts {
    struct Certificate {
        bytes32 cid; // any change to the certificate on IPFS will produce a different cid
        address studentAddr;
        bool approved;
        bool pending;
    }

    struct Student {
        address addr;
        bytes32 cid; // CID of the file containing the student's full data in IPFS
        bytes32[] certsCIDs; // CIDs of the student's certs
    }

    mapping(address => uint256) private studentsIndexes;
    mapping(bytes32 => uint256) private certificatesIndexes;

    Student[] private students;
    Certificate[] private certificates;

    // should be someone trustworthy from the university's administration
    address public admin;

    constructor() {
        admin = msg.sender; // specifiy the admin when deploying the contract;
    }

    // ⸻⸻⮞ Events ⮜⸻⸻
    event RequestCertificate(address studentAddr, bytes32 certCid);
    event IssueCertificate(bytes32 certCid, address studentAddr);
    event ReviewCertificate(bytes32 certCid, bool approve);
    event AddStudent(address studentAddr, bytes32 studentCid);

    // ⸻⸻⮞ Modifiers ⮜⸻⸻
    modifier onlyAdmin() {
        require(msg.sender == admin, "UNICERTS: ONLY_ADMIN");
        _;
    }

    modifier onlyStudent() {
        require(studentsIndexes[msg.sender] != 0, "UNICERTS: ONLY_STUDENT");
        _;
    }

    // ⸻⸻⮞ Getters ⮜⸻⸻
    /**
     * @dev Returns a certificate's details.
     * @param cid The certificate's id to retrieve.
     */
    function getCertificate(bytes32 cid)
        public
        view
        returns (Certificate memory)
    {
        require(
            certificatesIndexes[cid] != 0,
            "UNICERTS: CERTIFICATE_NOT_FOUND"
        );

        return certificates[certificatesIndexes[cid] - 1];
    }

    /**
     * @dev Returns a student's details.
     * @param studentAddr The student's address to retrieve.
     */
    function getStudent(address studentAddr)
        public
        view
        returns (Student memory)
    {
        require(
            msg.sender == studentAddr || msg.sender == admin,
            "UNICERTS: ONLY_VALID_STUDENT_OR_ADMIN"
        );

        require(
            studentsIndexes[studentAddr] != 0,
            "UNICERTS: STUDENT_NOT_FOUND"
        );

        return students[studentsIndexes[studentAddr] - 1];
    }

    /**
     * @dev Returns all the students' details.
     * @return An array of students.
     */
    function getStudents() public view onlyAdmin returns (Student[] memory) {
        return students;
    }

    /**
     * @dev Returns all the certificates' details. Only callable by the admin.
     * @return An array of certificates.
     */
    function getCertificates()
        public
        view
        onlyAdmin
        returns (Certificate[] memory)
    {
        return certificates;
    }

    /**
     * @dev Returns all the certificates' details for the given student. Only callable by the admin or the student.
     * @param studentAddr The student's address that we are trying to retrieve his certificates.
     * @return An array of certificates.
     */
    function getStudentCertificates(address studentAddr)
        public
        view
        returns (Certificate[] memory)
    {
        require(
            msg.sender == studentAddr || msg.sender == admin,
            "UNICERTS: ONLY_VALID_STUDENT_OR_ADMIN"
        );
        require(
            studentsIndexes[studentAddr] != 0,
            "UNICERTS: STUDENT_NOT_FOUND"
        );

        bytes32[] memory certsCIDs = students[studentsIndexes[studentAddr] - 1]
            .certsCIDs;

        uint256 certsCount = certsCIDs.length;

        Certificate[] memory studentCerts = new Certificate[](certsCount);

        unchecked {
            for (uint256 i = 0; i < certsCount; ) {
                studentCerts[i] = certificates[
                    certificatesIndexes[certsCIDs[i]] - 1
                ];
                i++;
            }
        }

        return studentCerts;
    }

    // ⸻⸻⮞ Logic Operations ⮜⸻⸻
    /**
     * @dev Registers a new student.
     * @param cid The student's CID on IPFS.
     */
    function addStudent(bytes32 cid) public {
        require(
            studentsIndexes[msg.sender] == 0,
            "UNICERTS: STUDENT_ALREADY_EXISTS"
        );
        require(
            msg.sender != admin,
            "UNICERTS: ADMIN_CANNOT_ENTROLL_AS_A_STUDENT"
        );

        studentsIndexes[msg.sender] = students.length + 1;

        bytes32[] memory certs;
        students.push(Student(msg.sender, cid, certs));

        emit AddStudent(msg.sender, cid);
    }

    /**
     * @dev Requests a new certificate for the caller. Only callable by a registered student.
     * @param cid The certificate's CID.
     */
    function requestCertificate(bytes32 cid) public onlyStudent {
        require(
            certificatesIndexes[cid] == 0,
            "UNICERTS: CERTIFICATE_ALREADY_EXISTS"
        );

        certificatesIndexes[cid] = certificates.length + 1;
        certificates.push(Certificate(cid, msg.sender, false, true));

        // add the new certificate id to the student's certificates ids array
        students[studentsIndexes[msg.sender] - 1].certsCIDs.push(cid);

        emit RequestCertificate(msg.sender, cid);
    }

    /**
     * @dev Reviews a pending certificate request. Only callable by the admin.
     * @param cid The certificate's id.
     * @param approve Whether to approve or deny the request.
     */
    function reviewCertificate(bytes32 cid, bool approve) public onlyAdmin {
        require(
            certificatesIndexes[cid] != 0,
            "UNICERTS: CERTIFICATE_DOES_NOT_EXIST"
        );
        require(
            certificates[certificatesIndexes[cid] - 1].pending,
            "UNICERTS: CERTIFICATE_IS_NOT_PENDING"
        );

        certificates[certificatesIndexes[cid] - 1].approved = approve;
        certificates[certificatesIndexes[cid] - 1].pending = false;

        emit ReviewCertificate(cid, approve);
    }

    /**
     * @dev Issues a certificate for a given student. Only callable by the admin.
     * @param student The student's address.
     * @param cid The certificate's CID.
     */
    function issueCertificate(address student, bytes32 cid) public onlyAdmin {
        require(studentsIndexes[student] != 0, "UNICERTS: STUDENT_NOT_FOUND");
        require(
            certificatesIndexes[cid] == 0,
            "UNICERTS: CERTIFICATE_ALREADY_EXISTS"
        );

        certificatesIndexes[cid] = certificates.length + 1;

        certificates.push(Certificate(cid, student, true, false));

        // add the new certificate id to the student's certificates ids array
        students[studentsIndexes[student] - 1].certsCIDs.push(cid);

        emit IssueCertificate(cid, student);
    }

    /**
     * @dev Checks a certificate's validity.
     * @param cid The certificate's CID to check its validity.
     * @return Whether the given certificate is valid or not.
     */
    function checkCertificateValidity(bytes32 cid) public view returns (bool) {
        require(
            certificatesIndexes[cid] != 0,
            "UNICERTS: CERTIFICATE_NOT_FOUND"
        );

        return (certificates[certificatesIndexes[cid] - 1].approved);
    }
}
