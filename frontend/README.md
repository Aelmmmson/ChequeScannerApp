
# X100+ Voucher Scanner

A modern React application for scanning vouchers using the MagTek Excella STX device.

## Project Overview

This application provides a user interface for scanning vouchers, displaying the scanned images, and saving the data to a database. It consists of a React frontend that communicates with a C# backend.

## Features

- Device connection status indicator
- Connect to MagTek Excella STX device
- Scan vouchers to capture MICR data and front/back images
- Save voucher data to a database
- Simple and intuitive user interface

## Technical Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: C# REST API (to be implemented separately)
- **Device**: MagTek Excella STX scanner
- **Database**: Oracle database

## Getting Started
### 1. X100 Implementation
Run serve file and accesss system with paths below. Note that numbers included are just example data
# Paths
http://localhost/vscanner/
http://localhost/vscanner/scan?voucherNo=1234506
http://localhost/vscanner/view
http://localhost/vscanner/view?voucherNo=1234506


### 2. Local
### Frontend Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## Backend Integration

The frontend is designed to work with a C# backend that implements these endpoints:

- `GET /api/device-status`: Returns device connection status
- `POST /api/connect`: Connects to the scanning device
- `POST /api/scan-voucher`: Initiates a voucher scan
- `POST /api/save-to-db`: Saves voucher data to the database


## C# Backend Implementation

The backend should be implemented as a Spring Boot application that:

1. Communicates with the MagTek Excella STX device using its Java SDK
2. Connects to an Oracle database for storing voucher data
3. Exposes REST endpoints for the frontend to consume

The database should include a `mbank_cheques` table with these columns:
- `TRANS_ID`
- `IMAGE1`
- `IMAGE2`  
- `NARRATION`

### Run Application on Other Devices
## Build React (for frontend):
npm run build

## Publish the C# Backend (for backend):
dotnet publish -c Release -o ./publish

## THEN Run:
dotnet publish -c Release -r win-x86 --self-contained true -o ./publish


## Share full publish and React build
On other devices, place /dist (React build folder) and publish in one umbrella folder (vscanner) in WAMP www or Xamp htdocs, then serve the /publish

## License

This project is proprietary and confidential.


Run setup as administrator
Please disconnect Excella STX device before installing












<svg version="1.1" className="chip" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 50 50" xmlSpace="preserve">
                              <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                              AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAB6VBMVEUAAACNcTiVeUKVeUOY
                              fEaafEeUeUSYfEWZfEaykleyklaXe0SWekSZZjOYfEWYe0WXfUWXe0WcgEicfkiXe0SVekSXekSW
                              ekKYe0a9nF67m12ZfUWUeEaXfESVekOdgEmVeUWWekSniU+VeUKVeUOrjFKYfEWliE6WeESZe0GS
                              e0WYfES7ml2Xe0WXeESUeEOWfEWcf0eWfESXe0SXfEWYekSVeUKXfEWxklawkVaZfEWWekOUekOW
                              ekSYfESZe0eXekWYfEWZe0WZe0eVeUSWeETAnmDCoWLJpmbxy4P1zoXwyoLIpWbjvXjivnjgu3bf
                              u3beunWvkFWxkle/nmDivXiWekTnwXvkwHrCoWOuj1SXe0TEo2TDo2PlwHratnKZfEbQrWvPrWua
                              fUfbt3PJp2agg0v0zYX0zYSfgkvKp2frxX7mwHrlv3rsxn/yzIPgvHfduXWXe0XuyIDzzISsjVO1
                              lVm0lFitjVPzzIPqxX7duna0lVncuHTLqGjvyIHeuXXxyYGZfUayk1iyk1e2lln1zYTEomO2llrb
                              tnOafkjFpGSbfkfZtXLhvHfkv3nqxH3mwXujhU3KqWizlFilh06khk2fgkqsjlPHpWXJp2erjVOh
                              g0yWe0SliE+XekShhEvAn2D///+gx8TWAAAARnRSTlMACVCTtsRl7Pv7+vxkBab7pZv5+ZlL/UnU
                              /f3SJCVe+Fx39naA9/75XSMh0/3SSkia+pil/KRj7Pr662JPkrbP7OLQ0JFOijI1MwAAAAFiS0dE
                              orDd34wAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IDx2lsiuJAAACLElEQVRIx2Ng
                              GAXkAUYmZhZWPICFmYkRVQcbOwenmzse4MbFzc6DpIGXj8PD04sA8PbhF+CFaxEU8iWkAQT8hEVg
                              OkTF/InR4eUVICYO1SIhCRMLDAoKDvFDVhUaEhwUFAjjSUlDdMiEhcOEItzdI6OiYxA6YqODIt3d
                              I2DcuDBZsBY5eVTr4xMSYcyk5BRUOXkFsBZFJTQnp6alQxgZmVloUkrKYC0qqmji2WE5EEZuWB6a
                              lKoKdi35YQUQRkFYPpFaCouKIYzi6EDitJSUlsGY5RWVRGjJLyxNy4ZxqtIqqvOxaVELQwZFZdkI
                              JVU1RSiSalAt6rUwUBdWG1CP6pT6gNqwOrgCdQyHNYR5YQFhDXj8MiK1IAeyN6aORiyBjByVTc0F
                              qBoKWpqwRCVSgilOaY2OaUPw29qjOzqLvTAchpos47u6EZyYnngUSRwpuTe6D+6qaFQdOPNLRzOM
                              1dzhRZyW+CZouHk3dWLXglFcFIflQhj9YWjJGlZcaKAVSvjyPrRQ0oQVKDAQHlYFYUwIm4gqExGm
                              BSkutaVQJeomwViTJqPK6OhCy2Q9sQBk8cY0DxjTJw0lAQWK6cOKfgNhpKK7ZMpUeF3jPa28BCET
                              amiEqJKM+X1gxvWXpoUjVIVPnwErw71nmpgiqiQGBjNzbgs3j1nus+fMndc+Cwm0T52/oNR9lsdC
                              S24ra7Tq1cbWjpXV3sHRCb1idXZ0sGdltXNxRateRwHRAACYHutzk/2I5QAAACV0RVh0ZGF0ZTpj
                              cmVhdGUAMjAyMy0wMi0xM1QwODoxNToyOSswMDowMEUnN7UAAAAldEVYdGRhdGU6bW9kaWZ5ADIw
                              MjMtMDItMTNUMDg6MTU6MjkrMDA6MDA0eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAy
                              LTEzVDA4OjE1OjI5KzAwOjAwY2+u1gAAAABJRU5ErkJggg=="></image>
                            </svg>













                            import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import DeviceStatus from '@/components/DeviceStatus';
