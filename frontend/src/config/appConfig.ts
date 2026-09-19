/**
 * Enterprise Application Configuration
 * 
 * Controls feature flags and service parameters for Cheque Scanner App.
 */

export interface AppConfig {
  /**
   * EXTRACTION_ENABLED: "Y" | "N"
   * - "Y": Runs OCR field extraction (Amount, Date, Payee, Bank) during cheque scanning and displays the "Advanced" details button.
   * - "N": Skips extraction, displays scan MICR results immediately, and hides the "Advanced" check details button.
   */
  EXTRACTION_ENABLED: "Y" | "N";

  /**
   * SIGNATURE_VALIDATION_ENABLED: "Y" | "N"
   * - "Y": Enables signature cropping, specimen matching, and Mandate Verification modal.
   * - "N": Disables signature validation features.
   */
  SIGNATURE_VALIDATION_ENABLED: "Y" | "N";

  /**
   * MICR_PARSER_FORMAT: "STANDARD" | "SIERRA_LEONE"
   * - "STANDARD": Standard 4-component MICR (Cheque No, Routing No, Account No, Bank/Transit Code) used in Ghana / International banks.
   * - "SIERRA_LEONE": Sierra Leone Bank format (e.g. Rokel Commercial Bank / RC Bank SL):
   *    Component 1: Cheque Number (e.g. 03254101)
   *    Component 2: 10-digit Sort Code [Country (2) + Bank (3) + State (2) + Branch (3)]
   *    Component 3: Core Account Number (Full Account No = Bank Code + Branch Code + Component 3)
   *    Component 4: Transaction Code (e.g. 0292582)
   */
  MICR_PARSER_FORMAT: "STANDARD" | "SIERRA_LEONE";

  /**
   * Future options (e.g. IP addresses, DB connections, API URLs, timeouts)
   */
  API_BASE_URL?: string;
  OCR_SERVICE_URL?: string;
  SIGNATURE_SERVICE_URL?: string;
  EXTERNAL_IMAGING_API_BASE_URL: string;
}

export type MicrParserFormat = "STANDARD" | "SIERRA_LEONE";

export const appConfig: AppConfig = {
  EXTRACTION_ENABLED: "Y",
  SIGNATURE_VALIDATION_ENABLED: "Y",
  MICR_PARSER_FORMAT: "SIERRA_LEONE", // Set to "SIERRA_LEONE" for RC Bank SL, or "STANDARD" for standard/Ghana banks
  API_BASE_URL: import.meta.env.VITE_SCANNER_API_URL || "http://localhost:5042/api/scanner",
  OCR_SERVICE_URL: import.meta.env.VITE_PYTHON_SERVICE_URL || "http://127.0.0.1:8130",
  SIGNATURE_SERVICE_URL: import.meta.env.VITE_PYTHON_SERVICE_URL || "http://127.0.0.1:8130",
  EXTERNAL_IMAGING_API_BASE_URL: import.meta.env.VITE_EXTERNAL_IMAGING_API_BASE_URL || "http://10.203.14.169",
};
