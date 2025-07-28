import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import DeviceStatus from '@/components/DeviceStatus';
import SidebarButton from '@/components/SidebarButton';
import InfoField from '@/components/InfoField';
import ImageDisplay from '@/components/ImageDisplay';
import { api } from '@/services/api';
import { ChevronDown, Scan, Save, Power, X, Edit, RefreshCw, XCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Function to process image (crop from above bottom right with margin, grayscale, high contrast)
const processSignatureImage = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Crop bottom right with a margin from the bottom
      const cropWidth = img.width * 0.32; // 25% of width .... 0.28 for Stanbic ...
      const cropHeight = img.height * 0.13; // 25% of height ... 0.20 for Stanbic ...
      const marginFromBottom = img.height * 0.25; // 10% margin from bottom ... 0.18 for Stanbic cheque
      const cropX = img.width - cropWidth; // Start from right edge
      const cropY = img.height - cropHeight - marginFromBottom; // Shift up by margin
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      if (ctx) {
        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // Convert to grayscale
        const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const gray = 0.2989 * red + 0.5870 * green + 0.1140 * blue; // Luminance formula
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);

        // Apply high contrast
        const contrast = 100; // Adjust contrast (100 = max)
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < data.length; i += 4) {
          data[i] = factor * (data[i] - 128) + 128;     // Red
          data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
          data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
          // Clamp values to [0, 255]
          data[i] = Math.min(Math.max(data[i], 0), 255);
          data[i + 1] = Math.min(Math.max(data[i + 1], 0), 255);
          data[i + 2] = Math.min(Math.max(data[i + 2], 0), 255);
        }
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL('image/jpeg'));
      }
    };
    img.src = base64Image;
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

// Function to parse Track1 or Track2 for cardholder name and expiry
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

// Function to determine status color
const getStatusColor = (status: string, trackData?: string) => {
  if (trackData !== undefined) {
    return trackData.trim() ? 'bg-green-500' : 'bg-red-500';
  }
  return status.toUpperCase() === 'OK' ? 'bg-green-500' : 'bg-red-500';
};

const getSimilarityColor = (similarity: number) => {
  if (similarity >= 90) return 'text-green-600';
  if (similarity >= 70) return 'text-yellow-600';
  if (similarity >= 50) return 'text-orange-600';
  return 'text-red-600';
};