import SidebarButton from '@/components/SidebarButton';
import InfoField from '@/components/InfoField';
import ImageDisplay from '@/components/ImageDisplay';
import { api } from '@/services/api';
import { ChevronDown, Scan, Save, Power, X, Edit } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
  track1Status: string;
  track2Status: string;
  track3Status: string;
  getScore: string;
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

interface ErrorResponse {
  success: boolean;
  message: string;
}

type ScanResponse = VoucherData | ErrorResponse;

const isErrorResponse = (response: ScanResponse): response is ErrorResponse => {
  return 'success' in response && typeof response.success === 'boolean';
};

const parseCardDetails = (trackData1: string, trackData2: string) => {
  let cardNumber = '**** **** **** ****';
  let cardholderName = 'CARDHOLDER NAME';
  let expiryDate = 'YY/MM';
  let cardBrand = 'MASTERCARD';

  if (trackData1 && trackData1.startsWith('%B')) {
    const parts = trackData1.split('^');
    if (parts.length >= 3) {
      cardNumber = parts[0].substring(2).replace(/\s/g, '');
      cardholderName = parts[1].replace('/', ' ').trim().toUpperCase();
      const expiry = parts[2].substring(0, 4);
      if (expiry.length === 4) {
        expiryDate = `${expiry.substring(2, 4)}/${expiry.substring(0, 2)}`;
      }
    }
  } else if (trackData2 && trackData2.startsWith(';')) {
    const parts = trackData2.split('=');
    if (parts.length >= 2) {
      cardNumber = parts[0].substring(1).replace(/\s/g, '');
      const expiry = parts[1].substring(0, 4);
      if (expiry.length === 4) {
        expiryDate = `${expiry.substring(2, 4)}/${expiry.substring(0, 2)}`;
      }
    }
  }

  cardNumber = cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');

  if (cardNumber.replace(/\s/g, '').startsWith('4')) {
    cardBrand = 'VISA';
  } else if (cardNumber.replace(/\s/g, '').startsWith('5')) {
    cardBrand = 'MASTERCARD';
  } else if (cardNumber.replace(/\s/g, '').startsWith('3')) {
    cardBrand = 'AMEX';
  }

  return { cardNumber, cardholderName, expiryDate, cardBrand };
};

