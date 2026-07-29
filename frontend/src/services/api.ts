import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:5042/api/scanner';
const OCR_API_URL = 'http://localhost:8130/upload-cheque';

interface VoucherData {
  voucherNo: string;
  voucherType: string;
  narration: string;
  micr: string;
  frontImage: string;
  backImage: string;
  frontImagePath: string;
  backImagePath: string;
  trackData1: string;
  trackData2: string;
  trackData3: string;
  mpData: string;
  cardType: string;
  magnePrintStatus: string;
  getScore: string;
  track1Status: string;
  track2Status: string;
  track3Status: string;
  deviceSerialNumber: string;
  dukptSerialNumber: string;
  encryptedSessionId: string;
  encryptedTrack1: string;
  encryptedTrack2: string;
  encryptedTrack3: string;
  checkNumber: string;
  routingNumber: string;
  accountNumber: string;
  bankCode: string;
  checkDate: string;
  amount: string;
  amountWords: string;
  accountHolder: string;
  signature: string;
  payeeName: string;
  bankName: string;
  bankBranch: string;
  requiredSignatures: string;
  signaturesPresent: string;
  signatureStatus: string;
  amountMismatch: string;
}

interface DeviceListResponse {
  devices: string[];
  message?: string | null;
}

interface DeviceStatusResponse {
  connected: boolean;
  deviceName?: string | null;
  message?: string | null;
  statusResponse?: string | null;
}

interface ConnectResponse {
  success: boolean;
  message?: string | null;
}

interface OperationResponse {
  success: boolean;
  message?: string | null;
}

interface ViewResponse {
  success: boolean;
  message?: string | null;
  data?: VoucherData;
}

interface OcrResponse {
  success: boolean;
  extractedData?: {
    PayeeName: string | null;
    PayerAccountHolderName: string | null;
    AmountFigures: string | null;
    AmountWords: string | null;
    AmountMismatch: string | null;
    Date: string | null;
    AccountNumber: string | null;
    BankName: string | null;
    BankBranch: string | null;
    RequiredSignatures: string | null;
    SignaturesPresent: string | null;
    SignatureStatus: string | null;
    MICR: string | null;
    CheckNumber: string | null;
    RoutingNumber: string | null;
    BankCode: string | null;
  };
  error?: string;
  rawResponse?: string;
}

interface AccountDataResponse {
  approved: Array<{
    signature: string;
    photo: string;
  }>;
}

