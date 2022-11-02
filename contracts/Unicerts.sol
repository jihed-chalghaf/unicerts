// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Unicerts {
    struct Certificate {
        bytes32 id;
        string category;
        address owner;
        address issuer;
        string academicYear;
        bytes32 hashedData; // this attribute will be used only in the case of transcripts
        bool approved; // if it's resulting from a student's request, it must be validated by the admin
        bool pending;
        uint256 issuedAt; // timestamps format
    }

    struct Student {
        address addr;
        string firstName;
        string lastName;
        string email;
        string speciality;
        string birthDate;
        string birthPlace;
        string nin; // national identification number
        string sid; // student identification number
        bytes32[] certificates;
    }

    mapping(address => uint256) private studentsIndexes;
    mapping(bytes32 => uint256) private certificatesIndexes;

    Student[] private students;
    Certificate[] private certificates;

    bytes32[6] public CATEGORIES = [
        keccak256(abi.encodePacked("Transcript")),
        keccak256(abi.encodePacked("Participation")),
        keccak256(abi.encodePacked("Attendance")),
        keccak256(abi.encodePacked("Achievement")),
        keccak256(abi.encodePacked("Graduation")),
        keccak256(abi.encodePacked("Inscription"))
    ];

    // should be someone trustworthy from the university's administration
    address public admin;

    constructor() {
        admin = msg.sender; // specifiy the admin when deploying the contract;
    }

    // ⸻⸻⮞ Events ⮜⸻⸻
    event RequestCertificate(
        address student,
        string category,
        string academicYear
    );
    event IssueCertificate(
        bytes32 id,
        address student,
        string category,
        string academicYear
    );
    event ReviewCertificate(bytes32 id, bool approve);
    event AddStudent(address addr, string nin, string sid);

    // ⸻⸻⮞ Modifiers ⮜⸻⸻
    modifier onlyAdmin() {
        require(msg.sender == admin, "UNIPAPERS: ONLY_ADMIN");
        _;
    }

    modifier onlyStudent() {
        require(
            studentsIndexes[msg.sender] != 0,
            "UNIPAPERS: STUDENT_NOT_FOUND"
        );
        _;
    }

    modifier validCategory(string memory category) {
        bytes32 categoryHashBytes = keccak256(abi.encodePacked(category));

        require(
            categoryHashBytes == CATEGORIES[0] ||
                categoryHashBytes == CATEGORIES[1] ||
                categoryHashBytes == CATEGORIES[2] ||
                categoryHashBytes == CATEGORIES[3] ||
                categoryHashBytes == CATEGORIES[4] ||
                categoryHashBytes == CATEGORIES[5],
            "UNIPAPERS: INVALID_CATEGORY"
        );
        _;
    }

    // ⸻⸻⮞ Getters ⮜⸻⸻
    function getCertificate(bytes32 certificateId)
        public
        view
        returns (Certificate memory)
    {
        require(
            certificatesIndexes[certificateId] != 0,
            "UNIPAPERS: CERTIFICATE_NOT_FOUND"
        );

        return certificates[certificatesIndexes[certificateId] - 1];
    }

    function getStudent(address studentAddr)
        public
        view
        returns (Student memory)
    {
        require(
            studentsIndexes[studentAddr] != 0,
            "UNIPAPERS: STUDENT_NOT_FOUND"
        );

        return students[studentsIndexes[studentAddr] - 1];
    }

    function isStudent() public view returns (bool) {
        return studentsIndexes[msg.sender] != 0;
    }

    function isAdmin() public view returns (bool) {
        return msg.sender == admin;
    }

    function getStudents() public view onlyAdmin returns (Student[] memory) {
        return students;
    }

    function getCertificates()
        public
        view
        onlyAdmin
        returns (Certificate[] memory)
    {
        return certificates;
    }

    function getStudentCertificates(address studentId)
        public
        view
        returns (Certificate[] memory)
    {
        require(
            msg.sender == studentId || msg.sender == admin,
            "UNIPAPERS: ONLY_VALID_STUDENT_OR_ADMIN"
        );
        require(
            studentsIndexes[studentId] != 0,
            "UNIPAPERS: STUDENT_NOT_FOUND"
        );

        bytes32[] memory certificatesIds = students[
            studentsIndexes[studentId] - 1
        ].certificates;

        Certificate[] memory studentCertificates = new Certificate[](
            certificatesIds.length
        );

        for (uint256 i = 0; i < certificatesIds.length; i++) {
            studentCertificates[i] = certificates[
                certificatesIndexes[certificatesIds[i]] - 1
            ];
        }

        return studentCertificates;
    }

    // returns certificates that share the provided category
    function getCertificatesByCategory(string memory category)
        public
        view
        onlyAdmin
        validCategory(category)
        returns (Certificate[] memory)
    {
        Certificate[] memory _certificates;
        uint256 j = 0;

        for (uint256 i = 0; i < certificates.length; i++) {
            if (
                keccak256(abi.encodePacked(certificates[i].category)) ==
                keccak256(abi.encodePacked(category))
            ) {
                _certificates[j++] = certificates[i];
            }
        }

        return _certificates;
    }

    // ⸻⸻⮞ Logic Operations ⮜⸻⸻
    function addStudent(
        string memory firstName,
        string memory lastName,
        string memory email,
        string memory speciality,
        string memory birthDate,
        string memory birthPlace,
        string memory nin,
        string memory sid,
        bytes32[] memory certs
    ) public {
        require(
            studentsIndexes[msg.sender] == 0,
            "UNIPAPERS: STUDENT_ALREADY_EXISTS"
        );
        require(
            msg.sender != admin,
            "UNIPAPERS: ADMIN_CANNOT_ENTROLL_AS_A_STUDENT"
        );

        studentsIndexes[msg.sender] = students.length + 1;

        students.push(
            Student(
                msg.sender,
                firstName,
                lastName,
                email,
                speciality,
                birthDate,
                birthPlace,
                nin,
                sid,
                certs
            )
        );

        emit AddStudent(msg.sender, nin, sid);
    }

    function requestCertificate(
        string memory category,
        string memory academicYear,
        bytes32 hashedData,
        uint256 issuedAt
    ) public onlyStudent validCategory(category) {
        // generate a unique hash identifier for each certificate
        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                admin,
                category,
                academicYear,
                hashedData,
                issuedAt
            )
        );

        certificatesIndexes[id] = certificates.length + 1;
        certificates.push(
            Certificate(
                id,
                category,
                msg.sender,
                admin,
                academicYear,
                hashedData,
                false,
                true,
                issuedAt
            )
        );

        emit RequestCertificate(msg.sender, category, academicYear);
    }

    // reviewCertificate() => when a student requests a certificate, the admin will call this function to approve/deny it
    function reviewCertificate(bytes32 id, bool approve) public onlyAdmin {
        require(
            certificatesIndexes[id] != 0,
            "UNIPAPERS: CERTIFICATE_REQUEST_DOES_NOT_EXIST"
        );
        require(
            certificates[certificatesIndexes[id] - 1].pending,
            "UNIPAPERS: CERTIFICATE_IS_NOT_PENDING"
        );

        certificates[certificatesIndexes[id] - 1].approved = approve;
        certificates[certificatesIndexes[id] - 1].pending = false;

        // get the student (owner) address
        address studentAddr = certificates[certificatesIndexes[id] - 1].owner;

        // add the new certificate id to the student's certificates ids array
        students[studentsIndexes[studentAddr] - 1].certificates.push(id);

        emit ReviewCertificate(id, approve);
    }

    // issueCertificate() => when the admin issues the certificate without the student's request
    function issueCertificate(
        address student,
        string memory category,
        string memory academicYear,
        bytes32 hashedData,
        uint256 issuedAt
    ) public onlyAdmin {
        require(studentsIndexes[student] != 0, "UNIPAPERS: STUDENT_NOT_FOUND");

        // generate a unique hash identifier for each certificate
        bytes32 id = keccak256(
            abi.encodePacked(
                student,
                admin,
                category,
                academicYear,
                hashedData,
                issuedAt
            )
        );

        certificatesIndexes[id] = certificates.length + 1;

        certificates.push(
            Certificate(
                id,
                category,
                student,
                admin,
                academicYear,
                hashedData,
                true,
                false,
                issuedAt
            )
        );
        // add the new certificate id to the student's certificates ids array
        students[studentsIndexes[student] - 1].certificates.push(id);

        emit IssueCertificate(id, student, category, academicYear);
    }

    function checkCertificateValidity(Certificate memory certificate)
        public
        view
        returns (bool)
    {
        require(
            certificatesIndexes[certificate.id] != 0,
            "UNIPAPERS: CERTIFICATE_NOT_FOUND"
        );

        Certificate storage storedCertificate = certificates[
            certificatesIndexes[certificate.id] - 1
        ];
        bool valid_hash = true;

        if (certificate.hashedData != 0x0) {
            valid_hash = certificate.hashedData == storedCertificate.hashedData;
        }

        return
            (keccak256(abi.encodePacked(certificate.category)) ==
                keccak256(abi.encodePacked((storedCertificate.category))) &&
                certificate.owner == storedCertificate.owner &&
                certificate.issuer == storedCertificate.issuer &&
                keccak256(abi.encodePacked(certificate.academicYear)) ==
                keccak256(abi.encodePacked(storedCertificate.academicYear)) &&
                certificate.issuedAt == storedCertificate.issuedAt &&
                certificate.hashedData == storedCertificate.hashedData &&
                certificate.approved == storedCertificate.approved) &&
            valid_hash;
    }
}
