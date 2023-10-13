// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.18;

contract Unicerts {
    struct Certificate {
        // the certificate's CID on IPFS, where it holds the certificate's full data
        bytes32 cid;
        // the address of the student who owns the certificate
        address studentAddr;
        // represents whether the certificate is approved by the admin
        bool approved;
        // represents whether the certificate is still pending for review
        bool pending;
    }

    struct Student {
        // the student's address
        address addr;
        // the student's CID on IPFS, where it holds the student's full data
        bytes32 cid;
        // an array containing the CIDs of the certificates issued to/requested by the student
        bytes32[] certsCIDs;
    }

    // returns the student's index, icremented by one, in the students array for the given student address
    // example: studentsIndexes[EXAMPLE_ADDRESS] = N
    // if N = 0 -> there's no student stored in students array with the given EXAMPLE_ADDRESS
    // if N > 0 -> the student is stored at students[N - 1]
    mapping(address => uint256) private studentsIndexes;
    // returns the certificate's index, icremented by one, in the certificates array for the given certificate's CID
    // example: certificatesIndexes[EXAMPLE_CERT_CID] = N
    // if N = 0 -> there's no certificate stored in certificates array with the given EXAMPLE_CERT_CID
    // if N > 0 -> the certificate is stored at certificates[N - 1]
    mapping(bytes32 => uint256) private certificatesIndexes;

    // array containing the students added to the contract
    Student[] private students;
    // array containing the certificates issued/reviewed by the contract
    Certificate[] private certificates;

    // the admin's address, should be someone trustworthy from the university's administration
    address public immutable admin;

    constructor() {
        admin = msg.sender;
    }

    // ⸻⸻⮞ Events ⮜⸻⸻
    event RequestCertificate(address studentAddr, bytes32 certCid);
    event IssueCertificate(bytes32 certCid, address studentAddr);
    event ReviewCertificate(bytes32 certCid, bool approve);
    event AddStudent(address studentAddr, bytes32 studentCid);

    // ⸻⸻⮞ Modifiers ⮜⸻⸻
    /// @dev Prevents calling a function from anyone except the admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "UNICERTS: ONLY_ADMIN");
        _;
    }

    /// @dev Prevents calling a function from anyone except registered students
    modifier onlyStudent() {
        require(studentsIndexes[msg.sender] != 0, "UNICERTS: ONLY_STUDENT");
        _;
    }

    // ⸻⸻⮞ Getters ⮜⸻⸻
    /**
     * @dev Returns a certificate's details.
     * @param cid The certificate's id to retrieve.
     */
    function getCertificate(
        bytes32 cid
    ) public view returns (Certificate memory) {
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
    function getStudent(
        address studentAddr
    ) public view returns (Student memory) {
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
    function getStudentCertificates(
        address studentAddr
    ) public view returns (Certificate[] memory) {
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

        bytes32[] memory certs = new bytes32[](0);
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
