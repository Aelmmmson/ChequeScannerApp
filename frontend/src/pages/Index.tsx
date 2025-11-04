import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import DeviceStatus from '@/components/DeviceStatus';
import SidebarButton from '@/components/SidebarButton';
import InfoField from '@/components/InfoField';
import ImageDisplay from '@/components/ImageDisplay';
import { api } from '@/services/api';
import { ChevronDown, Scan, Save, Power, X, RefreshCw, User, Camera, ScanFace, CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Function to process signature image (crop, grayscale, high contrast)
const processSignatureImage = (base64Image: string, requiredSignatures: number = 1): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);

      const results: string[] = [];

      if (requiredSignatures === 1) {
        // Single signature crop
        const cropWidth = img.width * 0.25;
        const cropHeight = img.height * 0.13;
        const marginFromBottom = img.height * 0.18;
        const cropX = img.width - cropWidth;
        const cropY = img.height - cropHeight - marginFromBottom;
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // Convert to grayscale
        const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);

        // Apply high contrast
        const contrast = 100;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(Math.max(factor * (data[i] - 128) + 128, 0), 255);
          data[i + 1] = Math.min(Math.max(factor * (data[i + 1] - 128) + 128, 0), 255);
          data[i + 2] = Math.min(Math.max(factor * (data[i + 2] - 128) + 128, 0), 255);
        }
        ctx.putImageData(imageData, 0, 0);

        results.push(canvas.toDataURL('image/jpeg'));
      } else {
        // Multiple signatures crop
        const cropWidth = img.width * 0.20;
        const cropHeight = img.height * 0.22;
        const marginFromBottom = img.height * 0.18;
        const marginBetween = img.width * 0.01;

        for (let i = 0; i < requiredSignatures; i++) {
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          const cropX = img.width - (cropWidth * (requiredSignatures - i)) - (marginBetween * i);
          const cropY = img.height - cropHeight - marginFromBottom;

          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

          // Convert to grayscale
          const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
          const data = imageData.data;
          for (let j = 0; j < data.length; j += 4) {
            const gray = 0.2989 * data[j] + 0.5870 * data[j + 1] + 0.1140 * data[j + 2];
            data[j] = data[j + 1] = data[j + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);

          // Apply high contrast
          const contrast = 100;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          for (let j = 0; j < data.length; j += 4) {
            data[j] = Math.min(Math.max(factor * (data[j] - 128) + 128, 0), 255);
            data[j + 1] = Math.min(Math.max(factor * (data[j + 1] - 128) + 128, 0), 255);
            data[j + 2] = Math.min(Math.max(factor * (data[j + 2] - 128) + 128, 0), 255);
          }
          ctx.putImageData(imageData, 0, 0);

          results.push(canvas.toDataURL('image/jpeg'));
        }
      }

      resolve(results);
    };
    img.src = base64Image;
  });
};