export const api = {
  getDeviceList: async (): Promise<DeviceListResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`);
      console.log(`[${new Date().toISOString()}] getDeviceList: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] getDeviceList: Error:`, errorMessage);
      throw new Error(`Failed to fetch device list: ${errorMessage}`);
    }
  },

  getDeviceStatus: async (): Promise<DeviceStatusResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status`);
      console.log(`[${new Date().toISOString()}] getDeviceStatus: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] getDeviceStatus: Error:`, errorMessage);
      throw new Error(`Failed to fetch device status: ${errorMessage}`);
    }
  },

  connectDevice: async (): Promise<ConnectResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/connect`);
      console.log(`[${new Date().toISOString()}] connectDevice: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] connectDevice: Error:`, errorMessage);
      throw new Error(`Failed to connect device: ${errorMessage}`);
    }
  },

  connectSpecificDevice: async (deviceName: string): Promise<ConnectResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/connect/${deviceName}`);
      console.log(`[${new Date().toISOString()}] connectSpecificDevice: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] connectSpecificDevice: Error:`, errorMessage);
      throw new Error(`Failed to connect device ${deviceName}: ${errorMessage}`);
    }
  },

  setDocType: async (docType: 'CHECK' | 'MSR'): Promise<OperationResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/set-doctype/${docType}`);
      console.log(`[${new Date().toISOString()}] setDocType: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] setDocType: Error:`, errorMessage);
      throw new Error(`Failed to set document type: ${errorMessage}`);
    }
  },

  scanVoucher: async (): Promise<VoucherData> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/scan`);
      console.log(`[${new Date().toISOString()}] scanVoucher: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] scanVoucher: Error:`, errorMessage);
      throw new Error(`Failed to scan voucher: ${errorMessage}`);
    }
  },

  saveToDatabase: async (voucherData: VoucherData): Promise<OperationResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/save`, voucherData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`[${new Date().toISOString()}] saveToDatabase: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] saveToDatabase: Error:`, errorMessage);
      throw new Error(`Failed to save voucher: ${errorMessage}`);
    }
  },

  fetchVoucherData: async (transId: string): Promise<ViewResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/view/${transId}`);
      console.log(`[${new Date().toISOString()}] fetchVoucherData: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] fetchVoucherData: Error:`, errorMessage);
      throw new Error(`Failed to fetch voucher data: ${errorMessage}`);
    }
  },

  fetchAccountData: async (accountNumber: string): Promise<AccountDataResponse> => {
    try {
      const response = await axios.get(`http://10.203.14.169/imaging/get_account_signature-${accountNumber}`, {
        headers: {
          'Cookie': 'PHPSESSID=j12mdcbmma7d3mmcgb5q9pjj5q'
        }
      });
      console.log(`[${new Date().toISOString()}] fetchAccountData: Response:`, response.data);
      if (!response.data.approved || !Array.isArray(response.data.approved) || response.data.approved.length === 0) {
        throw new Error('Invalid response from external API: approved array is missing or empty');
      }
      for (const item of response.data.approved) {
        if (!item.signature || !item.photo) {
          throw new Error('Invalid response from external API: signature or photo missing in approved item');
        }
      }
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] fetchAccountData: Error:`, errorMessage);
      throw new Error(`Failed to fetch account data: ${errorMessage}`);
    }
  },

  getAccountSignatures: async (accountNumber: string): Promise<any> => {
    const rawAccount = accountNumber.replace(/\D/g, '');
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': '20171411891',
      'X-API-SECRET': '141116517P'
    };

    // 1. Try local proxy first to avoid browser CORS preflight errors
    try {
      const response = await axios.get(`/imaging-proxy/api/core_enquiry-${rawAccount}`, { headers });
      console.log(`[${new Date().toISOString()}] getAccountSignatures (proxy): Response:`, response.data);
      return response.data;
    } catch (proxyError: unknown) {
      console.warn(`[${new Date().toISOString()}] getAccountSignatures proxy failed, trying direct URL:`, proxyError);
    }

    // 2. Try direct remote URL as fallback
    try {
      const response = await axios.get(`http://10.203.14.169/imaging/api/core_enquiry-${rawAccount}`, { headers });
      console.log(`[${new Date().toISOString()}] getAccountSignatures (direct): Response:`, response.data);
      return response.data;
    } catch (directError: unknown) {
      // 3. Fallback to legacy endpoints if core_enquiry is unavailable
      try {
        const fallbackRes = await axios.get(`/imaging-proxy/get_account_signature-${rawAccount}`);
        return fallbackRes.data;
      } catch {
        try {
          const fallbackDirect = await axios.get(`http://10.203.14.169/imaging/get_account_signature-${rawAccount}`);
          return fallbackDirect.data;
        } catch {
          const errorMessage = directError instanceof AxiosError ? directError.message : String(directError);
          console.error(`[${new Date().toISOString()}] getAccountSignatures: Error:`, errorMessage);
          throw new Error(`Failed to fetch account signatures: ${errorMessage}`);
        }
      }
    }
  },

  cropSignature: async (base64Image: string, roi?: { x: number; y: number; w: number; h: number; isCustom?: boolean }): Promise<{ success: boolean; croppedImage: string; rawCroppedImage?: string; roi?: any }> => {
    try {
      const response = await axios.post('http://127.0.0.1:8130/crop-signature', {
        image: base64Image,
        roi: roi || { x: 0.45, y: 0.52, w: 0.55, h: 0.30 },
        isCustom: roi?.isCustom || false
      });
      return response.data;
    } catch (error: unknown) {
      console.error(`[${new Date().toISOString()}] cropSignature error:`, error);
      return { success: false, croppedImage: base64Image };
    }
  },

  compareSignatures: async (signature1: string, signature2: string): Promise<{ success: boolean; similarityPercentage: number; percentage: string; status: string; debug_details?: any }> => {
    try {
      const response = await axios.post('http://127.0.0.1:8130/compare-signatures', {
        signature1,
        signature2
      });
      return response.data;
    } catch (error: unknown) {
      console.error(`[${new Date().toISOString()}] compareSignatures error:`, error);
      return { success: false, similarityPercentage: 0, percentage: '0%', status: 'ERROR' };
    }
  },

  extractChequeData: async (image: string, micrData?: any): Promise<{
    success: boolean;
    reviewRequired?: boolean;
    overallConfidenceScore?: number;
    flaggedFields?: Array<{ field: string; reason: string }>;
    chequeData?: {
      bankName?: string;
      bankBranch?: string;
      bankConfidence?: number;
      checkNumber?: string;
      accountNumber?: string;
      routingNumber?: string;
      micr?: string;
      amount?: string;
      amountConfidence?: number;
      date?: string;
      dateConfidence?: number;
      dateStatus?: string;
      payee?: string;
      payeeConfidence?: number;
      legalAmount?: string;
      legalAmountConfidence?: number;
    };
    extractedRois?: {
      bankRoi?: string;
      branchRoi?: string;
      amountRoi?: string;
      dateRoi?: string;
      payeeRoi?: string;
      legalAmountRoi?: string;
      deskewedCheque?: string;
    };
  }> => {
    try {
      const response = await axios.post('http://127.0.0.1:8130/extract-cheque-data', {
        image,
        micrData
      });
      return response.data;
    } catch (error: unknown) {
      console.error(`[${new Date().toISOString()}] extractChequeData error:`, error);
      return { success: false, reviewRequired: true };
    }
  }
};