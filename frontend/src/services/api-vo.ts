
// Simulated API service that would connect to the Java backend

// Mock data for development
const MOCK_VOUCHER_RESPONSE = {
  voucherNo: "V12345678",
  narration: "Payment for services", // Changed from nation to narration
  micr: "123456789012345",
  frontImage: null, // Would be a base64 string in real implementation
  backImage: null,  // Would be a base64 string in real implementation
};

// Mock delays to simulate network requests
const MOCK_DELAY = 500;

export const api = {
  // Check if device is connected
  // getDeviceStatus: async (): Promise<{ connected: boolean }> => {
  //   await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  //   // Simulate random status for the mock
  //   return { connected: Math.random() > 0.5 };
  // },

  // Connect to the device
  // connectDevice: async (): Promise<{ success: boolean }> => {
  //   await new Promise(resolve => setTimeout(resolve, MOCK_DELAY * 2));
  //   return { success: true };
  // },

  // Scan a voucher
  scanVoucher: async () => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY * 3));
    return MOCK_VOUCHER_RESPONSE;
  },

  // Save voucher data to database
  saveToDatabase: async (voucherData: any): Promise<{ success: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY * 2));
    console.log("Saving to database:", voucherData);
    return { success: true };
  }
};
