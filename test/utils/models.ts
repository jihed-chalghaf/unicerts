import { utils } from "ethers";

// const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$/;

function isValidDate(date: string) {
  // Assumes date is "mm/dd/yyyy"
  if (!/^\d\d\/\d\d\/\d\d\d\d$/.test(date)) {
    return false;
  }

  const [mm, dd, yyyy] = date.split("/").map((p) => parseInt(p));
  const d = new Date(yyyy, mm, dd);

  return d.getMonth() === mm && d.getDate() === dd && d.getFullYear() === yyyy;
}

export class Student {
  addr: string;
  firstName: string;
  lastName: string;
  email: string;
  speciality: string;
  birthDate: string;
  birthPlace: string;
  nin: string;
  sid: string;

  constructor(
    addr: string,
    firstName: string,
    lastName: string,
    email: string,
    speciality: string,
    birthDate: string,
    birthPlace: string,
    nin: string,
    sid: string
  ) {
    if (!isValidDate(birthDate)) {
      throw new Error("Invalid date (format: MM/DD/YYYY)");
    }
    this.addr = addr;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.speciality = speciality;
    this.birthDate = birthDate;
    this.birthPlace = birthPlace;
    this.nin = nin;
    this.sid = sid;
  }
}

const CATEGORIES = [
  "Transcript",
  "Participation",
  "Attendance",
  "Achievement",
  "Graduation",
  "Inscription",
];

export class Certificate {
  id: string;
  category: string;
  owner: string;
  issuer: string;
  academicYear: string;
  hashedData: string;
  issuedAt: number;

  constructor(
    category: string,
    owner: string,
    issuer: string,
    academicYear: string,
    data: string,
    issuedAt: number
  ) {
    if (!CATEGORIES.includes(category)) throw new Error("Invalid Category");
    this.category = category;
    this.owner = owner;
    this.issuer = issuer;
    this.academicYear = academicYear;
    this.hashedData = utils.id(data); // utils.solidityKeccak256(["string"], [data]);
    this.issuedAt = issuedAt;
    this.id = utils.solidityKeccak256(
      ["string", "address", "address", "string", "string", "uint256"],
      [category, owner, issuer, academicYear, this.hashedData, issuedAt]
    );
  }
}
