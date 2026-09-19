import React, { useState, useEffect, useRef } from 'react';
import usgLogo from '@/assets/usg-logo.png';
import { useToast } from "@/components/ui/use-toast";
import DeviceStatus from '@/components/DeviceStatus';
import SidebarButton from '@/components/SidebarButton';
import InfoField from '@/components/InfoField';
import ImageDisplay from '@/components/ImageDisplay';
import { api } from '@/services/api';
import { appConfig } from '@/config/appConfig';
import { parseMicr } from '@/utils/micrParser';
import { SignatureCropOverlay } from '@/components/SignatureCropOverlay';
import ProgressiveFluxLoader from '@/components/ui/progressive-flux-loader';
import { ChevronDown, Scan, Save, Power, X, RefreshCw, User, Camera, ScanFace, CheckCircle, XCircle, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, Crop, AlertTriangle, FileText, CreditCard, Check, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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

// Helper to robustly extract voucher number from URL (handles ?voucherNo=123, ?voucherNo-123, ?voucherNo:123, etc.)
const extractVoucherNoFromUrl = (search: string): string => {
  if (!search) return "";
  const match = search.match(/(?:voucherNo|vNo|voucher_no|voucher)[=\-:\s]?([A-Za-z0-9_\-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const params = new URLSearchParams(search);
  return params.get('voucherNo') || params.get('voucher_no') || params.get('vNo') || "";
};

const Index = () => {
  const { toast } = useToast();
  const location = useLocation();
  const voucherNoFromUrl = extractVoucherNoFromUrl(location.search);
  const [docType, setDocType] = useState<'CHECK' | 'MSR'>('CHECK');
  const [isVoucherNoRequired, setIsVoucherNoRequired] = useState(!!voucherNoFromUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [collapseTimer, setCollapseTimer] = useState<number>(30);
  const [chequeSignatures, setChequeSignatures] = useState<string[]>([]);
  const [dbSignatures, setDbSignatures] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<number[][]>([]);
  const [requiredSignatures, setRequiredSignatures] = useState<number>(1);
  const [accountType, setAccountType] = useState<string>('personal');
  const [isLoadingSignatures, setIsLoadingSignatures] = useState<boolean>(false);
  const [currentChequeIndex, setCurrentChequeIndex] = useState<number>(0);
  const [mandateData, setMandateData] = useState<{ account_mandate?: string; enq_details?: any[] } | null>(null);
  const [croppedChequeSig, setCroppedChequeSig] = useState<string | null>(null);
  const [autoCroppedSig, setAutoCroppedSig] = useState<string>('');
  const [customCroppedSig, setCustomCroppedSig] = useState<string>('');
  const [activeCropMode, setActiveCropMode] = useState<'auto' | 'custom'>('auto');
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [isRecalculatingScores, setIsRecalculatingScores] = useState<boolean>(false);
  const [confirmDecision, setConfirmDecision] = useState<'VALID' | 'INVALID' | null>(null);
  const [comparisonScores, setComparisonScores] = useState<{ index: number; similarity: number; percentage: string; status: string }[]>([]);
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
  const [extractionResult, setExtractionResult] = useState<any>(null);
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
    countryCode: "",
    stateCode: "",
    branchCode: "",
    transactionCode: "",
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
  const [isRecordSaved, setIsRecordSaved] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const [isAsideHovered, setIsAsideHovered] = useState<boolean>(false);

  // Automatically trigger signature validation right aside when front image is available
  useEffect(() => {
    if (appConfig.SIGNATURE_VALIDATION_ENABLED === 'Y' && voucherData.frontImage && docType === 'CHECK') {
      setIsCompareModalOpen(true);
      setCollapseTimer(30);
    }
  }, [voucherData.frontImage, docType]);

  // 30-second auto-collapse timer for signature validation right aside
  // Only counts down when user is idle (not hovering, not mapping custom crop, and not loading)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isCompareModalOpen) {
      interval = setInterval(() => {
        // If user is actively interacting, hovering, or cropping, hold/reset the timer to 30s
        if (isAsideHovered || isCardFlipped || isLoadingSignatures || isRecalculatingScores) {
          setCollapseTimer(30);
        } else {
          setCollapseTimer(prev => {
            if (prev <= 1) {
              setIsCompareModalOpen(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      setCollapseTimer(30);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCompareModalOpen, isAsideHovered, isCardFlipped, isLoadingSignatures, isRecalculatingScores]);

  useEffect(() => {
    const storedVoucherNo = localStorage.getItem('voucherNo');
    const initialVoucherNo = voucherNoFromUrl || storedVoucherNo || "";
    setVoucherData(prev => ({ ...prev, voucherNo: initialVoucherNo }));
    localStorage.setItem('voucherNo', initialVoucherNo);
    setIsVoucherNoRequired(!!voucherNoFromUrl);
  }, [voucherNoFromUrl]);

  useEffect(() => {
    if (appConfig.SIGNATURE_VALIDATION_ENABLED === 'Y' && voucherData.frontImage && docType === 'CHECK' && isCompareModalOpen) {
      setIsLoadingSignatures(true);
      const fetchAndProcessSignatures = async () => {
        try {
          // 1. Crop signature from front image using Python backend
          const cropRes = await api.cropSignature(`data:image/jpeg;base64,${voucherData.frontImage}`);
          let croppedSig = `data:image/jpeg;base64,${voucherData.frontImage}`;
          if (cropRes.success && cropRes.croppedImage) {
            const formattedSig = cropRes.croppedImage.startsWith('data:') ? cropRes.croppedImage : `data:image/jpeg;base64,${cropRes.croppedImage}`;
            croppedSig = formattedSig;
            setAutoCroppedSig(formattedSig);
            setCroppedChequeSig(formattedSig);
            setActiveCropMode('auto');
          } else {
            setAutoCroppedSig(croppedSig);
            setCroppedChequeSig(croppedSig);
            setActiveCropMode('auto');
          }

          // 2. Fetch mandate details and specimen signatures from Core Mandate API
          const accNo = voucherData.accountNumber?.trim();
          if (!accNo) {
            setMandateData({ enq_details: [] });
            setComparisonScores([]);
            setIsLoadingSignatures(false);
            return;
          }

          const mandateRes = await api.getAccountSignatures(accNo);
          setMandateData(mandateRes);

          // 3. Compare cropped signature against each mandate specimen
          const scores: { index: number; similarity: number; percentage: string; status: string }[] = [];
          if (mandateRes && mandateRes.enq_details && Array.isArray(mandateRes.enq_details)) {
            for (let i = 0; i < mandateRes.enq_details.length; i++) {
              const item = mandateRes.enq_details[i];
              if (item.signature) {
                const specSig = item.signature.startsWith('data:') ? item.signature : `data:image/jpeg;base64,${item.signature}`;
                const compRes = await api.compareSignatures(croppedSig, specSig);
                scores.push({
                  index: i,
                  similarity: compRes.similarityPercentage || 0,
                  percentage: compRes.percentage || '0%',
                  status: compRes.status || 'UNKNOWN'
                });
              }
            }
          }
          setComparisonScores(scores);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast({
            title: "Mandate Fetch Warning",
            description: errorMessage || "Failed to fetch account mandate signatures.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingSignatures(false);
        }
      };
      fetchAndProcessSignatures();
    }
  }, [voucherData.frontImage, isCompareModalOpen, voucherData.accountNumber, docType, toast]);

  const handleCustomCropApply = async (customRoi: { x: number; y: number; w: number; h: number }) => {
    if (!voucherData.frontImage) return;
    setIsRecalculatingScores(true);
    try {
      // 1. Crop signature using custom ROI selected by the user (with isCustom=true flag so app.py preserves exact box)
      const cropRes = await api.cropSignature(`data:image/jpeg;base64,${voucherData.frontImage}`, { ...customRoi, isCustom: true });
      let croppedSig = `data:image/jpeg;base64,${voucherData.frontImage}`;
      if (cropRes.success && cropRes.croppedImage) {
        const formattedSig = cropRes.croppedImage.startsWith('data:') ? cropRes.croppedImage : `data:image/jpeg;base64,${cropRes.croppedImage}`;
        croppedSig = formattedSig;
        setCustomCroppedSig(formattedSig);
        setCroppedChequeSig(formattedSig);
        setActiveCropMode('custom');
      } else {
        setCustomCroppedSig(croppedSig);
        setCroppedChequeSig(croppedSig);
      }

      // Flip card back to front face to view results
      setIsCardFlipped(false);

      // 2. Fetch / verify account mandates
      let mandateRes = mandateData;
      if (!mandateRes || !mandateRes.enq_details) {
        const accNo = voucherData.accountNumber?.trim();
        if (accNo) {
          mandateRes = await api.getAccountSignatures(accNo);
          setMandateData(mandateRes);
        }
      }

      // 3. Recalculate comparison scores for all mandate signatories
      const scores: { index: number; similarity: number; percentage: string; status: string }[] = [];
      if (mandateRes && mandateRes.enq_details && Array.isArray(mandateRes.enq_details)) {
        for (let i = 0; i < mandateRes.enq_details.length; i++) {
          const item = mandateRes.enq_details[i];
          if (item.signature) {
            const specSig = item.signature.startsWith('data:') ? item.signature : `data:image/jpeg;base64,${item.signature}`;
            const compRes = await api.compareSignatures(croppedSig, specSig);
            scores.push({
              index: i,
              similarity: compRes.similarityPercentage || 0,
              percentage: compRes.percentage || '0%',
              status: compRes.status || 'UNKNOWN'
            });
          }
        }
      }
      setComparisonScores(scores);
      toast({
        title: "Custom Crop Mapped",
        description: "Signature comparisons updated for mapped area.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Crop Comparison Warning",
        description: errorMessage || "Failed to calculate comparison for custom crop area.",
        variant: "destructive"
      });
    } finally {
      setIsRecalculatingScores(false);
    }
  };

  const handleToggleCropMode = async (mode: 'auto' | 'custom') => {
    setActiveCropMode(mode);
    const targetSig = mode === 'auto' ? autoCroppedSig : customCroppedSig;
    if (!targetSig) return;
    setCroppedChequeSig(targetSig);

    if (mandateData?.enq_details) {
      setIsRecalculatingScores(true);
      try {
        const scores: { index: number; similarity: number; percentage: string; status: string }[] = [];
        for (let i = 0; i < mandateData.enq_details.length; i++) {
          const item = mandateData.enq_details[i];
          if (item.signature) {
            const specSig = item.signature.startsWith('data:') ? item.signature : `data:image/jpeg;base64,${item.signature}`;
            const compRes = await api.compareSignatures(targetSig, specSig);
            scores.push({
              index: i,
              similarity: compRes.similarityPercentage || 0,
              percentage: compRes.percentage || '0%',
              status: compRes.status || 'UNKNOWN'
            });
          }
        }
        setComparisonScores(scores);
      } finally {
        setIsRecalculatingScores(false);
      }
    }
  };

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
    setLoadingProgress(15);
    setCurrentAction("Connecting to device...");
    try {
      const response = await api.connectDevice();
      setLoadingProgress(60);
      if (response.success) {
        setIsDeviceConnected(true);
        const status = await api.getDeviceStatus();
        setConnectedDevice(status.deviceName || "");
        setLoadingProgress(100);
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
    setIsRecordSaved(false);
    setLoadingProgress(10);
    setCurrentAction(`Scanning ${docType === 'CHECK' ? 'check' : 'card'}...`);
    try {
      const setDocTypeResponse = await api.setDocType(docType);
      setLoadingProgress(25);
      if (!setDocTypeResponse.success) {
        toast({
          title: "Document Type Error",
          description: setDocTypeResponse.message || "Failed to set document type.",
          variant: "destructive"
        });
        return;
      }
      const response: ScanResponse = await api.scanVoucher();
      setLoadingProgress(55);
      if (isErrorResponse(response) && !response.success) {
        toast({
          title: "Scan Failed",
          description: response.message || `Failed to scan ${docType === 'CHECK' ? 'check' : 'card'}. Please try again.`,
          variant: "destructive"
        });
        return;
      }
      if ('voucherNo' in response && (response.frontImage || response.backImage || response.cardType || response.trackData1 || response.trackData2 || response.mpData)) {
        const currentVoucherNo = voucherData.voucherNo || voucherNoFromUrl || localStorage.getItem('voucherNo') || (response.voucherNo !== 'scan' ? response.voucherNo : '');
        const parsed = parseMicr(response.micr);

        let updatedVoucherData = {
          ...voucherData,
          voucherNo: currentVoucherNo,
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
          checkNumber: response.checkNumber || parsed.checkNumber,
          routingNumber: response.routingNumber || parsed.routingNumber,
          accountNumber: (appConfig.MICR_PARSER_FORMAT === 'SIERRA_LEONE' && parsed.accountNumber) ? parsed.accountNumber : (response.accountNumber || parsed.accountNumber),
          bankCode: response.bankCode || parsed.bankCode,
          countryCode: response.countryCode || parsed.countryCode || "",
          stateCode: response.stateCode || parsed.stateCode || "",
          branchCode: response.branchCode || parsed.branchCode || "",
          transactionCode: response.transactionCode || parsed.transactionCode || "",
          checkDate: response.checkDate,
          amount: response.amount,
          amountWords: response.amountWords,
          accountHolder: response.accountHolder,
          signature: response.signature,
          payeeName: response.payeeName,
          bankName: response.bankName,
          bankBranch: response.bankBranch || parsed.branchCode || "",
          requiredSignatures: response.requiredSignatures,
          signaturesPresent: response.signaturesPresent,
          signatureStatus: response.signatureStatus,
          amountMismatch: response.amountMismatch
        };

        if (appConfig.EXTRACTION_ENABLED === 'Y' && docType === 'CHECK' && response.frontImage) {
          try {
            setCurrentAction("Extracting cheque fields with Offline OpenCV & Tesseract Engine...");
            const ocrResponse = await api.extractChequeData(response.frontImage, {
              checkNumber: updatedVoucherData.checkNumber,
              accountNumber: updatedVoucherData.accountNumber,
              routingNumber: updatedVoucherData.routingNumber,
              micr: updatedVoucherData.micr
            });

            if (ocrResponse.success && ocrResponse.chequeData) {
              const cd = ocrResponse.chequeData;
              setExtractionResult(ocrResponse);
              updatedVoucherData = {
                ...updatedVoucherData,
                bankName: cd.bankName || updatedVoucherData.bankName || "",
                bankBranch: cd.bankBranch || updatedVoucherData.bankBranch || "",
                checkNumber: cd.checkNumber || updatedVoucherData.checkNumber || "",
                accountNumber: cd.accountNumber || updatedVoucherData.accountNumber || "",
                routingNumber: cd.routingNumber || updatedVoucherData.routingNumber || "",
                amount: cd.amount || updatedVoucherData.amount || "",
                checkDate: cd.date || updatedVoucherData.checkDate || "",
                payeeName: cd.payee || updatedVoucherData.payeeName || "",
                amountWords: cd.legalAmount || updatedVoucherData.amountWords || ""
              };

              if (ocrResponse.reviewRequired) {
                toast({
                  title: "Cheque Scanned (Teller Review Flagged)",
                  description: `Extracted Amount: GHS ${cd.amount}. Human-in-the-Loop review flagged due to low confidence or handwritten fields.`,
                });
              } else {
                toast({
                  title: "Cheque Scanned & Extracted",
                  description: `Successfully extracted Amount GHS ${cd.amount} and Date ${cd.date}.`,
                });
              }
            }
          } catch (error: unknown) {
            console.warn("Offline cheque extraction notice:", error);
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
    setLoadingProgress(25);
    setCurrentAction("Saving to database...");
    try {
      const finalVoucherNo = voucherData.voucherNo || voucherNoFromUrl || localStorage.getItem('voucherNo') || voucherData.checkNumber;
      const saveData: VoucherData = {
        ...voucherData,
        voucherNo: finalVoucherNo,
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
        countryCode: docType === 'CHECK' ? (voucherData.countryCode || "") : "",
        stateCode: docType === 'CHECK' ? (voucherData.stateCode || "") : "",
        branchCode: docType === 'CHECK' ? (voucherData.branchCode || "") : "",
        transactionCode: docType === 'CHECK' ? (voucherData.transactionCode || "") : "",
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
      setLoadingProgress(65);
      const response = await api.saveToDatabase(saveData);
      setLoadingProgress(100);
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
        setIsRecordSaved(true);
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
    try {
      window.close();
      setTimeout(() => {
        window.open('', '_self', '');
        window.close();
      }, 100);
    } catch (e) {
      console.error("Window close error:", e);
    }
  };

  useEffect(() => {
    if (docType === 'MSR') {
      setIsCompareModalOpen(false);
    }
  }, [docType]);

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
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-blue-600 text-white px-5 py-3 shadow-xs flex items-center justify-between border-b border-blue-700">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-auto flex items-center justify-center p-1 bg-white/80 rounded-md border border-white/20 shadow-inner">
            <img src={usgLogo} alt="Union Systems Global" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">
              X100+ Voucher Scanner
            </h1>
            <p className="text-[11px] text-blue-100/80 font-normal">Union Systems Global — High Precision Capture</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Header Activity Status Button (Single Unified Status) */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold border transition-all duration-300 ${
            isLoading
              ? 'bg-blue-900/40 text-blue-100 border-blue-400/40 shadow-xs'
              : isRecordSaved
              ? 'bg-emerald-900/40 text-emerald-100 border-emerald-400/40 shadow-xs'
              : hasScanned
              ? 'bg-purple-900/40 text-purple-100 border-purple-400/40 shadow-xs'
              : isDeviceConnected
              ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
              : 'bg-slate-900/50 text-slate-300 border-slate-700/80'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isLoading
                ? 'bg-blue-300 animate-ping'
                : isRecordSaved
                ? 'bg-emerald-400'
                : hasScanned
                ? 'bg-purple-300'
                : isDeviceConnected
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-slate-400'
            }`} />
            <span className="tracking-wider uppercase font-bold text-[11px]">
              {isLoading
                ? (currentAction.toLowerCase().includes('scan') ? 'SCANNING' : 'PROCESSING')
                : isRecordSaved
                ? 'SAVED'
                : hasScanned
                ? 'SCANNED'
                : isDeviceConnected
                ? 'READY'
                : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 bg-white border-r border-slate-200/80 p-4 flex flex-col space-y-4 shadow-2xs">
          {/* Segmented Document Type Selector */}
          <div className="bg-slate-50/80 p-3 rounded-md border border-slate-200/80 transition-all hover:border-slate-300">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 mb-2 block">Document Type</label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 p-1 rounded-md border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDocType('CHECK')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer ${
                  docType === 'CHECK'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Check</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('MSR')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer ${
                  docType === 'MSR'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col flex-1 space-y-2.5 bg-slate-50/80 p-3.5 rounded-md border border-slate-200/80 transition-all hover:border-slate-300">
            <SidebarButton
              onClick={handleConnect}
              disabled={isLoading || isDeviceConnected}
              className={isDeviceConnected ? "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 rounded-md" : "bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200 rounded-md"}
              icon={<Power className="h-3.5 w-3.5" />}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold text-[11px] tracking-wider">{isDeviceConnected ? "CONNECTED" : "CONNECT"}</span>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">{connectedDevice || "None"}</p>
              </div>
            </SidebarButton>
            <SidebarButton
              onClick={handleScanVoucher}
              disabled={!isDeviceConnected || isLoading}
              variant="default"
              className={!isDeviceConnected || isLoading ? "bg-slate-200 text-slate-500 border-slate-300" : "bg-blue-600 hover:bg-blue-700 hover:text-white text-white border-transparent"}
              icon={<Scan className="h-3.5 w-3.5" />}
            >
              <span>Scan {docType === 'CHECK' ? 'Check' : 'Card'}</span>
            </SidebarButton>
            <SidebarButton
              onClick={handleSaveToDb}
              disabled={!hasScanned || isLoading}
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs rounded-md"
              icon={<Save className="h-3.5 w-3.5 text-slate-600" />}
            >
              <span className="font-semibold">Save Record</span>
            </SidebarButton>
            <SidebarButton
              onClick={handleExit}
              className="bg-red-50/80 hover:bg-red-100 text-red-600 border-red-200/80 hover:text-red-700 mt-auto rounded-md"
              icon={<X className="h-3.5 w-3.5" />}
            >
              <span className="font-semibold">Exit App</span>
            </SidebarButton>
          </div>
        </aside>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-5 relative">
          {/* Horizontal System-Font Progressive Flux Loader */}
          {isLoading && (
            <div className="w-full flex flex-row items-center gap-3 py-2.5 px-3 bg-slate-50/80 rounded-lg border border-slate-200/90 font-sans animate-fade-in transition-all text-xs">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  {currentAction.toLowerCase().includes('scan') ? (
                    <Scan className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                  )}
                </div>
                <span className="font-semibold text-slate-800 text-xs font-sans whitespace-nowrap">
                  {currentAction || "Processing operation..."}
                </span>
              </div>

              <div className="flex-1">
                <ProgressiveFluxLoader
                  value={Math.max(5, Math.min(100, loadingProgress))}
                  phases={[
                    { at: 0, label: "initializing hardware" },
                    { at: 25, label: "capturing document" },
                    { at: 55, label: "parsing micr & image" },
                    { at: 80, label: "extracting cheque data" },
                    { at: 100, label: "operation complete" },
                  ]}
                  className="w-full"
                />
              </div>

              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                {Math.max(5, Math.min(100, loadingProgress))}%
              </span>
            </div>
          )}

          {/* Main Layout Container */}
          <div className="flex flex-col lg:flex-row gap-6 items-start transition-all duration-300">
            
            {/* Left Content Area (Cheque Form, Inputs & Image Views) */}
            <div className={`transition-all duration-300 w-full ${isCompareModalOpen && docType === 'CHECK' && voucherData.frontImage ? 'lg:w-[calc(100%-390px)] xl:w-[calc(100%-430px)]' : 'w-full'}`}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Enter narration details..."
                    compact={true}
                  />
                </div>
                {docType === 'CHECK' && hasScanned && (
                  <div className="bg-white p-4 rounded-md border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <InfoField
                            label={appConfig.MICR_PARSER_FORMAT === 'SIERRA_LEONE' ? "Transaction Code" : "Transit / Trans Code"}
                            value={voucherData.transactionCode || voucherData.bankCode}
                            readOnly={true}
                            compact={true}
                          />
                        </div>
                        {appConfig.EXTRACTION_ENABLED === 'Y' && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="relative group flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-md shadow-2xs transition-all cursor-pointer mb-2" 
                          >
                            <ShieldCheck className="w-4 h-4 text-blue-100 shrink-0" />
                            <span>Advanced</span>
                            <span className="absolute top-full mt-2 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded py-1 px-2.5 whitespace-nowrap shadow-xl z-20 font-normal">
                              View Check Details & Verification
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-white p-5 rounded-md border border-slate-200/80 shadow-2xs transition-all">
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
                            onClick={() => setShowAdvanced(true)}
                            className="mt-2 flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors w-full md:w-auto"
                          >
                            <ShieldCheck className="w-4 h-4 text-blue-100" />
                            <span>Show Advanced Diagnostics</span>
                          </button>
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
                                  MjMtMDItMTNUMDg6MTU6MjkrMDA6MDA8eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAy
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
                                  MDowMIXeN6gAAAAASUVORUSCYII="></image>
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
                        onCompare={appConfig.SIGNATURE_VALIDATION_ENABLED === 'Y' ? () => setIsCompareModalOpen(true) : undefined} 
                      />
                      <ImageDisplay label="Back" imageData={voucherData.backImage} />
                    </div>
                  )}
                </div>
                <footer className="py-4 text-center">
                  <p className="text-blue-600 text-sm italic animate-pulse">Powered by X100</p>
                </footer>
              </div>
            </div>

            {/* Right Aside (Automatic Signature Validation) - Only rendered in CHECK mode */}
            {isCompareModalOpen && docType === 'CHECK' && voucherData.frontImage && (
              <aside 
                onMouseEnter={() => {
                  setIsAsideHovered(true);
                  setCollapseTimer(30);
                }}
                onMouseLeave={() => setIsAsideHovered(false)}
                className="w-full lg:w-[390px] xl:w-[430px] bg-white rounded-xl border border-slate-200/90 shadow-md flex flex-col shrink-0 overflow-hidden transition-all duration-300 animate-in slide-in-from-right"
              >
                
                {/* Header */}
                <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-blue-700">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-blue-700 rounded-lg border border-blue-500/50">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-bold tracking-wide text-white">Signature Validation</h2>
                        <span 
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono shadow-2xs transition-colors ${
                            isAsideHovered || isCardFlipped || isLoadingSignatures || isRecalculatingScores
                              ? 'bg-emerald-600 text-white border border-emerald-400/50'
                              : 'bg-blue-700/90 text-blue-100 border border-blue-400/40'
                          }`}
                          title={isAsideHovered || isCardFlipped ? "Timer paused while you are actively working" : "Auto-collapses after 30s of inactivity"}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {isAsideHovered || isCardFlipped ? 'ACTIVE' : `${collapseTimer}s`}
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-100">
                        Acc: <span className="font-mono font-bold text-white">{voucherData.accountNumber || 'N/A'}</span>
                        {voucherData.checkNumber && (
                          <>
                            <span className="mx-1">•</span>
                            No: <span className="font-mono text-white">{voucherData.checkNumber}</span>
                          </>
                        )}
                        {voucherData.amount && (
                          <>
                            <span className="mx-1">•</span>
                            Amt: <span className="font-mono text-emerald-300 font-bold">GHS {voucherData.amount}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {mandateData?.account_mandate && (
                      <span className="px-2 py-0.5 bg-blue-700 text-blue-100 text-[9px] font-semibold rounded-full border border-blue-500">
                        {mandateData.account_mandate}
                      </span>
                    )}
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setIsCompareModalOpen(false)}
                            className="p-1 bg-blue-700 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-slate-900 text-white font-sans text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 shadow-xl">
                          Collapse Signature Validation
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Scrollable Content Body (Stacked vertically: Scanned Signature TOP, Account Mandates BOTTOM) */}
                <div className="p-3.5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto bg-slate-50/70">
                  
                  {/* TOP SECTION: Scanned Cheque Signature */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3 relative">
                    {!isCardFlipped ? (
                      <div className="flex flex-col space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Scan className="h-3.5 w-3.5 text-blue-600" /> Scanned Cheque Signature
                          </span>
                          
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleToggleCropMode(activeCropMode === 'auto' ? 'custom' : 'auto')}
                                  disabled={activeCropMode === 'auto' && !customCroppedSig}
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all flex items-center gap-1 shadow-2xs ${
                                    activeCropMode === 'auto'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                  {activeCropMode === 'auto' ? 'Auto OpenCV Crop' : 'Custom Crop'}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white font-sans text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 shadow-xl">
                                {!customCroppedSig ? 'Map a custom crop area first to toggle views' : 'Click to switch between OpenCV auto-crop and custom ROI crop'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                onClick={() => {
                                  if (customCroppedSig) {
                                    handleToggleCropMode(activeCropMode === 'auto' ? 'custom' : 'auto');
                                  } else {
                                    toast({
                                      title: "Map Custom Area First",
                                      description: "Click 'Map Custom Area' below to draw your custom signature crop area.",
                                    });
                                  }
                                }}
                                className="bg-slate-950 rounded-lg p-2.5 flex items-center justify-center min-h-[160px] border border-slate-800 shadow-inner relative group cursor-pointer overflow-hidden transition-all hover:border-blue-500/50"
                              >
                                {croppedChequeSig ? (
                                  <img
                                    src={croppedChequeSig}
                                    alt="Cropped Cheque Signature"
                                    className="max-h-36 max-w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="text-slate-400 text-xs">No cropped signature</div>
                                )}

                                {isRecalculatingScores && (
                                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in duration-200">
                                    <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                                    <span className="text-[10px] text-slate-300 font-semibold tracking-wide">Recalculating Match...</span>
                                  </div>
                                )}

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold pointer-events-none shadow-md backdrop-blur-xs border border-slate-700">
                                  <RefreshCw className="h-3 w-3 text-blue-400" /> Tap Image to Flip
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-slate-900 text-white font-sans text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 shadow-xl">
                              Click image to flip between Auto OpenCV crop and Custom Mapped crop
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="text-[10px] text-slate-400">Full-Color Signature Crop</span>
                          <div className="flex items-center gap-2">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={async () => {
                                      setIsRecalculatingScores(true);
                                      const cropRes = await api.cropSignature(`data:image/jpeg;base64,${voucherData.frontImage}`);
                                      if (cropRes.success && cropRes.croppedImage) {
                                        const formattedSig = cropRes.croppedImage.startsWith('data:') ? cropRes.croppedImage : `data:image/jpeg;base64,${cropRes.croppedImage}`;
                                        setAutoCroppedSig(formattedSig);
                                        setCroppedChequeSig(formattedSig);
                                        setActiveCropMode('auto');
                                      }
                                      setIsRecalculatingScores(false);
                                    }}
                                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold text-[10px]"
                                  >
                                    <RefreshCw className="h-3 w-3" /> Re-crop
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-slate-900 text-white font-sans text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 shadow-xl">
                                  Reset default automatic signature crop
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setIsCardFlipped(true)}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-2xs transition-all active:scale-95"
                                  >
                                    <Crop className="h-3 w-3" /> Map Custom Area
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-slate-900 text-white font-sans text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 shadow-xl">
                                  Draw custom ROI bounding box over cheque front
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col min-h-[260px] animate-in fade-in duration-300">
                        {voucherData.frontImage ? (
                          <SignatureCropOverlay
                            imageSrc={`data:image/jpeg;base64,${voucherData.frontImage}`}
                            initialRoi={{ x: 0.58, y: 0.52, w: 0.40, h: 0.30 }}
                            onApplyCrop={handleCustomCropApply}
                            onClose={() => setIsCardFlipped(false)}
                            isLoading={isLoadingSignatures}
                          />
                        ) : (
                          <div className="py-8 text-center text-slate-400 text-xs">
                            No scanned cheque front image available for cropping.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM SECTION: Account Mandate Specimen Signatures */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-600" /> Mandate Specimen Signatures
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {mandateData?.enq_details?.length || 0} Signator{mandateData?.enq_details?.length === 1 ? 'y' : 'ies'}
                      </span>
                    </div>

                    {isLoadingSignatures ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2">
                        <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                        <p className="text-xs font-medium text-slate-600">Loading mandate signatures...</p>
                      </div>
                    ) : !voucherData.accountNumber || !voucherData.accountNumber.trim() ? (
                      <div className="py-8 px-3 text-center bg-amber-50/70 rounded-lg border border-amber-200 text-amber-900 space-y-2">
                        <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                        <h4 className="text-xs font-bold">No Account Number Detected</h4>
                        <p className="text-[11px] text-amber-800">
                          Signature mandate verification requires a valid account number.
                        </p>
                      </div>
                    ) : !mandateData?.enq_details || mandateData.enq_details.length === 0 ? (
                      <div className="py-8 px-3 text-center bg-slate-100/80 rounded-lg border border-slate-200 text-slate-700 space-y-2">
                        <AlertCircle className="h-6 w-6 text-slate-400 mx-auto" />
                        <h4 className="text-xs font-bold">No Registered Mandates Found</h4>
                        <p className="text-[11px] text-slate-600">
                          No registered mandate signatures found for account <span className="font-mono font-bold">{voucherData.accountNumber}</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
                        {mandateData.enq_details.map((item: any, idx: number) => {
                          const photoUrl = item.photo ? (item.photo.startsWith('data:') ? item.photo : `data:image/jpeg;base64,${item.photo}`) : (item.pix ? `data:image/jpeg;base64,${item.pix}` : '');
                          const sigUrl = item.signature ? (item.signature.startsWith('data:') ? item.signature : `data:image/jpeg;base64,${item.signature}`) : '';
                          const scoreObj = comparisonScores.find(s => s.index === idx);
                          const similarity = scoreObj?.similarity || 0;
                          const percentage = scoreObj?.percentage || '0%';
                          const isHighMatch = similarity >= 70;
                          const isModerate = similarity >= 50 && similarity < 70;

                          const rawChequeAmt = voucherData.amount || '0';
                          const chequeAmountValue = parseFloat(rawChequeAmt.toString().replace(/[^0-9.]/g, '')) || 0;
                          const itemLimitVal = item.limit !== undefined && item.limit !== null ? parseFloat(item.limit.toString().replace(/[^0-9.]/g, '')) : (item.amtlimit !== undefined ? parseFloat(item.amtlimit.toString()) : undefined);
                          const isLimitExceeded = itemLimitVal !== undefined && itemLimitVal > 0 && chequeAmountValue > itemLimitVal;
                          const signCategory = (item.sign_category || item.category || 'N/A').trim();
                          const isEligible = !isLimitExceeded;

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border transition-all ${
                                isHighMatch
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : isModerate
                                  ? 'bg-amber-50/50 border-amber-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center space-x-2.5">
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={`Signatory ${idx + 1}`}
                                      className="w-10 h-10 rounded-full object-cover border border-white shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                      S{idx + 1}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="text-xs font-bold text-slate-900">
                                        {item.relation_no ? `Relation #${item.relation_no}` : `Signatory ${idx + 1}`}
                                      </h4>
                                      
                                      <TooltipProvider delayDuration={150}>
                                        {isEligible ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-[8px] font-extrabold uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 cursor-help">
                                                <Check className="w-2 h-2 text-emerald-700" /> Eligible
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-[10px] font-bold bg-slate-900 text-white border border-slate-700 shadow-xl">
                                              Active authorized signatory for this cheque
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-[8px] font-extrabold uppercase text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 cursor-help">
                                                <AlertTriangle className="w-2 h-2 text-red-600 animate-pulse" /> Not Allowed
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-[10px] font-bold bg-slate-900 text-white border border-slate-700 shadow-xl">
                                              Cheque amount exceeds allowed limit for this signatory
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </TooltipProvider>
                                    </div>

                                    <TooltipProvider delayDuration={150}>
                                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-600">
                                        <div className="flex items-center gap-0.5">
                                          <span className="font-medium text-slate-400">Cat:</span>
                                          <span className="font-bold text-slate-900">{signCategory}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                          <span className="font-medium text-slate-400">Limit:</span>
                                          <span className={`font-bold ${isLimitExceeded ? 'text-red-600' : 'text-slate-900'}`}>
                                            {itemLimitVal !== undefined && itemLimitVal > 0 
                                              ? `GHS ${itemLimitVal.toLocaleString('en-US')}` 
                                              : 'No Limit'}
                                          </span>
                                        </div>
                                      </div>
                                    </TooltipProvider>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end">
                                  {isRecalculatingScores ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700 flex items-center gap-1 animate-pulse">
                                      <RefreshCw className="h-2.5 w-2.5 animate-spin text-blue-600" />
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                                        isHighMatch
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : isModerate
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {isHighMatch && <CheckCircle2 className="h-3 w-3" />}
                                      {percentage}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {sigUrl && (
                                <div className="bg-white rounded-md p-1.5 border border-slate-200 flex items-center justify-center h-20 mt-1.5">
                                  <img
                                    src={sigUrl}
                                    alt={`Specimen Signature ${idx + 1}`}
                                    className="max-h-16 max-w-full object-contain filter contrast-125"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer */}
                <div className="bg-white border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-medium">
                    Mandate Verification
                  </div>
                  <button
                    onClick={() => setIsCompareModalOpen(false)}
                    className="px-3.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors"
                  >
                    Close Validation
                  </button>
                </div>
              </aside>
            )}

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
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-blue-200 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Solid Blue Header with Top-Right Close Button */}
                <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-700 rounded-xl">
                      <Scan className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold tracking-wide text-white">Check Details & Verification</h2>
                      <p className="text-xs text-blue-100">Complete extracted cheque information & verification telemetry</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-md border border-blue-500">
                      CHECK
                    </span>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                      title="Close Details"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)] bg-slate-50 space-y-4">
                  {/* Teller Review & Audit Telemetry Banner */}
                  {extractionResult && (
                    <div className={`p-4 rounded-xl border flex flex-col space-y-2 text-xs ${
                      extractionResult.reviewRequired
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-bold">
                          {extractionResult.reviewRequired ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          <span>
                            {extractionResult.reviewRequired
                              ? 'Teller Human-in-the-Loop Audit Flagged'
                              : 'Automated Extraction Verified Clean'}
                          </span>
                        </div>
                        <span className="font-mono bg-white px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-xs">
                          Confidence: {Math.round((extractionResult.overallConfidenceScore ?? 0) * 100)}%
                        </span>
                      </div>

                      {extractionResult.flaggedFields && extractionResult.flaggedFields.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {extractionResult.flaggedFields.map((flag: any, fIdx: number) => (
                            <span key={fIdx} className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                              ⚠️ {flag.reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                    {/* Extracted Field ROI Snippets */}
                    {extractionResult?.extractedRois && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center border-b border-slate-100 pb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 mr-2"></span>
                          Extracted Field ROI Snippets (Scanned Crop Visual Verification)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                          {extractionResult.extractedRois.amountRoi && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-500 mb-1">Numeric Amount Crop</span>
                              <img src={extractionResult.extractedRois.amountRoi} alt="Amount ROI" className="max-h-14 object-contain rounded border border-slate-300" />
                              <span className="text-[11px] font-bold text-slate-800 mt-1">
                                {voucherData.amount ? `GHS ${voucherData.amount}` : 'Not Detected'}
                              </span>
                            </div>
                          )}
                          {extractionResult.extractedRois.dateRoi && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-500 mb-1">Date Box Crop</span>
                              <img src={extractionResult.extractedRois.dateRoi} alt="Date ROI" className="max-h-14 object-contain rounded border border-slate-300" />
                              <span className="text-[11px] font-bold text-slate-800 mt-1">
                                {voucherData.checkDate || 'Not Detected'}
                              </span>
                            </div>
                          )}
                          {extractionResult.extractedRois.payeeRoi && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-500 mb-1">Payee Line Crop</span>
                              <img src={extractionResult.extractedRois.payeeRoi} alt="Payee ROI" className="max-h-14 object-contain rounded border border-slate-300" />
                              <span className="text-[11px] font-bold text-slate-800 mt-1">
                                {voucherData.payeeName || 'Not Detected'}
                              </span>
                            </div>
                          )}
                          {extractionResult.extractedRois.bankRoi && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-500 mb-1">Bank Header Crop</span>
                              <img src={extractionResult.extractedRois.bankRoi} alt="Bank ROI" className="max-h-14 object-contain rounded border border-slate-300" />
                              <span className="text-[11px] font-bold text-slate-800 mt-1">
                                {voucherData.bankName || 'Not Detected'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Check Basic Info */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center border-b border-slate-100 pb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2"></span>
                          Check Information
                        </h3>
                        <div className="space-y-2 pt-1">
                          <DetailItem label="Check Number" value={voucherData.checkNumber || ''} />
                          <DetailItem label="Amount" value={voucherData.amount || ''} highlight />
                          <DetailItem label="Date" value={voucherData.checkDate || ''} />
                          <DetailItem label="Payee Name" value={voucherData.payeeName || ''} />
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center border-b border-slate-100 pb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2"></span>
                          Bank Details
                        </h3>
                        <div className="space-y-2 pt-1">
                          <DetailItem label="Bank Name" value={voucherData.bankName && voucherData.bankName !== 'BRANCH =' ? voucherData.bankName : 'Not Detected'} />
                          <DetailItem label="Bank Branch" value={voucherData.bankBranch && !voucherData.bankBranch.toUpperCase().includes('BRANCH =') && voucherData.bankBranch !== '=' ? voucherData.bankBranch : 'Not Detected'} />
                          <DetailItem label="Bank Code" value={voucherData.bankCode || ''} />
                          <DetailItem label="Routing Number" value={voucherData.routingNumber || ''} />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Account Information */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center border-b border-slate-100 pb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2"></span>
                          Account Information
                        </h3>
                        <div className="space-y-2 pt-1">
                          <DetailItem label="Account Holder" value={voucherData.accountHolder || ''} />
                          <DetailItem label="Account Number" value={voucherData.accountNumber || ''} secure />
                          <DetailItem label="Full MICR" value={voucherData.micr || ''} />
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center border-b border-slate-100 pb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>
                          Verification Status
                        </h3>
                        <div className="space-y-2 pt-1">
                          <StatusItem 
                            label="Amount Mismatch" 
                            value={voucherData.amountMismatch || 'Not Verified'} 
                            type={voucherData.amountMismatch === "Yes" ? "error" : (voucherData.amountMismatch === "No" ? "success" : "neutral")}
                          />
                          <StatusItem 
                            label="Signature Status" 
                            value={
                              voucherData.signatureStatus === "VALID" ? `VALID (${voucherData.signaturesPresent || '1'} of ${voucherData.requiredSignatures || '1'} Signed)` :
                              voucherData.signatureStatus === "INSUFFICIENT" ? `INSUFFICIENT (${voucherData.signaturesPresent || '0'} of ${voucherData.requiredSignatures || '1'} Signed)` :
                              voucherData.signatureStatus === "NONE" ? `MISSING (0 of ${voucherData.requiredSignatures || '1'} Signed)` :
                              (voucherData.signatureStatus || 'Unverified')
                            } 
                            type={
                              voucherData.signatureStatus === "INSUFFICIENT" || voucherData.signatureStatus === "NONE" ? "error" :
                              (voucherData.signatureStatus === "VALID" ? "success" : "neutral")
                            }
                          />
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-100 pb-2">Additional Details</h3>
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Amount in Words</label>
                            <div className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-h-[50px] text-xs leading-relaxed font-medium">
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
                <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Cheque Information Summary</span>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-sm transition-colors"
                  >
                    Close Details
                  </button>
                </div>

              </div>
            </div>
          )}
          {showAdvanced && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Solid Blue Theme Header with Clean Positioned Close Button */}
                <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-700 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-wide text-white">Advanced Device Diagnostics & Telemetry</h3>
                      <p className="text-xs text-blue-100">MagTek Hardware Serials, Magnetic Track Data, and Encrypted Payloads</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdvanced(false)}
                    className="p-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                    title="Close Diagnostics"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)] bg-slate-50">
                  
                  {/* Section 1: Hardware & Security Serials */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Hardware & Security Serials</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <InfoField
                        label="Device Serial Number"
                        value={voucherData.deviceSerialNumber || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="DUKPT Serial Number"
                        value={voucherData.dukptSerialNumber || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Encrypted Session ID"
                        value={voucherData.encryptedSessionId || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                    </div>
                  </div>

                  {/* Section 2: Magnetic Track Data */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Magnetic Track Streams</h4>
                    </div>
                    <div className="space-y-3">
                      <InfoField
                        label="Track 1 Data"
                        value={voucherData.trackData1 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Track 2 Data"
                        value={voucherData.trackData2 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Track 3 Data"
                        value={voucherData.trackData3 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                    </div>
                  </div>

                  {/* Section 3: Encrypted Payloads */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Encrypted Track Payloads</h4>
                    </div>
                    <div className="space-y-3">
                      <InfoField
                        label="Encrypted Track 1"
                        value={voucherData.encryptedTrack1 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Encrypted Track 2"
                        value={voucherData.encryptedTrack2 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                      <InfoField
                        label="Encrypted Track 3"
                        value={voucherData.encryptedTrack3 || "N/A"}
                        readOnly={true}
                        compact={true}
                      />
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Device Connection: <strong className="text-slate-700">{connectedDevice || "MagTek Excella"}</strong></span>
                  </div>
                  <button
                    onClick={() => setShowAdvanced(false)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
                  >
                    Close Diagnostics
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;