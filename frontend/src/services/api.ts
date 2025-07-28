import axios from 'axios';

const API_BASE_URL = 'http://localhost:5042/api/scanner';

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

export const api = {
  getDeviceList: async (): Promise<DeviceListResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`);
      console.log(`[${new Date().toISOString()}] getDeviceList: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] getDeviceList: Error:`, error.message);
      throw new Error(`Failed to fetch device list: ${error.message}`);
    }
  },

  getDeviceStatus: async (): Promise<DeviceStatusResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status`);
      console.log(`[${new Date().toISOString()}] getDeviceStatus: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] getDeviceStatus: Error:`, error.message);
      throw new Error(`Failed to fetch device status: ${error.message}`);
    }
  },

  connectDevice: async (): Promise<ConnectResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/connect`);
      console.log(`[${new Date().toISOString()}] connectDevice: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] connectDevice: Error:`, error.message);
      throw new Error(`Failed to connect device: ${error.message}`);
    }
  },

  connectSpecificDevice: async (deviceName: string): Promise<ConnectResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/connect/${deviceName}`);
      console.log(`[${new Date().toISOString()}] connectSpecificDevice: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] connectSpecificDevice: Error:`, error.message);
      throw new Error(`Failed to connect device ${deviceName}: ${error.message}`);
    }
  },

  setDocType: async (docType: 'CHECK' | 'MSR'): Promise<OperationResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/set-doctype/${docType}`);
      console.log(`[${new Date().toISOString()}] setDocType: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] setDocType: Error:`, error.message);
      throw new Error(`Failed to set document type: ${error.message}`);
    }
  },

  scanVoucher: async (): Promise<VoucherData> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/scan`);
      console.log(`[${new Date().toISOString()}] scanVoucher: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] scanVoucher: Error:`, error.message);
      throw new Error(`Failed to scan voucher: ${error.message}`);
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
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] saveToDatabase: Error:`, error.message);
      throw new Error(`Failed to save voucher: ${error.message}`);
    }
  },

  fetchVoucherData: async (transId: string): Promise<ViewResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/view/${transId}`);
      console.log(`[${new Date().toISOString()}] fetchVoucherData: Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] fetchVoucherData: Error:`, error.message);
      throw new Error(`Failed to fetch voucher data: ${error.message}`);
    }
  }
};