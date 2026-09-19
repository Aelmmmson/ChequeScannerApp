import axios, { AxiosError } from 'axios';
import { appConfig } from '@/config/appConfig';

const API_BASE_URL = appConfig.API_BASE_URL || 'http://localhost:5042/api/scanner';
const OCR_API_URL = `${appConfig.OCR_SERVICE_URL || 'http://127.0.0.1:8130'}/upload-cheque`;

// Helper function for client-side signature cropping fallback
const cropImageClientSide = (base64Image: string, roi: { x: number; y: number; w: number; h: number }): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Image);

        const cropX = Math.round(roi.x * img.width);
        const cropY = Math.round(roi.y * img.height);
        const cropW = Math.round(roi.w * img.width);
        const cropH = Math.round(roi.h * img.height);

        canvas.width = Math.max(1, cropW);
        canvas.height = Math.max(1, cropH);

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch {
        resolve(base64Image);
      }
    };
    img.onerror = () => resolve(base64Image);
    img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
};

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
  countryCode?: string;
  stateCode?: string;
  branchCode?: string;
  transactionCode?: string;
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
      const response = await axios.get(`${appConfig.EXTERNAL_IMAGING_API_BASE_URL}/imaging/get_account_signature-${accountNumber}`, {
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

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1. Try local proxy first if on localhost to avoid browser CORS preflight errors
    if (isLocalhost) {
      try {
        const response = await axios.get(`/imaging-proxy/api/core_enquiry-${rawAccount}`, { headers });
        console.log(`[${new Date().toISOString()}] getAccountSignatures (proxy): Response:`, response.data);
        return response.data;
      } catch (proxyError: unknown) {
        console.warn(`[${new Date().toISOString()}] getAccountSignatures proxy failed, trying direct URL:`, proxyError);
      }
    }

    // 2. Direct remote URL
    try {
      const response = await axios.get(`${appConfig.EXTERNAL_IMAGING_API_BASE_URL}/imaging/api/core_enquiry-${rawAccount}`, { headers });
      console.log(`[${new Date().toISOString()}] getAccountSignatures (direct): Response:`, response.data);
      return response.data;
    } catch (directError: unknown) {
      // 3. Fallback to legacy endpoints if core_enquiry is unavailable
      try {
        const fallbackRes = await axios.get(`/imaging-proxy/get_account_signature-${rawAccount}`);
        return fallbackRes.data;
      } catch {
        try {
          const fallbackDirect = await axios.get(`${appConfig.EXTERNAL_IMAGING_API_BASE_URL}/imaging/get_account_signature-${rawAccount}`);
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
    const targetRoi = roi || { x: 0.58, y: 0.52, w: 0.40, h: 0.30 };
    const formattedInput = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    try {
      const response = await axios.post('http://127.0.0.1:8130/crop-signature', {
        image: formattedInput,
        roi: targetRoi,
        isCustom: roi?.isCustom || false
      });
      if (response.data && response.data.success && response.data.croppedImage) {
        return response.data;
      }
      const clientCropped = await cropImageClientSide(formattedInput, targetRoi);
      return { success: true, croppedImage: clientCropped, roi: targetRoi };
    } catch (error: unknown) {
      console.warn(`[${new Date().toISOString()}] cropSignature remote error, executing client-side fallback:`, error);
      const clientCropped = await cropImageClientSide(formattedInput, targetRoi);
      return { success: true, croppedImage: clientCropped, roi: targetRoi };
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