const Index = () => {
  const { toast } = useToast();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const voucherNoFromUrl = queryParams.get('voucherNo');
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [docType, setDocType] = useState<'CHECK' | 'MSR'>('CHECK');
  const [isVoucherNoRequired, setIsVoucherNoRequired] = useState(!!voucherNoFromUrl);
  const [isNarrationEditing, setIsNarrationEditing] = useState(false);
  const [narrationEditValue, setNarrationEditValue] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);

  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false);
  const [connectedDevice, setConnectedDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [devices, setDevices] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  const [voucherData, setVoucherData] = useState<VoucherData>({
    voucherNo: "",
    voucherType: "",
    narration: "",
    micr: "",
    frontImage: "",
    backImage: "",
    frontImagePath: "",
    backImagePath: "",
    trackData1: "",
    trackData2: "",
    trackData3: "",
    mpData: "",
    cardType: "",
    magnePrintStatus: "",
    track1Status: "",
    track2Status: "",
    track3Status: "",
    getScore: "",
    deviceSerialNumber: "",
    dukptSerialNumber: "",
    encryptedSessionId: "",
    encryptedTrack1: "",
    encryptedTrack2: "",
    encryptedTrack3: "",
    checkNumber: "",
    routingNumber: "",
    accountNumber: "",
    bankCode: "",
    checkDate: "",
    amount: "",
    amountWords: "",
    accountHolder: "",
    signature: ""
  });

  useEffect(() => {
    const storedVoucherNo = localStorage.getItem('voucherNo');
    const initialVoucherNo = voucherNoFromUrl || storedVoucherNo || "";
    setVoucherData(prev => ({ ...prev, voucherNo: initialVoucherNo }));
    localStorage.setItem('voucherNo', initialVoucherNo);
    console.log("Frontend: Initialized voucherNo:", initialVoucherNo);
    setIsVoucherNoRequired(!!voucherNoFromUrl);
  }, [voucherNoFromUrl]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setCurrentAction("Fetching device list...");
        const deviceListResponse = await api.getDeviceList();
        setDevices(deviceListResponse.devices);
        console.log("Frontend: Fetched devices:", deviceListResponse.devices.join(", "));

        if (deviceListResponse.devices.includes("STX.STX001")) {
          setCurrentAction("Connecting to STX.STX001...");
          const connectResponse = await api.connectSpecificDevice("STX.STX001");
          if (connectResponse.success) {
            setIsDeviceConnected(true);
            setConnectedDevice("STX.STX001");
            toast({
              title: "Device Connected",
              description: "Successfully connected to STX.STX001."
            });
          } else {
            toast({
              title: "Connection Failed",
              description: connectResponse.message || "Failed to connect to STX.STX001.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Device Not Found",
            description: "STX.STX001 not found in device list.",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "Initialization Error",
          description: "Error fetching devices or connecting.",
          variant: "destructive"
        });
        console.log("Frontend: Initialization error:", error.message);
      } finally {
        setIsLoading(false);
        setCurrentAction("");
      }
    };
    initialize();
  }, [toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!isDeviceConnected) {
      console.log("Frontend: Starting status polling");
      interval = setInterval(async () => {
        try {
          const response = await api.getDeviceStatus();
          setIsDeviceConnected(response.connected);
          setConnectedDevice(response.deviceName || "");
          if (response.connected) {
            console.log("Frontend: Device connected, stopping status polling");
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            toast({
              title: "Device Connected",
              description: `Connected to ${response.deviceName || "device"}.`,
            });
          }
        } catch (error: any) {
          setIsDeviceConnected(false);
          setConnectedDevice("");
          console.log("Frontend: Error checking status:", error.message);
        }
      }, 10000);
    }
    return () => {
      if (interval) {
        console.log("Frontend: Cleaning up status polling interval");
        clearInterval(interval);
      }
    };
  }, [isDeviceConnected, toast]);

  const handleConnect = async () => {
    setIsLoading(true);
    setCurrentAction("Connecting to device...");
    try {
      const response = await api.connectDevice();
      if (response.success) {
        setIsDeviceConnected(true);
        const status = await api.getDeviceStatus();
        setConnectedDevice(status.deviceName || "");
        toast({
          title: "Device Connected",
          description: `Successfully connected to ${status.deviceName || "device"}.`
        });
      } else {
        toast({
          title: "Connection Failed",
          description: response.message || "Failed to connect to the scanner.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to the device.",
        variant: "destructive"
      });
      console.log("Frontend: Connect error:", error.message);
    } finally {
      setIsLoading(false);
      setCurrentAction("");
    }
  };

  const handleScanVoucher = async () => {
    console.log("Frontend: handleScanVoucher called with docType:", docType);
    if (!isDeviceConnected) {
      console.log("Frontend: Scan aborted: Device not connected");
      toast({
        title: "Device Not Connected",
        description: "Please connect the device before scanning.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setCurrentAction("Setting document type...");
    try {
      console.log("Frontend: Sending setDocType request for", docType);
      const setDocTypeResponse = await api.setDocType(docType);
      if (!setDocTypeResponse.success) {
        console.log("Frontend: setDocType failed:", setDocTypeResponse.message);
        toast({
          title: "Document Type Error",
          description: setDocTypeResponse.message || "Failed to set document type.",
          variant: "destructive"
        });
        return;
      }
      setCurrentAction(`Scanning ${docType === 'CHECK' ? 'check' : 'card'}...`);
      console.log("Frontend: Sending scanVoucher request");
      const response: ScanResponse = await api.scanVoucher();
      if (isErrorResponse(response) && !response.success) {
        console.log("Frontend: Scan failed:", response.message);
        toast({
          title: "Scan Failed",
          description: response.message || `Failed to scan ${docType === 'CHECK' ? 'check' : 'card'}. Please try again.`,
          variant: "destructive"
        });
        return;
      }
      if ('voucherNo' in response) {
        setVoucherData(prev => ({
          ...prev,
          ...response
        }));
        setHasScanned(true);
        console.log("Frontend: Scan successful, data:", response);
        toast({
          title: "Scan Successful",
          description: docType === 'CHECK' 
            ? `Voucher scanned${response.voucherNo ? ` (${response.voucherNo})` : ""}.`
            : `Card scanned${response.cardType ? ` (${response.cardType})` : ""}.`
        });
      } else {
        console.log("Frontend: Scan failed: No data captured");
        toast({
          title: "Scan Failed",
          description: `No data captured. Please ensure the ${docType === 'CHECK' ? 'check' : 'card'} is properly inserted and try again.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.log("Frontend: Scan error:", error.message);
      toast({
        title: "Scan Error",
        description: error.message || `An error occurred while scanning the ${docType === 'CHECK' ? 'check' : 'card'}.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setCurrentAction("");
    }
  };

  const handleSaveToDb = async () => {
    if (!hasScanned) {
      console.log("Frontend: Save aborted: No scan data");
      toast({
        title: "No Data",
        description: "Please scan a voucher or card before saving.",
        variant: "destructive"
      });
      return;
    }
    if (isVoucherNoRequired && !voucherData.voucherNo) {
      console.log("Frontend: Save aborted: Missing voucher number");
      toast({
        title: "Missing Voucher Number",
        description: "Voucher number is required to save to database.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setCurrentAction("Saving to database...");
    try {
      const saveData: VoucherData = {
        ...voucherData,
        narration: voucherData.narration,
        micr: docType === 'CHECK' ? voucherData.micr : "",
        frontImage: docType === 'CHECK' ? voucherData.frontImage : "",
        backImage: docType === 'CHECK' ? voucherData.backImage : "",
        frontImagePath: docType === 'CHECK' ? voucherData.frontImagePath : "",
        backImagePath: docType === 'CHECK' ? voucherData.backImagePath : "",
        trackData1: docType === 'MSR' ? voucherData.trackData1 : "",
        trackData2: docType === 'MSR' ? voucherData.trackData2 : "",
        trackData3: docType === 'MSR' ? voucherData.trackData3 : "",
        mpData: docType === 'MSR' ? voucherData.mpData : "",
        cardType: docType === 'MSR' ? voucherData.cardType : "",
        magnePrintStatus: docType === 'MSR' ? voucherData.magnePrintStatus : "",
        track1Status: docType === 'MSR' ? voucherData.track1Status : "",
        track2Status: docType === 'MSR' ? voucherData.track2Status : "",
        track3Status: docType === 'MSR' ? voucherData.track3Status : "",
        getScore: docType === 'MSR' ? voucherData.getScore : "",
        deviceSerialNumber: docType === 'MSR' ? voucherData.deviceSerialNumber : "",
        dukptSerialNumber: docType === 'MSR' ? voucherData.dukptSerialNumber : "",
        encryptedSessionId: docType === 'MSR' ? voucherData.encryptedSessionId : "",
        encryptedTrack1: docType === 'MSR' ? voucherData.encryptedTrack1 : "",
        encryptedTrack2: docType === 'MSR' ? voucherData.encryptedTrack2 : "",
        encryptedTrack3: docType === 'MSR' ? voucherData.encryptedTrack3 : "",
        checkNumber: docType === 'CHECK' ? voucherData.checkNumber : "",
        routingNumber: docType === 'CHECK' ? voucherData.routingNumber : "",
        accountNumber: docType === 'CHECK' ? voucherData.accountNumber : "",
        bankCode: docType === 'CHECK' ? voucherData.bankCode : "",
        checkDate: docType === 'CHECK' ? voucherData.checkDate : "",
        amount: docType === 'CHECK' ? voucherData.amount : "",
        amountWords: docType === 'CHECK' ? voucherData.amountWords : "",
        accountHolder: docType === 'CHECK' ? voucherData.accountHolder : "",
        signature: docType === 'CHECK' ? voucherData.signature : ""
      };
      console.log("Frontend: Sending saveToDatabase request with data:", saveData);
      const response = await api.saveToDatabase(saveData);
      if (response.success) {
        console.log("Frontend: Save successful:", response.message);
        toast({
          title: "Data Saved",
          description: `Data saved to database.`
        });
        setVoucherData({
          voucherNo: isVoucherNoRequired ? voucherData.voucherNo : "",
          voucherType: "",
          narration: "",
          micr: "",
          frontImage: "",
          backImage: "",
          frontImagePath: "",
          backImagePath: "",
          trackData1: "",
          trackData2: "",
          trackData3: "",
          mpData: "",
          cardType: "",
          magnePrintStatus: "",
          track1Status: "",
          track2Status: "",
          track3Status: "",
          getScore: "",
          deviceSerialNumber: "",
          dukptSerialNumber: "",
          encryptedSessionId: "",
          encryptedTrack1: "",
          encryptedTrack2: "",
          encryptedTrack3: "",
          checkNumber: "",
          routingNumber: "",
          accountNumber: "",
          bankCode: "",
          checkDate: "",
          amount: "",
          amountWords: "",
          accountHolder: "",
          signature: ""
        });
        setHasScanned(false);
        setIsNarrationEditing(false);
        setNarrationEditValue('');
        setShowAdvanced(false);
        setIsModalOpen(false);
        if (!isVoucherNoRequired) {
          localStorage.removeItem('voucherNo');
        }
      } else {
        console.log("Frontend: Save failed:", response.message);
        toast({
          title: "Save Failed",
          description: response.message || "Failed to save data to database.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.log("Frontend: Save error:", error.message);
      toast({
        title: "Save Error",
        description: error.message || "An error occurred while saving to the database.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setCurrentAction("");
    }
  };

  const handleNarrationEdit = () => {
    console.log("Frontend: Starting narration edit, current narration:", voucherData.narration);
    setIsNarrationEditing(true);
    setNarrationEditValue(voucherData.narration);
  };

  const handleNarrationChange = (value: string) => {
    console.log("Frontend: Narration changed to:", value);
    setNarrationEditValue(value);
  };

  const handleNarrationSave = () => {
    console.log("Frontend: Saving narration:", narrationEditValue);
    setVoucherData(prev => ({
      ...prev,
      narration: narrationEditValue
    }));
    setIsNarrationEditing(false);
    setNarrationEditValue('');
  };

  const handleNarrationCancel = () => {
    console.log("Frontend: Cancelled narration edit");
    setIsNarrationEditing(false);
    setNarrationEditValue('');
  };

  const handleExit = () => {
    console.log("Frontend: Exiting application");
    window.location.reload();
  };

  const { cardNumber, cardholderName, expiryDate, cardBrand } = parseCardDetails(voucherData.trackData1, voucherData.trackData2);

  const getStatusColor = (status: string, trackData?: string) => {
    if (trackData !== undefined) {
      return trackData.trim() ? 'bg-green-500' : 'bg-red-500';
    }
    return status.toUpperCase() === 'OK' ? 'bg-green-500' : 'bg-red-500';
  };

  const getSignatureImagePath = () => {
    if (voucherData.frontImagePath) {
      const timestamp = voucherData.frontImagePath.match(/\d{8}_\d{6}/)?.[0] || '';
      return `http://localhost:5042/${voucherData.frontImagePath.replace('front', 'right').replace('.jpg', '')}_${timestamp}.jpg`;
    }
    return '';
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSignature(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompareSignatures = async () => {
    if (!uploadedSignature) {
      toast({
        title: "Upload Error",
        description: "Please upload a signature image to compare.",
        variant: "destructive"
      });
      return;
    }

    const scannedImage = getSignatureImagePath();
    if (!scannedImage) {
      toast({
        title: "Image Error",
        description: "No scanned signature image available.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/compare-signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          signature1: scannedImage.split(',')[1], // Extract base64 data
          signature2: uploadedSignature.split(',')[1], // Extract base64 data
        }).toString(),
      });

      const data = await response.json();
      if (response.ok) {
        setSimilarityScore(data.similarity);
        toast({
          title: "Comparison Complete",
          description: `Similarity score: ${data.similarity}`,
        });
      } else {
        toast({
          title: "Comparison Failed",
          description: data.error || "Failed to compare signatures.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Frontend: Compare error:", error.message);
      toast({
        title: "Comparison Error",
        description: error.message || "An error occurred during signature comparison.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-blue-600 text-white p-2 shadow-sm flex">
        <h1 className="text-lg font-semibold px-3 flex items-center gap-2">
          <Scan className="h-5 w-5 animate-pulse" />
          X100+ Voucher Scanner
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 p-3 flex flex-col space-y-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Document Type</label>
            <select
              value={docType}
              onChange={(e) => {
                console.log("Frontend: Document type changed to:", e.target.value);
                setDocType(e.target.value as 'CHECK' | 'MSR');
              }}
              className="w-full p-2 text-xs text-gray-700 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CHECK">Check</option>
              <option value="MSR">Card</option>
            </select>
          </div>
          <div className="flex flex-col flex-1 space-y-2 bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <SidebarButton
              onClick={handleConnect}
              disabled={isLoading || isDeviceConnected}
              className={isDeviceConnected ? "bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700" : ""}
              icon={<Power className="h-3 w-3" />}
            >
              <div className="flex flex-col items-start">
                <span>{isDeviceConnected ? "CONNECTED" : "CONNECT"}</span>
                <p className="text-xs text-gray-600 mt-0.5">{connectedDevice || "None"}</p>
              </div>
            </SidebarButton>
            <SidebarButton
              onClick={handleScanVoucher}
              disabled={!isDeviceConnected || isLoading}
              icon={<Scan className="h-3 w-3" />}
            >
              Scan {docType === 'CHECK' ? 'Check' : 'Card'}
            </SidebarButton>
            <SidebarButton
              onClick={handleSaveToDb}
              disabled={!hasScanned || isLoading}
              icon={<Save className="h-3 w-3" />}
            >
              Save to DB
            </SidebarButton>
            <SidebarButton
              onClick={handleExit}
              className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 mt-auto"
              icon={<X className="h-3 w-3" />}
            >
              Exit
            </SidebarButton>
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100 shadow-sm animate-pulse">
              <span className="font-medium text-sm">{currentAction}</span>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                label="Voucher No"
                value={voucherData.voucherNo || 'N/A'}
                readOnly={true}
                compact={true}
              />
              <div className="relative">
                <InfoField
                  label="Narration"
                  value={isNarrationEditing ? narrationEditValue : voucherData.narration}
                  readOnly={!isNarrationEditing}
                  onChange={handleNarrationChange}
                  required={false}
                  placeholder="Enter narration"
                  compact={true}
                />
                {!isNarrationEditing && (
                  <button
                    onClick={handleNarrationEdit}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800 mt-1"
                    title="Edit Narration"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {isNarrationEditing && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={handleNarrationSave}
                      className="p-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleNarrationCancel}
                      className="p-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {docType === 'CHECK' && hasScanned && (
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <InfoField
                  label="MICR"
                  value={voucherData.micr}
                  readOnly={true}
                  compact={true}
                />
                <InfoField
                  label="Check Number"
                  value={voucherData.checkNumber}
                  readOnly={true}
                  compact={true}
                />
                <InfoField
                  label="Routing Number"
                  value={voucherData.routingNumber}
                  readOnly={true}
                  compact={true}
                />
                <InfoField
                  label="Account Number"
                  value={voucherData.accountNumber}
                  readOnly={true}
                  compact={true}
                />
                <InfoField
                  label="Bank Code"
                  value={voucherData.bankCode}
                  readOnly={true}
                  compact={true}
                />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded w-full md:w-auto"
                >
                  Other
                </button>
              </div>
            )}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-dashed border-blue-500 shadow-sm hover:shadow-md transition-all">
              {docType === 'MSR' ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-700">Card Details</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <InfoField
                          label="MagnPrint Data"
                          value={voucherData.mpData}
                          readOnly={true}
                          compact={true}
                        />
                        <InfoField
                          label="Card Type"
                          value={voucherData.cardType}
                          readOnly={true}
                          compact={true}
                        />
                        <InfoField
                          label="Get Score"
                          value={voucherData.getScore}
                          readOnly={true}
                          compact={true}
                        />
                      </div>
                      <InfoField
                        label="Track1 Data"
                        value={voucherData.trackData1}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Track2 Data"
                        value={voucherData.trackData2}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Track3 Data"
                        value={voucherData.trackData3}
                        readOnly={true}
                        compact={true}
                      />
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded w-full md:w-auto"
                      >
                        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                      </button>
                      {showAdvanced && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <InfoField
                              label="Device Serial Number"
                              value={voucherData.deviceSerialNumber}
                              readOnly={true}
                              compact={true}
                            />
                            <InfoField
                              label="DUKPT Serial Number"
                              value={voucherData.dukptSerialNumber}
                              readOnly={true}
                              compact={true}
                            />
                            <InfoField
                              label="Encrypted Session ID"
                              value={voucherData.encryptedSessionId}
                              readOnly={true}
                              compact={true}
                            />
                          </div>
                          <InfoField
                            label="Encrypted Track1"
                            value={voucherData.encryptedTrack1}
                            readOnly={true}
                            compact={true}
                          />
                          <InfoField
                            label="Encrypted Track2"
                            value={voucherData.encryptedTrack2}
                            readOnly={true}
                            compact={true}
                          />
                          <InfoField
                            label="Encrypted Track3"
                            value={voucherData.encryptedTrack3}
                            readOnly={true}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex justify-center space-x-4 mb-4">
                        <div className="flex items-center">
                          <span className={`h-3 w-3 rounded-full ${getStatusColor(voucherData.magnePrintStatus)} mr-1`}></span>
                          <span className="text-xs font-medium">MagnPrint</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`h-3 w-3 rounded-full ${getStatusColor(voucherData.track1Status, voucherData.trackData1)} mr-1`}></span>
                          <span className="text-xs font-medium">Track1</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`h-3 w-3 rounded-full ${getStatusColor(voucherData.track2Status, voucherData.trackData2)} mr-1`}></span>
                          <span className="text-xs font-medium">Track2</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`h-3 w-3 rounded-full ${getStatusColor(voucherData.track3Status, voucherData.trackData3)} mr-1`}></span>
                          <span className="text-xs font-medium">Track3</span>
                        </div>
                      </div>
                      <div className="flip-card max-w-sm">
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <p className="heading_8264">{cardBrand}</p>
                            <svg className="logo" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48" xmlSpace="preserve">
                              {cardBrand === 'VISA' ? (
                                <>
                                  <path fill="#1565C0" d="M21,36l-1-7l-6-3l3-5l-5-1l-3-6l6,3l2,7l5,2l-2,5L21,36z"></path>
                                  <path fill="#039BE5" d="M30,12l-3,6l-5-2l-2-7l6,1l3,5L30,12z"></path>
                                  <path fill="#4FC3F7" d="M27,36l3-5l5,2l2-7l-6-1l-3,6L27,36z"></path>
                                </>
                              ) : cardBrand === 'AMEX' ? (
                                <path fill="#006FCF" d="M6,8v32h36V8H6z M36.8,18l-3.6,6.4h3.2l-2.4,4.3h-6.4l-2.4-4.3h6.4l1.6-2.9h-6.4l-2.4-4.3h9.6L36.8,18z"></path>
                              ) : (
                                <>
                                  <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path>
                                  <path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path>
                                  <path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48s-2.376-8.95-6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
                                </>
                              )}
                            </svg>
                            <svg version="1.1" className="chip" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 50 50" xmlSpace="preserve">
                              <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                              AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAB6VBMVEUAAACNcTiVeUKVeUOY
                              fEaafEeUeUSYfEWZfEaykleyklaXe0SWekSZZjOYfEWYe0WXfUWXe0WcgEicfkiXe0SVekSXekSW
                              ekKYe0a9nF67m12ZfUWUeEaXfESVekOdgEmVeUWWekSniU+VeUKVeUOrjFKYfEWliE6WeESZe0GS
                              e0WYfES7ml2Xe0WXeESUeEOWfEWcf0eWfESXe0SXfEWYekSVeUKXfEWxklawkVaZfEWWekOUekOW
                              ekSYfESZe0eXekWYfEWZe0WZe0eVeUSWeETAnmDCoWLJpmbxy4P1zoXwyoLIpWbjvXjivnjgu3bf
                              u3beunWvkFWxkle/nmDivXiWekTnwXvkwHrCoWOuj1SXe0TEo2TDo2PlwHratnKZfEbQrWvPrWua
                              fUfbt3PJp2agg0v0zYX0zYSfgkvKp2frxX7mwHrlv3rsxn/yzIPgvHfduXWXe0XuyIDzzISsjVO1
                              lVm0lFitjVPzzIPqxX7duna0lVncuHTLqGjvyIHeuXXxyYGZfUayk1iyk1e2lln1zYTEomO2llrb
                              tnOafkjFpGSbfkfZtXLhvHfkv3nqxH3mwXujhU3KqWizlFilh06khk2fgkqsjlPHpWXJp2erjVOh
                              g0yWe0SliE+XekShhEvAn2D///+gx8TWAAAARnRSTlMACVCTtsRl7Pv7+vxkBab7pZv5+ZlL/UnU
                              /f3SJCVe+Fx39naA9/75XSMh0/3SSkia+pil/KRj7Pr662JPkrbP7OLQ0JFOijI1MwAAAAFiS0dE
                              orDd34wAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IDx2lsiuJAAACLElEQVRIx2Ng
                              GAXkAUYmZhZWPICFmYkRVQcbOwenmzse4MbFzc6DpIGXj8PD04sA8PbhF+CFaxEU8iWkAQT8hEVg
                              OkTF/InR4eUVICYO1SIhCRMLDAoKDvFDVhUaEhwUFAjjSUlDdMiEhcOEItzdI6OiYxA6YqODIt3d
                              I2DcuDBZsBY5eVTr4xMSYcyk5BRUOXkFsBZFJTQnp6alQxgZmVloUkrKYC0qqmji2WE5EEZuWB6a
                              lKoKdi35YQUQRkFYPpFaCouKIYzi6EDitJSUlsGY5RWVRGjJLyxNy4ZxqtIqqvOxaVELQwZFZdkI
                              JVU1RSiSalAt6rUwUBdWG1CP6pT6gNqwOrgCdQyHNYR5YQFhDXj8MiK1IAeyN6aORiyBjByVTc0F
                              qBoKWpqwRCVSgilOaY2OaUPw29qjOzqLvTAchpos47u6EZyYnngUSRwpuTe6D+6qaFQdOPNLRzOM
                              1dzhRZyW+CZouHk3dWLXglFcFIflQhj9YWjJGlZcaKAVSvjyPrRQ0oQVKDAQHlYFYUwIm4gqExGm
                              BSkutaVQJeomwViTJqPK6OhCy2Q9sQBk8cY0DxjTJw0lAQWK6cOKfgNhpKK7ZMpUeF3jPa28BCET
                              amiEqJKM+X1gxvWXpoUjVIVPnwErw71nmpgiqiQGBjNzbgs3j1nus+fMndc+Cwm0T52/oNR9lsdC
                              S24ra7Tq1cbWjpXV3sHRCb1idXZ0sGdltXNxRateRwHRAACYHutzk/2I5QAAACV0RVh0ZGF0ZTpj
                              cmVhdGUAMjAyMy0wMi0xM1QwODoxNToyOSswMDowMEUnN7UAAAAldEVYdGRhdGU6bW9kaWZ5ADIw
                              MjMtMDItMTNUMDg6MTU6MjkrMDA6MDA0eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAy
                              LTEzVDA4OjE1OjI5KzAwOjAwY2+u1gAAAABJRU5ErkJggg=="></image>
                            </svg>
                            <svg version="1.1" className="contactless" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="25px" viewBox="0 0 50 50" xmlSpace="preserve">
                              <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                              AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZ
                              cwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IEzgIwaKTAAADDklEQVRYw+1XS0iUURQ+f5qPyjQf
                              lGRFEEFK76koKGxRbWyVVLSOgsCgwjZBJJYuKogSIoOonUK4q3U0WVBWFPZYiIE6kuArG3VGzK/F
                              fPeMM/MLt99/NuHdfPd888/57jn3nvsQWWj/VcMlvMMd5KRTogqx9iCdIjUUmcGR9ImUYowyP3xN
                              GQJoRLVaZ2DaZf8kyjEJALhI28ELioyiwC+Rc3QZwRYyO/DH51hQgWm6DMIh10KmD4u9O16K49it
                              VoPOAmcGAWWOepXIRScAoJZ2Frro8oN+EyTT6lWkkg6msZfMSR35QTJmjU0g15tIGSJ08ZZMJkJk
                              HpNZgSkyXosS13TkJpZ62mPIJvOSzC1bp8vRhhCakEk7G9/o4gmZdbpsTcKu0m63FbnBP9Qrc15z
                              bkbemfgNDtEOI8NO5L5O9VYyRYgmJayZ9nPaxZrSjW4+F6Uw9yQqIiIZwhp2huQTf6OIvCZyGM6g
                              DJBZbyXifJXr7FZjGXsdxADxI7HUJFB6iWvsIhFpkoiIiGTJfjJfiCuJg2ZEspq9EHGVpYgzKqwJ
                              qSAOEwuJQ/pxPvE3cYltJCLdxBLiSKKIE5HxJKcTRNeadxfhDiuYw44zVs1dxKwRk/uCxIiQkxKB
                              sSctRVAge9g1E15EHE6yRUaJecRxcWlukdRIbGFOSZCMWQA/iWauIP3slREHXPyliqBcrrD71Amz
                              Z+rD1Mt2Yr8TZc/UR4/YtFnbijnHi3UrN9vKQ9rPaJf867ZiaqDB+czeKYmd3pNa6fuI75MiC0uX
                              XSR5aEMf7s7a6r/PudVXkjFb/SsrCRfROk0Fx6+H1i9kkTGn/E1vEmt1m089fh+RKdQ5O+xNJPUi
                              cUIjO0Dm7HwvErEr0YxeibL1StSh37STafE4I7zcBdRq1DiOkdmlTJVnkQTBTS7X1FYyvfO4piaI
                              nKbDCDaT2anLudYXCRFsQBgAcIF2/Okwgvz5+Z4tsw118dzruvIvjhTB+HOuWy8UvovEH6beitBK
                              xDyxm9MmISKCWrzB7bSlaqGlsf0FC0gMjzTg6GgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDIt
                              MTNUMDg6MTk6NTYrMDA6MDCjlq7LAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAyLTEzVDA4OjE5
                              OjU2KzAwOjAw0ssWdwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wMi0xM1QwODoxOTo1Nisw
                              MDowMIXeN6gAAAAASUVORK5CYII="></image>
                            </svg>
                            <p className="number">{cardNumber}</p>
                            <p className="valid_thru">VALID THRU</p>
                            <p className="date_8264">{expiryDate}</p>
                            <p className="name">{cardholderName}</p>
                          </div>
                          <div className="flip-card-back">
                            <div className="strip"></div>
                            <div className="mstrip"></div>
                            <div className="sstrip">
                              <p className="code">***</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <ImageDisplay 
                    label="Front" 
                    imageData={voucherData.frontImage} 
                    onBentoClick={() => setSignatureModalOpen(true)}
                  />
                  <ImageDisplay label="Back" imageData={voucherData.backImage} />
                </div>
              )}
            </div>
            {isModalOpen && docType === 'CHECK' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Check Details</h2>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Full MICR:</strong> {voucherData.micr || 'N/A'}</p>
                    <p className="text-sm"><strong>Check Number:</strong> {voucherData.checkNumber || 'N/A'}</p>
                    <p className="text-sm"><strong>Routing Number:</strong> {voucherData.routingNumber || 'N/A'}</p>
                    <p className="text-sm"><strong>Account Number:</strong> {voucherData.accountNumber || 'N/A'}</p>
                    <p className="text-sm"><strong>Bank Code:</strong> {voucherData.bankCode || 'N/A'}</p>
                    <p className="text-sm"><strong>Account Holder:</strong> {voucherData.accountHolder || 'N/A'}</p>
                    <p className="text-sm"><strong>Date:</strong> {voucherData.checkDate || 'N/A'}</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="mt-4 p-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded w-full"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {signatureModalOpen && docType === 'CHECK' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Signature Comparison</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Scanned Signature</h3>
                      <img 
                        src={getSignatureImagePath()} 
                        alt="Scanned Signature" 
                        className="w-full h-48 object-contain border rounded" 
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Uploaded Signature</h3>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSignatureUpload} 
                        className="mb-2"
                      />
                      {uploadedSignature && (
                        <img 
                          src={uploadedSignature} 
                          alt="Uploaded Signature" 
                          className="w-full h-48 object-contain border rounded" 
                        />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleCompareSignatures}
                    className="mt-4 p-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded w-full"
                  >
                    Compare
                  </button>
                  {similarityScore !== null && (
                    <p className="mt-2 text-sm text-gray-700">Similarity Score: {similarityScore}</p>
                  )}
                  <button
                    onClick={() => setSignatureModalOpen(false)}
                    className="mt-4 p-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded w-full"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            <footer className="py-4 text-center">
              <p className="text-blue-600 text-sm italic animate-pulse">Powered by X100</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;