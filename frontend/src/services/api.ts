import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:5042/api/scanner';
const OCR_API_URL = 'http://localhost:7007/upload-cheque';

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

  extractChequeData: async (base64Image: string): Promise<OcrResponse> => {
    try {
      const formData = new FormData();
      const blob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(res => res.blob());
      formData.append('chequeImage', blob, 'cheque.jpg');
      const response = await axios.post(OCR_API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log(`[${new Date().toISOString()}] extractChequeData: Response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof AxiosError ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] extractChequeData: Error:`, errorMessage);
      throw new Error(`Failed to extract cheque data: ${errorMessage}`);
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
  }
};