// Function to fetch account data (signatures and photos) from external API
const fetchAccountData = async (accountNumber: string): Promise<{ signatures: string[], photos: string[], requiredSignatures: number, accountType: string }> => {
  try {
    const response = await api.fetchAccountData(accountNumber);
    if (!response.approved || !Array.isArray(response.approved) || response.approved.length === 0) {
      throw new Error('Invalid response from external API: approved array is missing or empty');
    }
    const signatures = [];
    const photos = [];
    for (const item of response.approved) {
      if (!item.signature || !item.photo) {
        throw new Error('Invalid response from external API: signature or photo missing in approved item');
      }
      signatures.push(item.signature);
      photos.push(item.photo);
    }
    return {
      signatures,
      photos,
      requiredSignatures: response.approved.length, // Use number of signatures returned by API
      accountType: response.approved.length > 1 ? 'joint' : 'personal' // Infer account type
    };
  } catch (error: unknown) {
    console.error('Error fetching account data:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
};

// Function to compare signatures
const compareSignatures = async (chequeSignatures: string[], dbSignatures: string[]): Promise<number[][]> => {
  const similarities: number[][] = [];
  for (const chequeSig of chequeSignatures) {
    const chequeSimilarities: number[] = [];
    for (const dbSig of dbSignatures) {
      try {
        const formData = new FormData();
        const chequeBlob = await fetch(chequeSig).then(res => res.blob());
        const dbBlob = await fetch(dbSig).then(res => res.blob());
        formData.append('signature1', chequeBlob, 'signature1.jpg');
        formData.append('signature2', dbBlob, 'signature2.jpg');

        const response = await fetch('http://localhost:7007/compare-signatures', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (response.ok) {
          const similarity = parseFloat(result.similarity) * 100;
          chequeSimilarities.push(similarity);
        } else {
          chequeSimilarities.push(0);
        }
      } catch (error: unknown) {
        console.error('Error comparing signatures:', error);
        chequeSimilarities.push(0);
      }
    }
    similarities.push(chequeSimilarities);
  }
  return similarities;
};

// Function to compare faces
const compareFaces = async (capturedFace: string, customerPhotos: string[]): Promise<FaceResult[]> => {
  const results: FaceResult[] = [];
  for (const customerPhoto of customerPhotos) {
    try {
      const formData = new FormData();
      const liveBlob = await fetch(capturedFace).then(res => res.blob());
      const customerBlob = await fetch(customerPhoto).then(res => res.blob());
      formData.append('livePhoto', liveBlob, 'livePhoto.jpg');
      formData.append('customerPhoto', customerBlob, 'customerPhoto.jpg');

      const response = await fetch('http://localhost:7007/compare-faces', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        results.push({
          faceUrl: customerPhoto,
          isMatch: result.isMatch,
          similarity: result.similarity * 100
        });
      } else {
        results.push({
          faceUrl: customerPhoto,
          isMatch: false,
          similarity: 0
        });
      }
    } catch (error: unknown) {
      console.error('Error comparing faces:', error);
      results.push({
        faceUrl: customerPhoto,
        isMatch: false,
        similarity: 0
      });
    }
  }
  return results;
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
  payeeName: string;
  bankName: string;
  bankBranch: string;
  requiredSignatures: string;
  signaturesPresent: string;
  signatureStatus: string;
  amountMismatch: string;
}

interface ErrorResponse {
  success: boolean;
  message: string;
}

interface FaceResult {
  faceUrl: string;
  isMatch: boolean;
  similarity: number;
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


// DetailItem component for consistent field display
interface DetailItemProps {
  label: string;
  value: string;
  highlight?: boolean;
  secure?: boolean;
}

// Compact DetailItem component
const DetailItem: React.FC<DetailItemProps> = ({ label, value, highlight = false, secure = false }) => {
  const displayValue = secure && value ? '••••' + value.slice(-4) : value;
  
  return (
    <div className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
      <label className="text-xs font-medium text-gray-500 block mb-0.5">{label}</label>
      <div className={`text-sm ${highlight ? 'font-semibold text-blue-700' : 'text-gray-900'}`}>
        {displayValue || 'N/A'}
      </div>
    </div>
  );
};

// StatusItem component for status fields with colored indicators
interface StatusItemProps {
  label: string;
  value: string;
  type?: "success" | "error" | "warning" | "neutral";
}

// Compact StatusItem component
const StatusItem: React.FC<StatusItemProps> = ({ label, value, type = "neutral" }) => {
  const getStatusStyles = () => {
    switch (type) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "!";
      default:
        return "•";
    }
  };

  return (
    <div className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusStyles()}`}>
        <span className="mr-1 text-xs">{getStatusIcon()}</span>
        {value || 'N/A'}
      </div>
    </div>
  );
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
  const [chequeSignatures, setChequeSignatures] = useState<string[]>([]);
  const [dbSignatures, setDbSignatures] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<number[][]>([]);
  const [requiredSignatures, setRequiredSignatures] = useState<number>(1);
  const [accountType, setAccountType] = useState<string>('personal');
  const [isLoadingSignatures, setIsLoadingSignatures] = useState<boolean>(false);
  const [currentChequeIndex, setCurrentChequeIndex] = useState<number>(0);
  const [isFaceRecognitionOpen, setIsFaceRecognitionOpen] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [customerPhotos, setCustomerPhotos] = useState<string[]>([]);
  const [faceResults, setFaceResults] = useState<FaceResult[]>([]);
  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false);
  const [connectedDevice, setConnectedDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [devices, setDevices] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    signature: "",
    payeeName: "",
    bankName: "",
    bankBranch: "",
    requiredSignatures: "",
    signaturesPresent: "",
    signatureStatus: "",
    amountMismatch: ""
  });

  useEffect(() => {
    const storedVoucherNo = localStorage.getItem('voucherNo');
    const initialVoucherNo = voucherNoFromUrl || storedVoucherNo || "";
    setVoucherData(prev => ({ ...prev, voucherNo: initialVoucherNo }));
    localStorage.setItem('voucherNo', initialVoucherNo);
    setIsVoucherNoRequired(!!voucherNoFromUrl);
  }, [voucherNoFromUrl]);

  useEffect(() => {
    if (voucherData.frontImage && docType === 'CHECK' && isCompareModalOpen) {
      setIsLoadingSignatures(true);
      const fetchAndProcess = async () => {
        try {
          const { signatures, requiredSignatures: reqSigs, accountType: accType } = await fetchAccountData(voucherData.accountNumber);
          const chequeSigs = await processSignatureImage(`data:image/jpeg;base64,${voucherData.frontImage}`, reqSigs);
          const similarityScores = await compareSignatures(chequeSigs, signatures);

          setChequeSignatures(chequeSigs);
          setDbSignatures(signatures);
          setSimilarities(similarityScores);
          setRequiredSignatures(reqSigs);
          setAccountType(accType);
          setCurrentChequeIndex(0);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast({
            title: "Signature Fetch Error",
            description: errorMessage || "Failed to fetch or process signatures.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingSignatures(false);
        }
      };
      fetchAndProcess();
    }
  }, [voucherData.frontImage, isCompareModalOpen, voucherData.accountNumber, docType, toast]);

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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: "Initialization Error",
          description: errorMessage || "Error fetching devices or connecting.",
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
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

  // Function to handle face upload and comparison
  const handleFaceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select an image to upload.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageSrc = reader.result as string;
      setCapturedFace(imageSrc);

      if (!voucherData.accountNumber) {
        toast({
          title: "Missing Account Number",
          description: "Please scan a cheque to provide an account number before face recognition.",
          variant: "destructive"
        });
        setCapturedFace(null);
        return;
      }

      setIsLoading(true);
      setCurrentAction("Fetching customer photos...");

      try {
        const { photos } = await fetchAccountData(voucherData.accountNumber);
        setCustomerPhotos(photos);

        setCurrentAction("Comparing faces...");
        const results = await compareFaces(imageSrc, photos);

        setFaceResults(results);

        const bestResult = results.reduce((prev, curr) => curr.similarity > prev.similarity ? curr : prev, results[0]);
        toast({
          title: bestResult.isMatch ? "Face Match Found" : "No Face Match",
          description: `Best Similarity: ${bestResult.similarity.toFixed(2)}%`,
          variant: bestResult.isMatch ? "default" : "destructive"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: "Face Comparison Error",
          description: errorMessage || "Failed to compare faces.",
          variant: "destructive"
        });
        setCustomerPhotos([]);
        setFaceResults([]);
      } finally {
        setIsLoading(false);
        setCurrentAction("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Open face recognition sidebar
  const handleOpenFaceRecognition = () => {
    setIsFaceRecognitionOpen(true);
    setCapturedFace(null);
    setCustomerPhotos([]);
    setFaceResults([]);
  };

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsFaceRecognitionOpen(false);
        setCapturedFace(null);
        setCustomerPhotos([]);
        setFaceResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Connection Error",
        description: errorMessage || "An error occurred while connecting to the device.",
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
        let updatedVoucherData = {
          ...voucherData,
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
          signature: response.signature,
          payeeName: response.payeeName,
          bankName: response.bankName,
          bankBranch: response.bankBranch,
          requiredSignatures: response.requiredSignatures,
          signaturesPresent: response.signaturesPresent,
          signatureStatus: response.signatureStatus,
          amountMismatch: response.amountMismatch
        };

        // If scanning a check, extract additional data using server.js
        if (docType === 'CHECK' && response.frontImage) {
          try {
            setCurrentAction("Extracting cheque data...");
            const ocrResponse = await api.extractChequeData(response.frontImage);
            if (ocrResponse.success && ocrResponse.extractedData) {
              updatedVoucherData = {
                ...updatedVoucherData,
                micr: ocrResponse.extractedData.MICR || updatedVoucherData.micr || "",
                checkNumber: ocrResponse.extractedData.CheckNumber || updatedVoucherData.checkNumber || "",
                routingNumber: ocrResponse.extractedData.RoutingNumber || updatedVoucherData.routingNumber || "",
                accountNumber: ocrResponse.extractedData.AccountNumber || updatedVoucherData.accountNumber || "",
                bankCode: ocrResponse.extractedData.BankCode || updatedVoucherData.bankCode || "",
                accountHolder: ocrResponse.extractedData.PayerAccountHolderName || updatedVoucherData.accountHolder || "",
                amount: ocrResponse.extractedData.AmountFigures || updatedVoucherData.amount || "",
                amountWords: ocrResponse.extractedData.AmountWords || updatedVoucherData.amountWords || "",
                checkDate: ocrResponse.extractedData.Date || updatedVoucherData.checkDate || "",
                payeeName: ocrResponse.extractedData.PayeeName || "",
                bankName: ocrResponse.extractedData.BankName || "",
                bankBranch: ocrResponse.extractedData.BankBranch || "",
                requiredSignatures: ocrResponse.extractedData.RequiredSignatures || "",
                signaturesPresent: ocrResponse.extractedData.SignaturesPresent || "",
                signatureStatus: ocrResponse.extractedData.SignatureStatus || "",
                amountMismatch: ocrResponse.extractedData.AmountMismatch || ""
              };
              toast({
                title: "Data Extracted",
                description: "Successfully extracted additional cheque data."
              });
            } else {
              toast({
                title: "OCR Extraction Failed",
                description: ocrResponse.error || "Failed to extract cheque data.",
                variant: "destructive"
              });
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast({
              title: "OCR Extraction Error",
              description: errorMessage || "Error extracting cheque data.",
              variant: "destructive"
            });
          }
        }

        setVoucherData(updatedVoucherData);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Scan Error",
        description: errorMessage || `An error occurred while scanning the ${docType === 'CHECK' ? 'check' : 'card'}.`,
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
        signature: docType === 'CHECK' ? voucherData.signature : "",
        payeeName: docType === 'CHECK' ? voucherData.payeeName : "",
        bankName: docType === 'CHECK' ? voucherData.bankName : "",
        bankBranch: docType === 'CHECK' ? voucherData.bankBranch : "",
        requiredSignatures: docType === 'CHECK' ? voucherData.requiredSignatures : "",
        signaturesPresent: docType === 'CHECK' ? voucherData.signaturesPresent : "",
        signatureStatus: docType === 'CHECK' ? voucherData.signatureStatus : "",
        amountMismatch: docType === 'CHECK' ? voucherData.amountMismatch : ""
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
          signature: "",
          payeeName: "",
          bankName: "",
          bankBranch: "",
          requiredSignatures: "",
          signaturesPresent: "",
          signatureStatus: "",
          amountMismatch: ""
        });
        setHasScanned(false);
        setShowAdvanced(false);
        setIsModalOpen(false);
        setIsCompareModalOpen(false);
        setIsFaceRecognitionOpen(false);
        setChequeSignatures([]);
        setDbSignatures([]);
        setSimilarities([]);
        setRequiredSignatures(1);
        setAccountType('personal');
        setCapturedFace(null);
        setCustomerPhotos([]);
        setFaceResults([]);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Save Error",
        description: errorMessage || "An error occurred while saving to the database.",
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

  const handleOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setIsCompareModalOpen(false);
    }
  };

  const { cardNumber, cardholderName, expiryDate, cardBrand } = parseCardDetails(voucherData.trackData1, voucherData.trackData2);

  // Slider settings for pagination
  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true
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
        <main className="flex-1 p-8 overflow-y-auto space-y-4 relative">
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
                <div className="flex items-center gap-2">
                  <InfoField
                    label="Bank Code"
                    value={voucherData.bankCode}
                    readOnly={true}
                    compact={true}
                  />
                  {/* <button
                    onClick={handleOpenFaceRecognition}
                    className="relative group flex items-center justify-center p-2 text-gray-700 hover:text-blue-600 transition-colors"
                    title="ScanFace Recognition"
                  >
                    <ScanFace className="h-4 w-4" />
                    <span className="absolute top-full mt-2 hidden group-hover:block bg-blue-600 text-white text-[10px] rounded py-0.5 px-1 whitespace-nowrap">
                      ScanFace Recognition
                    </span>
                  </button> */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={!hasScanned || docType !== 'CHECK'}
                    className="relative group flex items-center justify-center p-2 bg-blue-600 text-white hover:text-gray-100 transition-colors rounded-sm" 
                  >
                    Advanced
                    <span className="absolute top-full mt-2 hidden group-hover:block bg-blue-600 text-white text-[10px] rounded py-0.5 px-1 whitespace-nowrap">
                      Other or Advanced Options
                    </span>
                  </button>
                </div>
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
                              MTNUMDg6MTk6NTYrMDA6MDCjlq7LAAAAJXRFWHRkYXRlOm1oZGlmeQAyMDIzLTAyLTEzVDA4OjE5
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
            <footer className="py-4 text-center">
              <p className="text-blue-600 text-sm italic animate-pulse">Powered by X100</p>
            </footer>
          </div>
          {isFaceRecognitionOpen && (
            <aside
              ref={sidebarRef}
              className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">ScanFace Recognition</h2>
                <button
                  onClick={() => {
                    setIsFaceRecognitionOpen(false);
                    setCapturedFace(null);
                    setCustomerPhotos([]);
                    setFaceResults([]);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="border border-dashed border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload Face Image</h3>
                  <div className="relative h-64 bg-gray-100 rounded-md flex items-center justify-center mb-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-gray-600">Processing...</span>
                      </div>
                    ) : capturedFace ? (
                      <img
                        src={capturedFace}
                        alt="Uploaded face"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2" />
                        <p>No face uploaded</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFaceUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={`w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Camera className="h-4 w-4" />
                    Upload Photo
                  </button>
                </div>
                {customerPhotos.length > 0 && faceResults.length > 0 && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Customer Faces</h3>
                    <Slider {...sliderSettings}>
                      {customerPhotos.map((photo, index) => (
                        <div key={index} className="relative h-64 flex items-center justify-center">
                          <img
                            src={photo}
                            alt={`Customer face ${index + 1}`}
                            className="max-h-full max-w-full object-contain transition-transform duration-200 hover:scale-110"
                          />
                          <div className="absolute top-2 right-2">
                            {faceResults[index]?.isMatch ? (
                              <CheckCircle className="h-6 w-6 text-green-500 bg-white bg-opacity-75 rounded-full p-1" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-500 bg-white bg-opacity-75 rounded-full p-1" />
                            )}
                          </div>
                          <div className="absolute bottom-2 text-center w-full">
                            <span className={`text-sm font-semibold ${getSimilarityColor(faceResults[index]?.similarity || 0)}`}>
                              Similarity: {(faceResults[index]?.similarity || 0).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </Slider>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setIsFaceRecognitionOpen(false);
                    setCapturedFace(null);
                    setCustomerPhotos([]);
                    setFaceResults([]);
                  }}
                  className="p-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </aside>
          )}
          {isModalOpen && docType === 'CHECK' && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Check Details</h2>
            <p className="text-gray-500 text-xs mt-0.5">Complete check information</p>
          </div>
          <div className="bg-blue-100 rounded px-3 py-1 border border-blue-200">
            <span className="text-blue-800 text-xs font-semibold">CHECK</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Check Basic Info */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Check Information
              </h3>
              <div className="space-y-2">
                <DetailItem label="Check Number" value={voucherData.checkNumber || ''} />
                <DetailItem label="Amount" value={voucherData.amount || ''} highlight />
                <DetailItem label="Date" value={voucherData.checkDate || ''} />
                <DetailItem label="Payee Name" value={voucherData.payeeName || ''} />
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                Bank Details
              </h3>
              <div className="space-y-2">
                <DetailItem label="Bank Name" value={voucherData.bankName || ''} />
                <DetailItem label="Bank Branch" value={voucherData.bankBranch || ''} />
                <DetailItem label="Bank Code" value={voucherData.bankCode || ''} />
                <DetailItem label="Routing Number" value={voucherData.routingNumber || ''} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Account Information */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                Account Information
              </h3>
              <div className="space-y-2">
                <DetailItem label="Account Holder" value={voucherData.accountHolder || ''} />
                <DetailItem label="Account Number" value={voucherData.accountNumber || ''} secure />
                <DetailItem label="Full MICR" value={voucherData.micr || ''} />
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Verification Status
              </h3>
              <div className="space-y-2">
                <StatusItem 
                  label="Amount Mismatch" 
                  value={voucherData.amountMismatch || ''} 
                  type={voucherData.amountMismatch === "Yes" ? "error" : (voucherData.amountMismatch === "No" ? "success" : "neutral")}
                />
                <StatusItem 
                  label="Signature Status" 
                  value={voucherData.signatureStatus || ''} 
                  type={
                    voucherData.signatureStatus === "INSUFFICIENT" || voucherData.signatureStatus === "NONE" ? "error" :
                    (voucherData.signatureStatus === "VALID" ? "success" : "neutral")
                  }
                />
                <DetailItem label="Required Signatures" value={voucherData.requiredSignatures || ''} />
                <DetailItem label="Signatures Present" value={voucherData.signaturesPresent || ''} />
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Additional Details</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Amount in Words</label>
                  <div className="text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 min-h-[60px] text-xs leading-relaxed">
                    {voucherData.amountWords || 'N/A'}
                  </div>
                </div>
                <DetailItem label="Signature" value={voucherData.signature || ''} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <button
          onClick={() => setIsModalOpen(false)}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close Details
        </button>
      </div>
    </div>
  </div>
)}
          {isCompareModalOpen && voucherData.frontImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={handleOutsideClick}
            >
              <div className="bg-white p-4 rounded-lg shadow-2xl max-w-4xl w-full flex flex-col gap-2 relative transform transition-all duration-300 hover:scale-[1.01]">
                <button
                  onClick={() => setIsCompareModalOpen(false)}
                  className="absolute top-2 right-2 p-1 text-white bg-gray-800 hover:bg-red-600 rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
                <h2 className="text-lg font-bold text-gray-700 mb-2 text-center">Signature Comparison</h2>
                {isLoadingSignatures ? (
                  <div className="text-center text-sm text-gray-600 animate-pulse">Loading signatures...</div>
                ) : chequeSignatures.length === 0 || dbSignatures.length === 0 ? (
                  <div className="text-center text-sm text-red-600">No signatures available for comparison.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end items-center">
                      {chequeSignatures.length > 1 && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentChequeIndex((prev) => Math.max(prev - 1, 0))}
                            disabled={currentChequeIndex === 0}
                            className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCurrentChequeIndex((prev) => Math.min(prev + 1, chequeSignatures.length - 1))}
                            disabled={currentChequeIndex === chequeSignatures.length - 1}
                            className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 items-center justify-center">
                      <div className="bg-white border border-dashed border-gray-300 rounded-md h-48 w-48 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200">
                        <img 
                          src={chequeSignatures[currentChequeIndex]} 
                          alt={`Cheque signature ${currentChequeIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {dbSignatures.map((dbSig, dbIndex) => (
                        <div key={dbIndex} className="relative bg-white border border-dashed border-gray-300 rounded-md h-48 w-48 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200">
                          <img 
                            src={dbSig} 
                            alt={`Database signature ${dbIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                          />
                          <div className="absolute top-2 right-2 text-xs font-semibold text-white bg-black bg-opacity-50 rounded px-1 py-0.5">
                            {similarities[currentChequeIndex][dbIndex].toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-center text-gray-500">
                      Cheque Signature {currentChequeIndex + 1} of {chequeSignatures.length}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setChequeSignatures([]);
                    setDbSignatures([]);
                    setSimilarities([]);
                    setCurrentChequeIndex(0);
                    setIsCompareModalOpen(false);
                  }}
                  className="p-2 px-6 text-xs text-white bg-yellow-500 hover:bg-yellow-600 rounded flex items-center gap-1 shadow-md hover:shadow-lg transition-all mx-auto mt-2"
                >
                  <RefreshCw className="h-4 w-4" /> Reset
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;