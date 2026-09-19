import { appConfig, MicrParserFormat } from "@/config/appConfig";

export interface ParsedMicr {
  checkNumber: string;
  routingNumber: string;
  accountNumber: string;
  bankCode: string;
  countryCode?: string;
  stateCode?: string;
  branchCode?: string;
  transactionCode?: string;
  rawMicr: string;
}

/**
 * Universal MICR Parser supporting both Standard and Sierra Leone (RC Bank) formats.
 * 
 * @param rawMicr Raw optical MICR string from scanner
 * @param format Optional format override ("STANDARD" | "SIERRA_LEONE")
 */
export function parseMicr(rawMicr?: string, format?: MicrParserFormat): ParsedMicr {
  const activeFormat = format || appConfig.MICR_PARSER_FORMAT || "STANDARD";
  
  if (!rawMicr || !rawMicr.trim()) {
    return {
      checkNumber: "",
      routingNumber: "",
      accountNumber: "",
      bankCode: "",
      rawMicr: rawMicr || ""
    };
  }

  const clean = rawMicr.trim();

  // SIERRA LEONE BANK MICR FORMAT (e.g. RC Bank Sierra Leone)
  if (activeFormat === "SIERRA_LEONE") {
    return parseSierraLeoneMicr(clean);
  }

  // STANDARD / GHANA / INTERNATIONAL FORMAT
  return parseStandardMicr(clean);
}

/**
 * Sierra Leone MICR Specification:
 * - 4 Components:
 *   1. Cheque Number (e.g. 03254101)
 *   2. 10-digit Sort Code:
 *      - Digits 1-2: Country Code (e.g. 05)
 *      - Digits 3-5: Bank Code (e.g. 002)
 *      - Digits 6-7: State Code (e.g. 00)
 *      - Digits 8-10: Bank Branch Code (e.g. 004)
 *   3. Core Account Number (e.g. 002540080219)
 *      - Full Account Number = Bank Code (pos 3..5) + Branch Code (pos 8..10) + Component 3
 *        e.g. 002 + 004 + 002540080219 = 002004002540080219
 *   4. Transaction Code (e.g. 0292582)
 */
function parseSierraLeoneMicr(clean: string): ParsedMicr {
  let checkNumber = "";
  let routingNumber = "";
  let accountNumber = "";
  let bankCode = "";
  let countryCode = "";
  let stateCode = "";
  let branchCode = "";
  let transactionCode = "";

  // Split by non-alphanumeric characters (U, T, $, c, d, spaces, dashes)
  const blocks = clean.split(/[^0-9]+/).filter(b => b.length > 0);

  if (blocks.length >= 3) {
    // 1. Cheque Number (Component 1)
    checkNumber = blocks[0];

    // 2. Second Component: 10-digit Sort Code
    const sortCodeBlock = blocks[1];
    routingNumber = sortCodeBlock;

    if (sortCodeBlock.length >= 10) {
      countryCode = sortCodeBlock.substring(0, 2);
      bankCode = sortCodeBlock.substring(2, 5);
      stateCode = sortCodeBlock.substring(5, 7);
      branchCode = sortCodeBlock.substring(7, 10);
    } else if (sortCodeBlock.length >= 5) {
      countryCode = sortCodeBlock.substring(0, 2);
      bankCode = sortCodeBlock.substring(2, 5);
      if (sortCodeBlock.length > 5) {
        branchCode = sortCodeBlock.substring(5);
      }
    } else {
      bankCode = sortCodeBlock;
    }

    // 3. Third Component: Core Account Number + Prepend (Bank Code + Branch Code)
    const coreAccount = blocks[2];
    if (bankCode || branchCode) {
      accountNumber = `${bankCode}${branchCode}${coreAccount}`;
    } else {
      accountNumber = coreAccount;
    }

    // 4. Fourth Component: Transaction Code (if present)
    if (blocks.length >= 4) {
      transactionCode = blocks[3];
    }
  } else if (blocks.length === 2) {
    checkNumber = blocks[0];
    accountNumber = blocks[1];
  } else if (blocks.length === 1) {
    accountNumber = blocks[0];
  }

  // Fallback: Check if string has explicit delimiters (T and U)
  if (!accountNumber && clean.includes("T")) {
    const tIdx = clean.indexOf("T");
    const beforeT = clean.substring(0, tIdx).replace(/[^0-9]/g, " ").trim().split(/\s+/).filter(Boolean);
    const afterT = clean.substring(tIdx + 1).replace(/[^0-9]/g, " ").trim().split(/\s+/).filter(Boolean);

    if (beforeT.length >= 2) {
      checkNumber = beforeT[0];
      const sort = beforeT[1];
      routingNumber = sort;
      if (sort.length >= 10) {
        countryCode = sort.substring(0, 2);
        bankCode = sort.substring(2, 5);
        stateCode = sort.substring(5, 7);
        branchCode = sort.substring(7, 10);
      }
    }

    if (afterT.length >= 1) {
      const coreAcc = afterT[0];
      accountNumber = `${bankCode}${branchCode}${coreAcc}`;
      if (afterT.length >= 2) {
        transactionCode = afterT[1];
      }
    }
  }

  return {
    checkNumber,
    routingNumber,
    accountNumber,
    bankCode,
    countryCode,
    stateCode,
    branchCode,
    transactionCode,
    rawMicr: clean
  };
}

