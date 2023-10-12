
# Unicerts

[![Tests](https://github.com/jihed-chalghaf/unicerts/workflows/tests/badge.svg)](https://github.com/jihed-chalghaf/unicerts/actions/workflows/tests.yml)
[![cov](https://jihed-chalghaf.github.io/unicerts/badges/coverage.svg)](https://github.com/jihed-chalghaf/unicerts/actions)

## ☆ Overview

A smart contract that manages issuing & verifying university certificates, built on the Ethereum Blockchain using Solidity.

```yaml
⸻⸻⸻⸻⸻⸻⸻⮞ Unicerts properties ⮜⸻⸻⸻⸻⸻⸻⸻

- supports_adding_students:
    enabled?: true
    requirement: "not callable by admin"
- supports_retrieving_students:
    enabled?: true
    types:
        getStudent: "a student can only get his own data"
        getStudents: "only callable by admin"
- supports_retrieving_certificates:
    enabled?: true
    types:
        getCertificate: "called by anyone"
        getCertificates: "only callable by admin"
        getStudentCertificates: "only callable by admin or the concerned student"
- supports_requesting_certificates:
    enabled?: true
    requirements:
        1: "only callable by students"
        2: "cert should not be already registered"
- supports_reviewing_certificates:
    enabled?: true
    requirements:
        1: "only callable by admin"
        2: "cert should be already registered and pending"
- supports_issuing_certificates:
    enabled?: true
    requirements:
        1: "only callable by admin"
        2: "student should exist"
        3: "cert should not be already registered"
- supports_checking_certificates_validities:
    enabled?: true
    requirements: "cert should be already registered"
```

## ❄ Testing and Development

### 1. Clone the Project
```bash
$  git  clone  https://github.com/jihed-chalghaf/unicerts.git
$  cd  unicerts
```

The following assumes the use of `node@>=16`.

### 2. Install Dependencies

```bash
$  npm  install  -g  yarn
$  yarn
```

### 3. Compile Contracts

```bash
$  yarn  compile
```

### 4. Test Contracts

```bash
# Option 1: Run tests
$  yarn  test
# Option 2: Run tests and get a coverage report
$  yarn  coverage
```
You can set env variables `REPORT_GAS` & `COINMARKETCAP_API_KEY` to enable gas usage reports.

### 5. Run Vulnerability Analysis Tool

```bash
$ yarn analyze
```