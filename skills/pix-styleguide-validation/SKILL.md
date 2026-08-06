---
name: rule-styleguide-validation
description: >-
  Use when validating international business data. Covers email, phone, VAT, tax IDs, postal codes, and national identification numbers for EU, UK, and US.
tags:
  - "validation"
  - "business-rules"
  - "international"
  - "vat"
  - "address"
  - "phone"
  - "tax-id"
  - "compliance"
  - "eu"
frameworks: [all]
---

# rule-styleguide-validation — Business Validation Patterns

## Table of Contents

1. [Email Validation](#1-email-validation)
2. [Phone Number Validation](#2-phone-number-validation)
3. [VAT Number Validation (EU + UK)](#3-vat-number-validation-eu--uk)
4. [Postal Code Validation](#4-postal-code-validation)
5. [Tax ID / National ID Patterns](#5-tax-id--national-id-patterns)
6. [Address Validation](#6-address-validation)
7. [Entity Validation by Country](#7-entity-validation-by-country)
8. [Validation Library Integration](#8-validation-library-integration)

---

## 1. Email Validation

### RFC-Conformant Regex

```regex
^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$
```

### Practical Validation (Zod)

```typescript
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(254, "Email must not exceed 254 characters")
  .email("Invalid email format")
  .transform((v) => v.toLowerCase().trim());
```

### Disposable Email Detection (pseudocode)

```typescript
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  // Load from https://github.com/disposable-email-domains/disposable-email-domains
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.includes(domain) : false;
}
```

---

## 2. Phone Number Validation

### International Format (E.164)

```regex
^\+[1-9]\d{1,14}$
```

### Per-Country Patterns

| Country   | Format              | Regex               | Example             |
| --------- | ------------------- | ------------------- | ------------------- |
| Italy     | `+39 XXX XXX XXXX`  | `^\+39\d{9,10}$`    | `+39 06 1234 5678`  |
| UK        | `+44 XXXX XXXXXX`   | `^\+44\d{10}$`      | `+44 20 7946 0958`  |
| US/CA     | `+1 XXX XXX XXXX`   | `^\+1\d{10}$`       | `+1 212 555 0198`   |
| Germany   | `+49 XXXX XXXXXX`   | `^\+49\d{10,11}$`   | `+49 30 123456`     |
| France    | `+33 X XX XX XX XX` | `^\+33\d{9}$`       | `+33 1 23 45 67 89` |
| Spain     | `+34 XXX XX XX XX`  | `^\+34\d{9}$`       | `+34 91 123 4567`   |
| Australia | `+61 X XXXX XXXX`   | `^\+61\d{9}$`       | `+61 2 1234 5678`   |
| Japan     | `+81 XX XXXX XXXX`  | `^\+81\d{9,10}$`    | `+81 3 1234 5678`   |
| Brazil    | `+55 XX XXXXX XXXX` | `^\+55\d{10,11}$`   | `+55 11 91234 5678` |
| India     | `+91 XXXXX XXXXX`   | `^\+91\d{10}$`      | `+91 98123 45678`   |
| Generic   | Any E.164 number    | `^\+[1-9]\d{6,14}$` | International       |

### Zod Schema

```typescript
import { z } from "zod";

const countryPhoneSchemas: Record<string, z.ZodString> = {
  IT: z.string().regex(/^\+39\d{9,10}$/, "Invalid Italian phone number"),
  GB: z.string().regex(/^\+44\d{10}$/, "Invalid UK phone number"),
  US: z.string().regex(/^\+1\d{10}$/, "Invalid US phone number"),
  DE: z.string().regex(/^\+49\d{10,11}$/, "Invalid German phone number"),
  FR: z.string().regex(/^\+33\d{9}$/, "Invalid French phone number"),
  ES: z.string().regex(/^\+34\d{9}$/, "Invalid Spanish phone number"),
  AU: z.string().regex(/^\+61\d{9}$/, "Invalid Australian phone number"),
  JP: z.string().regex(/^\+81\d{9,10}$/, "Invalid Japanese phone number"),
  BR: z.string().regex(/^\+55\d{10,11}$/, "Invalid Brazilian phone number"),
  IN: z.string().regex(/^\+91\d{10}$/, "Invalid Indian phone number"),
  INT: z.string().regex(/^\+[1-9]\d{6,14}$/, "Invalid international phone number"),
};

export function getPhoneSchema(countryCode: string): z.ZodString {
  return countryPhoneSchemas[countryCode] || countryPhoneSchemas.INT;
}
```

---

## 3. VAT Number Validation (EU + UK)

### EU VAT Format

| Country             | Format                                                    | Regex                 | Example          |
| ------------------- | --------------------------------------------------------- | --------------------- | ---------------- |
| Italy (IT)          | IT + 11 digits                                            | `^IT\d{11}$`          | `IT12345678901`  |
| UK (GB)             | GB + 9 digits or 12 chars                                 | `^GB(\d{9}            | \d{12}           | GD\d{3}       | HA\d{3})$` | `GB123456789` |
| Germany (DE)        | DE + 9 digits                                             | `^DE\d{9}$`           | `DE123456789`    |
| France (FR)         | FR + 11 chars (2 letters + 9 digits)                      | `^FR[A-Z]{2}\d{9}$`   | `FRAB123456789`  |
| Spain (ES)          | ES + 9 chars (1 letter + 8 digits or 8 digits + 1 letter) | `^ES([A-Z]\d{8}       | \d{8}[A-Z])$`    | `ESX12345678` |
| Netherlands (NL)    | NL + 12 chars (9 digits + B + 2 letters)                  | `^NL\d{9}B\d{2}$`     | `NL123456789B01` |
| Belgium (BE)        | BE + 10 digits                                            | `^BE\d{10}$`          | `BE0123456789`   |
| Austria (AT)        | AT + 9 digits (U prefix)                                  | `^ATU\d{8}$`          | `ATU12345678`    |
| Ireland (IE)        | IE + 8-9 chars                                            | `^IE\d{7}[A-Z]{1,2}$` | `IE1234567X`     |
| Portugal (PT)       | PT + 9 digits                                             | `^PT\d{9}$`           | `PT123456789`    |
| Denmark (DK)        | DK + 8 digits                                             | `^DK\d{8}$`           | `DK12345678`     |
| Sweden (SE)         | SE + 10 digits                                            | `^SE\d{10}$`          | `SE1234567890`   |
| Poland (PL)         | PL + 10 digits                                            | `^PL\d{10}$`          | `PL1234567890`   |
| Czech Republic (CZ) | CZ + 8-10 digits                                          | `^CZ\d{8,10}$`        | `CZ123456789`    |
| Hungary (HU)        | HU + 8 digits                                             | `^HU\d{8}$`           | `HU12345678`     |
| Romania (RO)        | RO + 2-10 digits                                          | `^RO\d{2,10}$`        | `RO123456789`    |
| Greece (EL)         | EL + 9 digits                                             | `^EL\d{9}$`           | `EL123456789`    |

### VAT Validation (Zod)

```typescript
import { z } from "zod";

const vatSchemas: Record<string, z.ZodString> = {
  IT: z.string().regex(/^IT\d{11}$/, "Invalid Italian VAT"),
  GB: z.string().regex(/^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, "Invalid UK VAT"),
  DE: z.string().regex(/^DE\d{9}$/, "Invalid German VAT"),
  FR: z.string().regex(/^FR[A-Z]{2}\d{9}$/, "Invalid French VAT"),
  ES: z.string().regex(/^ES([A-Z]\d{8}|\d{8}[A-Z])$/, "Invalid Spanish VAT"),
  NL: z.string().regex(/^NL\d{9}B\d{2}$/, "Invalid Dutch VAT"),
  BE: z.string().regex(/^BE\d{10}$/, "Invalid Belgian VAT"),
  AT: z.string().regex(/^ATU\d{8}$/, "Invalid Austrian VAT"),
  IE: z.string().regex(/^IE\d{7}[A-Z]{1,2}$/, "Invalid Irish VAT"),
  PT: z.string().regex(/^PT\d{9}$/, "Invalid Portuguese VAT"),
  DK: z.string().regex(/^DK\d{8}$/, "Invalid Danish VAT"),
  SE: z.string().regex(/^SE\d{10}$/, "Invalid Swedish VAT"),
  PL: z.string().regex(/^PL\d{10}$/, "Invalid Polish VAT"),
  CZ: z.string().regex(/^CZ\d{8,10}$/, "Invalid Czech VAT"),
  HU: z.string().regex(/^HU\d{8}$/, "Invalid Hungarian VAT"),
  RO: z.string().regex(/^RO\d{2,10}$/, "Invalid Romanian VAT"),
  EL: z.string().regex(/^EL\d{9}$/, "Invalid Greek VAT"),
};

export function getVatSchema(countryCode: string): z.ZodString {
  const schema = vatSchemas[countryCode];
  if (!schema) return z.string().min(1, "VAT number is required");
  return schema;
}

export function validateVat(vatNumber: string, countryCode: string): boolean {
  return getVatSchema(countryCode).safeParse(vatNumber).success;
}
```

### EU VIES Web Service (Production)

For production, validate VAT numbers against the EU VIES system:

```typescript
// https://ec.europa.eu/taxation_customs/vies/#/vat-validation
// SOAP API: https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
```

---

## 4. Postal Code Validation

### Per-Country Patterns

| Country     | Format                      | Regex                                | Example      |
| ----------- | --------------------------- | ------------------------------------ | ------------ |
| Italy       | 5 digits                    | `^\d{5}$`                            | `00100`      |
| UK          | Variable (outcode + incode) | `^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$` | `SW1A 1AA`   |
| US          | 5+4 digits                  | `^\d{5}(-\d{4})?$`                   | `10001-1234` |
| Canada      | A#A #A#                     | `^[A-Z]\d[A-Z] \d[A-Z]\d$`           | `K1A 0B1`    |
| Germany     | 5 digits                    | `^\d{5}$`                            | `10115`      |
| France      | 5 digits                    | `^\d{5}$`                            | `75001`      |
| Spain       | 5 digits                    | `^\d{5}$`                            | `28001`      |
| Australia   | 4 digits                    | `^\d{4}$`                            | `2000`       |
| Japan       | 3-4-4 format                | `^\d{3}-\d{4}$`                      | `100-0001`   |
| Brazil      | 8 digits (5-3)              | `^\d{5}-\d{3}$`                      | `01310-100`  |
| India       | 6 digits                    | `^\d{6}$`                            | `110001`     |
| Netherlands | 4 digits + 2 letters        | `^\d{4}[A-Z]{2}$`                    | `1012AB`     |
| Sweden      | 5 digits (3+2)              | `^\d{3} \d{2}$`                      | `111 20`     |
| Switzerland | 4 digits                    | `^\d{4}$`                            | `8001`       |

```typescript
export const postalCodeSchemas: Record<string, z.ZodString> = {
  IT: z.string().regex(/^\d{5}$/, "CAP must be 5 digits"),
  GB: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, "Invalid UK postcode"),
  US: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid US ZIP code"),
  CA: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/, "Invalid Canadian postal code"),
  DE: z.string().regex(/^\d{5}$/, "Invalid German PLZ"),
  FR: z.string().regex(/^\d{5}$/, "Invalid French postal code"),
  ES: z.string().regex(/^\d{5}$/, "Invalid Spanish postal code"),
  AU: z.string().regex(/^\d{4}$/, "Invalid Australian postcode"),
  JP: z.string().regex(/^\d{3}-\d{4}$/, "Invalid Japanese postal code"),
  BR: z.string().regex(/^\d{5}-\d{3}$/, "Invalid Brazilian CEP"),
  IN: z.string().regex(/^\d{6}$/, "Invalid Indian PIN code"),
  NL: z.string().regex(/^\d{4}[A-Z]{2}$/, "Invalid Dutch postal code"),
  SE: z.string().regex(/^\d{3} \d{2}$/, "Invalid Swedish postal code"),
  CH: z.string().regex(/^\d{4}$/, "Invalid Swiss postal code"),
  INT: z.string().min(1).max(10),
};
```

---

## 5. Tax ID / National ID Patterns

### Per-Country Tax IDs

| Country          | Name                       | Format                 | Regex                                      |
| ---------------- | -------------------------- | ---------------------- | ------------------------------------------ |
| Italy (person)   | Codice Fiscale             | 16 chars               | `^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$` |
| Italy (company)  | Partita IVA                | 11 digits              | `^\d{11}$`                                 |
| UK               | Unique Taxpayer Ref        | 10 digits              | `^\d{10}$`                                 |
| US               | EIN                        | 9 digits (XX-XXXXXXX)  | `^\d{2}-\d{7}$`                            |
| US               | SSN                        | 9 digits (XXX-XX-XXXX) | `^\d{3}-\d{2}-\d{4}$`                      |
| Germany          | Steuer-ID                  | 11 digits              | `^\d{11}$`                                 |
| France           | Numéro de Sécurité Sociale | 15 digits              | `^\d{15}$`                                 |
| Spain            | NIF/NIE                    | 9 chars                | `^[XYZ\d]\d{7}[A-Z]$`                      |
| Canada           | SIN                        | 9 digits (XXX-XXX-XXX) | `^\d{3}-\d{3}-\d{3}$`                      |
| Australia        | TFN                        | 8-9 digits             | `^\d{8,9}$`                                |
| Japan            | My Number                  | 12 digits              | `^\d{12}$`                                 |
| Brazil           | CPF                        | 11 digits              | `^\d{3}\.\d{3}\.\d{3}-\d{2}$`              |
| Brazil (company) | CNPJ                       | 14 digits              | `^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$`        |
| India            | PAN                        | 10 chars               | `^[A-Z]{5}\d{4}[A-Z]$`                     |
| India            | Aadhaar                    | 12 digits              | `^\d{12}$`                                 |

### Italian Codice Fiscale — Checksum Verification

```typescript
// Italian CF uses DPR 396/1974 algorithm
const CF_ODD = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

const CF_EVEN = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
};

export function validateItalianCF(cf: string): boolean {
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) return false;
  const chars = cf.split("");
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = chars[i];
    const map = i % 2 === 0 ? CF_ODD : CF_EVEN;
    sum += map[c] ?? 0;
  }
  const expected = String.fromCharCode(65 + (sum % 26));
  return chars[15] === expected;
}
```

---

## 6. Address Validation

### International Address Schema

```typescript
import { z } from "zod";

export const addressSchema = z.object({
  street: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  province: z.string().max(100).optional().default(""),
  country: z.string().length(2, "Country must be ISO 3166-1 alpha-2"),
});
```

### ISO 3166-1 Alpha-2 Country Codes

```typescript
export const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
];

export const COUNTRIES = [
  { code: "IT", name: "Italy", locale: "it-IT" },
  { code: "GB", name: "United Kingdom", locale: "en-GB" },
  { code: "US", name: "United States", locale: "en-US" },
  { code: "DE", name: "Germany", locale: "de-DE" },
  { code: "FR", name: "France", locale: "fr-FR" },
  { code: "ES", name: "Spain", locale: "es-ES" },
  { code: "NL", name: "Netherlands", locale: "nl-NL" },
  { code: "BE", name: "Belgium", locale: "nl-BE" },
  { code: "AT", name: "Austria", locale: "de-AT" },
  { code: "IE", name: "Ireland", locale: "en-IE" },
  { code: "PT", name: "Portugal", locale: "pt-PT" },
  { code: "DK", name: "Denmark", locale: "da-DK" },
  { code: "SE", name: "Sweden", locale: "sv-SE" },
  { code: "PL", name: "Poland", locale: "pl-PL" },
  { code: "CZ", name: "Czech Republic", locale: "cs-CZ" },
  { code: "HU", name: "Hungary", locale: "hu-HU" },
  { code: "RO", name: "Romania", locale: "ro-RO" },
  { code: "EL", name: "Greece", locale: "el-GR" },
  { code: "CH", name: "Switzerland", locale: "de-CH" },
  { code: "NO", name: "Norway", locale: "nb-NO" },
  { code: "CA", name: "Canada", locale: "en-CA" },
  { code: "AU", name: "Australia", locale: "en-AU" },
  { code: "JP", name: "Japan", locale: "ja-JP" },
  { code: "BR", name: "Brazil", locale: "pt-BR" },
  { code: "IN", name: "India", locale: "en-IN" },
  // Add more as needed
];

export function getCountryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}
```

---

## 7. Entity Validation by Country

### Complete Company Validation (Italy)

```typescript
import { z } from "zod";
import { getVatSchema } from "../vat";
import { postalCodeSchemas } from "../postal";
import { validateItalianCF } from "../cf";

export const italianCompanySchema = z
  .object({
    companyName: z.string().min(1, "Company name required").max(255),
    vatNumber: z.string().regex(/^\d{11}$/, "Partita IVA must be 11 digits"),
    taxCode: z.string().length(16).refine(validateItalianCF, "Invalid Codice Fiscale"),
    sdiCode: z.string().regex(/^[A-Z0-9]{7}$/, "SDI must be 7 alphanumeric chars"),
    pec: z.string().email("Invalid PEC email").optional(),
    address: z.object({
      street: z.string().min(1).max(60),
      city: z.string().min(1).max(60),
      postalCode: postalCodeSchemas.IT,
      province: z.string().length(2, "Province must be 2 letters"),
      country: z.literal("IT"),
    }),
  })
  .refine((data) => data.pec || data.sdiCode, { message: "Either PEC or SDI code is required" });
```

### Complete Company Validation (UK)

```typescript
export const ukCompanySchema = z.object({
  companyName: z.string().min(1).max(255),
  companyNumber: z.string().regex(/^\d{8}$/, "Company number must be 8 digits"),
  vatNumber: z
    .string()
    .regex(/^GB(\d{9}|\d{12})$/, "Invalid UK VAT")
    .optional(),
  address: z.object({
    street: z.string().min(1).max(100),
    city: z.string().min(1).max(100),
    postalCode: postalCodeSchemas.GB,
    country: z.literal("GB"),
  }),
});
```

### Complete Company Validation (US)

```typescript
export const usCompanySchema = z.object({
  companyName: z.string().min(1).max(255),
  ein: z.string().regex(/^\d{2}-\d{7}$/, "EIN must be XX-XXXXXXX"),
  address: z.object({
    street: z.string().min(1).max(100),
    city: z.string().min(1).max(100),
    state: z.string().length(2, "State must be 2-letter code"),
    postalCode: postalCodeSchemas.US,
    country: z.literal("US"),
  }),
});
```

---

## 8. Validation Library Integration

### Zod (TypeScript — Frontend + Backend)

```bash
pnpm add zod
```

```typescript
import { z } from "zod";
```

### Joi (Node.js Backend)

```bash
pnpm add joi
```

```javascript
import Joi from "joi";
const schema = Joi.object({ email: Joi.string().email().required() });
```

### Yup (React Native compatible)

```bash
pnpm add yup
```

```javascript
import * as yup from "yup";
const schema = yup.object({ email: yup.string().email().required() });
```

### Class-validator (NestJS)

```bash
pnpm add class-validator class-transformer
```

```typescript
import { IsEmail, IsString, MinLength } from "class-validator";
export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
}
```

## See also

- [rule-frontend-react](../rule-frontend-react/SKILL.md) — React implementation
- [rule-backend-node](../rule-backend-node/SKILL.md) — Backend validation
- [rule](../rule/SKILL.md) — Central skill index