/**
 * Standard / Ghana / International MICR Parser
 * - Component 1: Cheque Number (typically 6 digits)
 * - Component 2: Routing Transit Number (typically 6 digits)
 * - Component 3: Account Number (typically 12-13 digits)
 * - Component 4: Bank Code / Transaction Code (typically 2-3 digits)
 */
function parseStandardMicr(clean: string): ParsedMicr {
  let checkNumber = "";
  let routingNumber = "";
  let accountNumber = "";
  let bankCode = "";

  const tIdx = clean.indexOf("T");
  const uIdx = clean.lastIndexOf("U");

  // 1. Account Number & Bank Code (Section between T and U / after U)
  if (tIdx >= 0 && uIdx > tIdx) {
    const betweenTU = clean.substring(tIdx + 1, uIdx).trim();
    const afterU = clean.substring(uIdx + 1).trim();

    const digitsBetween = betweenTU.replace(/[^0-9?]+/g, "");
    if (digitsBetween.includes("?")) {
      accountNumber = digitsBetween.replace(/\?/g, "1").replace(/\D/g, "");
    } else {
      accountNumber = betweenTU.replace(/\D/g, "");
    }

    bankCode = afterU.replace(/\D/g, "");
  } else if (tIdx >= 0) {
    const afterT = clean.substring(tIdx + 1);
    const afterBlocks = afterT.split(/[^0-9]+/).filter(Boolean);
    if (afterBlocks.length >= 1) {
      accountNumber = afterBlocks[0];
      if (afterBlocks.length >= 2) {
        bankCode = afterBlocks[1];
      }
    }
  }

  // 2. Check Number & Routing Number (Section before T)
  if (tIdx >= 0) {
    const beforeT = clean.substring(0, tIdx);
    const digitBlocks = beforeT.split(/[^0-9]+/).filter(Boolean);
    if (digitBlocks.length >= 1) {
      routingNumber = digitBlocks[digitBlocks.length - 1];
      if (digitBlocks.length > 1) {
        checkNumber = digitBlocks.slice(0, digitBlocks.length - 1).join("");
      } else if (routingNumber.length > 6) {
        checkNumber = routingNumber.substring(0, routingNumber.length - 6);
        routingNumber = routingNumber.substring(routingNumber.length - 6);
      }
    }
  } else {
    const allParts = clean.split(/[^0-9]+/).filter(Boolean);
    if (allParts.length >= 4) {
      checkNumber = allParts[0];
      routingNumber = allParts[1];
      accountNumber = allParts[2];
      bankCode = allParts[3];
    } else if (allParts.length === 3) {
      checkNumber = allParts[0];
      routingNumber = allParts[1];
      accountNumber = allParts[2];
    } else if (allParts.length === 2) {
      checkNumber = allParts[0];
      accountNumber = allParts[1];
    } else if (allParts.length === 1) {
      accountNumber = allParts[0];
    }
  }

  // In Standard format: Component 4 is Transaction Code; Bank code is part of the routing code but cannot be uniformly isolated
  const transactionCode = bankCode; // 4th component

  return {
    checkNumber,
    routingNumber,
    accountNumber,
    bankCode: "", // Bank code is embedded within routingNumber in standard format
    transactionCode,
    rawMicr: clean
  };
}