const Index = () => {
  const { toast } = useToast();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const voucherNoFromUrl = queryParams.get('voucherNo');
  const [docType, setDocType] = useState<'CHECK' | 'MSR'>('CHECK');
  const [isVoucherNoRequired, setIsVoucherNoRequired] = useState(!!voucherNoFromUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [processedFrontImage, setProcessedFrontImage] = useState<string | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedVoucherNo = localStorage.getItem('voucherNo');
    const initialVoucherNo = voucherNoFromUrl || storedVoucherNo || "";
    setVoucherData(prev => ({ ...prev, voucherNo: initialVoucherNo }));
    localStorage.setItem('voucherNo', initialVoucherNo);
    setIsVoucherNoRequired(!!voucherNoFromUrl);
  }, [voucherNoFromUrl]);

  useEffect(() => {
    if (voucherData.frontImage && !processedFrontImage) {
      processSignatureImage(`data:image/jpeg;base64,${voucherData.frontImage}`).then(setProcessedFrontImage);
    }
  }, [voucherData.frontImage, processedFrontImage]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setCurrentAction("Fetching device list...");
        const deviceListResponse = await api.getDeviceList();
        setDevices(deviceListResponse.devices);

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
      interval = setInterval(async () => {
        try {
          const response = await api.getDeviceStatus();
          setIsDeviceConnected(response.connected);
          setConnectedDevice(response.deviceName || "");
          if (response.connected) {
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
        }
      }, 10000);
    }
    return () => {
      if (interval) {
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
    } finally {
      setIsLoading(false);
      setCurrentAction("");
    }
  };

  const handleScanVoucher = async () => {
    if (!isDeviceConnected) {
      toast({
        title: "Device Not Connected",
        description: "Please connect the device before scanning.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setCurrentAction(`Scanning ${docType === 'CHECK' ? 'check' : 'card'}...`);
    try {
      const setDocTypeResponse = await api.setDocType(docType);
      if (!setDocTypeResponse.success) {
        toast({
          title: "Document Type Error",
          description: setDocTypeResponse.message || "Failed to set document type.",
          variant: "destructive"
        });
        return;
      }
      const response: ScanResponse = await api.scanVoucher();
      if (isErrorResponse(response) && !response.success) {
        toast({
          title: "Scan Failed",
          description: response.message || `Failed to scan ${docType === 'CHECK' ? 'check' : 'card'}. Please try again.`,
          variant: "destructive"
        });
        return;
      }
      if ('voucherNo' in response && (response.frontImage || response.backImage || response.cardType || response.trackData1 || response.trackData2 || response.mpData)) {
        setVoucherData(prev => ({
          ...prev,
          voucherType: response.voucherType,
          micr: response.micr,
          frontImage: response.frontImage,
          backImage: response.backImage,
          frontImagePath: response.frontImagePath,
          backImagePath: response.backImagePath,
          trackData1: response.trackData1,
          trackData2: response.trackData2,
          trackData3: response.trackData3,
          mpData: response.mpData,
          cardType: response.cardType,
          magnePrintStatus: response.magnePrintStatus,
          track1Status: response.track1Status,
          track2Status: response.track2Status,
          track3Status: response.track3Status,
          getScore: response.getScore,
          deviceSerialNumber: response.deviceSerialNumber,
          dukptSerialNumber: response.dukptSerialNumber,
          encryptedSessionId: response.encryptedSessionId,
          encryptedTrack1: response.encryptedTrack1,
          encryptedTrack2: response.encryptedTrack2,
          encryptedTrack3: response.encryptedTrack3,
          checkNumber: response.checkNumber,
          routingNumber: response.routingNumber,
          accountNumber: response.accountNumber,
          bankCode: response.bankCode,
          checkDate: response.checkDate,
          amount: response.amount,
          amountWords: response.amountWords,
          accountHolder: response.accountHolder,
          signature: response.signature
        }));
        setHasScanned(true);
        toast({
          title: "Scan Successful",
          description: docType === 'CHECK' 
            ? `Voucher scanned${response.voucherNo ? ` (${response.voucherNo})` : ""}.`
            : `Card scanned${response.cardType ? ` (${response.cardType})` : ""}.`
        });
      } else {
        toast({
          title: "Scan Failed",
          description: `No data captured. Please ensure the ${docType === 'CHECK' ? 'check' : 'card'} is properly inserted and try again.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
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
      toast({
        title: "No Data",
        description: "Please scan a voucher or card before saving.",
        variant: "destructive"
      });
      return;
    }
    if (isVoucherNoRequired && !voucherData.voucherNo) {
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
      const response = await api.saveToDatabase(saveData);
      if (response.success) {
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
        setShowAdvanced(false);
        setIsModalOpen(false);
        setIsCompareModalOpen(false);
        setUploadedSignature(null);
        setSimilarity(null);
        setProcessedFrontImage(null);
        if (!isVoucherNoRequired) {
          localStorage.removeItem('voucherNo');
        }
      } else {
        toast({
          title: "Save Failed",
          description: response.message || "Failed to save data to database.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
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

  const handleExit = () => {
    window.location.reload();
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && /image\/(jpeg|jpg|png)/.test(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedSignature(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a JPEG, JPG, or PNG image.",
        variant: "destructive"
      });
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && /image\/(jpeg|jpg|png)/.test(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedSignature(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a JPEG, JPG, or PNG image.",
        variant: "destructive"
      });
    }
  };

  const handleCompareSignatures = async () => {
    if (!processedFrontImage || !uploadedSignature) {
      toast({
        title: "Missing Images",
        description: "Please upload a second signature image to compare.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCurrentAction("Comparing signatures...");
    try {
      const formData = new FormData();
      const frontBlob = await fetch(processedFrontImage).then(res => res.blob());
      const uploadedBlob = await fetch(uploadedSignature).then(res => res.blob());
      formData.append('signature1', frontBlob, 'signature1.jpg');
      formData.append('signature2', uploadedBlob, 'signature2.jpg');

      const response = await fetch('http://localhost:5000/compare-signatures', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        const similarityValue = parseFloat(result.similarity) * 100; // Convert to percentage
        setSimilarity(similarityValue);
        toast({
          title: "Comparison Result",
          description: `Similarity: ${similarityValue.toFixed(2)}%`,
        });
      } else {
        setSimilarity(null);
        toast({
          title: "Comparison Failed",
          description: result.error || "Failed to compare signatures.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setSimilarity(null);
      toast({
        title: "Comparison Error",
        description: error.message || "An error occurred while comparing signatures.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setCurrentAction("");
    }
  };

  const handleReset = () => {
    setUploadedSignature(null);
    setSimilarity(null);
  };

  const handleClear = () => {
    setUploadedSignature(null);
  };

  const handleOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setIsCompareModalOpen(false);
    }
  };

  const { cardNumber, cardholderName, expiryDate, cardBrand } = parseCardDetails(voucherData.trackData1, voucherData.trackData2);

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
              onChange={(e) => setDocType(e.target.value as 'CHECK' | 'MSR')}
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
                value={voucherData.voucherNo}
                readOnly={true}
                required={isVoucherNoRequired}
                compact={true}
              />
              <InfoField
                label="Narration"
                value={voucherData.narration}
                onChange={(value) => setVoucherData(prev => ({ ...prev, narration: value }))}
                readOnly={false}
                placeholder="Enter narration"
                compact={true}
              />
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
                              MjMtMDItMTNUMDg6MTU6MjkrMDA6MDA4eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAy
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
                    onCompare={() => setIsCompareModalOpen(true)} 
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
                    <p className="text-sm"><strong>Amount:</strong> {voucherData.amount || 'N/A'}</p>
                    <p className="text-sm"><strong>Amount in Words:</strong> {voucherData.amountWords || 'N/A'}</p>
                    <p className="text-sm"><strong>Signature:</strong> {voucherData.signature || 'N/A'}</p>
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
            {isCompareModalOpen && processedFrontImage && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={handleOutsideClick}
              >
                <div className="bg-white p-4 rounded-lg shadow-2xl max-w-2xl w-full flex flex-col gap-2 relative transform transition-all duration-300 hover:scale-[1.01]">
                  <button
                    onClick={() => setIsCompareModalOpen(false)}
                    className="absolute top-2 right-2 p-1 text-white bg-gray-800 hover:bg-red-600 rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-800 mb-2 text-center">Signature Comparison</h2>
                  {similarity !== null && (
                    <div className={`text-sm font-semibold mb-2 text-center ${getSimilarityColor(similarity)}`}>
                      Similarity: {similarity.toFixed(2)}%
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="bg-white border border-dashed border-gray-300 rounded-md h-48 flex items-center justify-center flex-1 shadow-md hover:shadow-lg transition-all duration-200">
                      <img 
                        src={processedFrontImage} 
                        alt="Processed front image for signature comparison"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div
                        className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-md h-48 flex items-center justify-center cursor-pointer relative overflow-hidden shadow-md hover:shadow-lg hover:border-blue-400 transition-all duration-200"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadedSignature ? (
                          <img 
                            src={uploadedSignature} 
                            alt="Uploaded signature"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-gray-600 text-center px-2 text-xs">Drag and drop or click to upload a signature image (JPEG/JPG/PNG)</span>
                        )}
                        <button
                          onClick={handleClear}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          title="Clear image"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <button
                      onClick={handleReset}
                      className="p-2 px-6 text-xs text-white bg-yellow-500 hover:bg-yellow-600 rounded flex items-center gap-1 shadow-md hover:shadow-lg transition-all"
                    >
                      <RefreshCw className="h-4 w-4" /> Reset
                    </button>
                    <button
                      onClick={handleCompareSignatures}
                      className="p-2 px-6 text-xs text-white bg-green-500 hover:bg-green-600 rounded flex items-center gap-1 shadow-md hover:shadow-lg transition-all"
                    >
                      Compare
                    </button>
                  </div>
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