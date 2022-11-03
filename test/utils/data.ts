import { Certificate, Student } from "./models";
import { ethers } from "hardhat";

export async function loadStudents() {
  let students: Student[] = [];

  const [deployer, acc1, acc2, ...accounts] = await ethers.getSigners();

  let student1 = new Student(
    acc1.address,
    "Jihed",
    "Chalghaf",
    "chalghaf.jihed@gmail.com",
    "Software Engineering",
    "01/15/1997",
    "Tunis",
    "12345678",
    "1234567"
  );
  let student2 = new Student(
    acc2.address,
    "John",
    "Doe",
    "johndoe@gmail.com",
    "Software Engineering",
    "02/14/1999",
    "Toronto",
    "87654321",
    "7654321"
  );

  students.push(student1, student2);

  return students;
}

export async function loadCertificates() {
  let certs: Certificate[] = [];

  const [deployer, acc1, acc2, ...accounts] = await ethers.getSigners();

  let cert1 = new Certificate(
    "Graduation",
    acc1.address,
    deployer.address,
    "20/21",
    "With Honors",
    1667488818
  );
  let cert2 = new Certificate(
    "Transcript",
    acc2.address,
    deployer.address,
    "20/21",
    "{MATH: '17', BI: '16', CyberSecurity: '18'}",
    1667488830
  );

  certs.push(cert1, cert2);

  return certs;
}
