import React, { useState, useEffect } from 'react';
import usgLogo from '@/assets/usg-logo.png';
import { useToast } from "@/components/ui/use-toast";
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { appConfig } from '@/config/appConfig';
import { 
  Search, 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  X, 
  CreditCard, 
  ShieldCheck, 
  ZoomIn, 
  Download,
  Calendar,
  DollarSign,
  User,
  Building2,
  Hash,
  ArrowLeft,
  Sparkles,
  Layers,
  FileCheck2,
  Lock,
  Cpu
} from 'lucide-react';

interface ViewData {
  voucherNo?: string | null;
  voucherType?: string | null;
  micr?: string | null;
  frontImage?: string | null;
  backImage?: string | null;
  narration?: string | null;
  frontImagePath?: string | null;
  backImagePath?: string | null;
  trackData1?: string | null;
  trackData2?: string | null;
  trackData3?: string | null;
  mpData?: string | null;
  cardType?: string | null;
  magnePrintStatus?: string | null;
  track1Status?: string | null;
  track2Status?: string | null;
  track3Status?: string | null;
  getScore?: string | null;
  deviceSerialNumber?: string | null;
  dukptSerialNumber?: string | null;
  encryptedSessionId?: string | null;
  encryptedTrack1?: string | null;
  encryptedTrack2?: string | null;
  encryptedTrack3?: string | null;
  checkNumber?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  bankCode?: string | null;
  countryCode?: string | null;
  stateCode?: string | null;
  branchCode?: string | null;
  transactionCode?: string | null;
  checkDate?: string | null;
  amount?: string | null;
  amountWords?: string | null;
  accountHolder?: string | null;
  signature?: string | null;
}

// Function to parse Track1 or Track2 for cardholder name and expiry
const parseCardDetails = (trackData1?: string | null, trackData2?: string | null) => {
  let cardNumber = '•••• •••• •••• ••••';
  let cardholderName = 'CARDHOLDER NAME';
  let expiryDate = 'MM/YY';
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

const View: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialVoucherNo = queryParams.get('voucherNo');
  const [searchVoucherNo, setSearchVoucherNo] = useState<string>(initialVoucherNo || '');
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'CHEQUE' | 'CARD'>('CHEQUE');
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  useEffect(() => {
    if (initialVoucherNo) {
      fetchVoucher(initialVoucherNo);
    }
  }, [initialVoucherNo]);

  const fetchVoucher = async (voucherNo: string) => {
    if (!voucherNo.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid voucher number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.fetchVoucherData(voucherNo.trim());
      console.log(`[${new Date().toISOString()}] Frontend: Fetch response:`, JSON.stringify(response));
      if (!response.success || !response.data) {
        toast({
          title: "Data Not Found",
          description: response.message || `No data found for voucher ${voucherNo}.`,
          variant: "destructive",
        });
        setViewData(null);
      } else {
        const data = response.data;
        setViewData(data);
        setSearchVoucherNo(voucherNo);

        // Auto-select mode based on available data
        if (data.cardType || data.trackData1 || data.trackData2 || data.voucherType === 'MSR') {
          setActiveTab('CARD');
        } else {
          setActiveTab('CHEQUE');
        }

        toast({
          title: "Voucher Loaded",
          description: `Voucher ${voucherNo} retrieved successfully.`,
        });
      }
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Frontend: Fetch error: ${error.message}`, error);
      toast({
        title: "Fetch Error",
        description: error.message || "Failed to fetch voucher data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVoucher(searchVoucherNo);
  };

  const handleClear = () => {
    setViewData(null);
    setSearchVoucherNo('');
    setEnlargedImage(null);
  };

  const cardDetails = parseCardDetails(viewData?.trackData1, viewData?.trackData2);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Top Navbar - Ultra Responsive */}
      <header className="bg-blue-600 text-white px-2 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 shadow-xs sticky top-0 z-30 border-b border-blue-700 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-7 sm:h-8 md:h-9 w-auto flex items-center justify-center p-1 bg-white/90 rounded-md border border-white/20 shadow-xs shrink-0">
                <img src={usgLogo} alt="Union Systems Global" className="h-5 sm:h-6 md:h-7 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-semibold tracking-wide text-white leading-tight truncate">
                  X100+ Scanner
                </h1>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] text-blue-100/80 font-normal hidden sm:block">
                  Union Systems Global
                </p>
              </div>
            </div>
            
            {/* Mobile Mode Switcher - shown only on very small screens */}
            <div className="lg:hidden flex items-center gap-1">
              {viewData ? (
                <div className="bg-blue-700/80 px-2 py-0.5 rounded-lg border border-blue-400/40 flex items-center gap-1">
                  <div className="bg-white text-blue-800 font-bold px-1.5 py-0.5 text-[9px] rounded-md flex items-center gap-0.5">
                    {activeTab === 'CHEQUE' ? (
                      <>
                        <FileText className="h-2.5 w-2.5" />
                        <span>Cheque</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-2.5 w-2.5" />
                        <span>Card</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-700/80 p-0.5 rounded-lg flex items-center gap-0.5 border border-blue-500/50">
                  <button
                    onClick={() => setActiveTab('CHEQUE')}
                    className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all cursor-pointer flex items-center gap-0.5 ${
                      activeTab === 'CHEQUE'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-blue-100 hover:text-white hover:bg-blue-600/60'
                    }`}
                  >
                    <FileText className="h-2.5 w-2.5" />
                    <span>Cheque</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('CARD')}
                    className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all cursor-pointer flex items-center gap-0.5 ${
                      activeTab === 'CARD'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-blue-100 hover:text-white hover:bg-blue-600/60'
                    }`}
                  >
                    <CreditCard className="h-2.5 w-2.5" />
                    <span>Card</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Search Bar - Fully Responsive */}
          <form onSubmit={handleSearch} className="w-full lg:flex-1 lg:max-w-xs xl:max-w-sm 2xl:max-w-md">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 sm:h-4 w-3.5 sm:w-4 pointer-events-none" />
              <input
                type="text"
                value={searchVoucherNo}
                onChange={(e) => setSearchVoucherNo(e.target.value)}
                placeholder="Search voucher #..."
                className="w-full pl-7 sm:pl-9 pr-14 sm:pr-16 md:pr-20 py-1.5 sm:py-1.5 md:py-2 text-xs sm:text-sm font-medium border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white bg-white text-slate-900 placeholder:text-slate-400 shadow-inner"
                disabled={isLoading}
              />
              <div className="absolute right-1 flex items-center gap-0.5 sm:gap-1">
                {searchVoucherNo && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-0.5 sm:p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !searchVoucherNo.trim()}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1 md:py-1.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-slate-300 text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-2xs transition-colors flex items-center gap-1 cursor-pointer min-w-[50px] sm:min-w-[60px] justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Desktop Mode Switcher - hidden on mobile, shown on large screens */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {viewData ? (
              <div className="bg-blue-700/80 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl border border-blue-400/40 flex items-center gap-1.5 shadow-xs">
                <span className="text-[8px] sm:text-[9px] md:text-[10px] uppercase font-bold text-blue-200 tracking-wider hidden xs:inline">Type:</span>
                <div className="bg-white text-blue-800 font-bold px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] md:text-xs rounded-md flex items-center gap-1 shadow-2xs">
                  {activeTab === 'CHEQUE' ? (
                    <>
                      <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
                      <span className="hidden xs:inline">Cheque</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
                      <span className="hidden xs:inline">Card</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-700/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl flex items-center gap-0.5 sm:gap-1 border border-blue-500/50">
                <button
                  onClick={() => setActiveTab('CHEQUE')}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] md:text-xs font-semibold rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'CHEQUE'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-blue-100 hover:text-white hover:bg-blue-600/60'
                  }`}
                >
                  <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
                  <span>Cheque</span>
                </button>
                <button
                  onClick={() => setActiveTab('CARD')}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] md:text-xs font-semibold rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'CARD'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-blue-100 hover:text-white hover:bg-blue-600/60'
                  }`}
                >
                  <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
                  <span>Card</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto p-2 sm:p-3 md:p-4 lg:p-6 w-full space-y-4 sm:space-y-5 md:space-y-6">

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 md:p-16 text-center text-blue-600 flex flex-col items-center justify-center gap-3 shadow-2xs">
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin text-blue-600" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">Loading document data and images...</p>
            <span className="text-[10px] sm:text-xs text-slate-400">Fetching records from PostgreSQL database & remote scanner API</span>
          </div>
        )}

        {/* Empty State */}
        {!viewData && !isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 md:p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4 shadow-2xs">
            <div className="p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Search className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="max-w-sm">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Search for a Scanned Voucher</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                Enter a voucher or transaction number in the search bar above to view scanned images, MICR codelines, check details, or card magnetic data.
              </p>
            </div>
          </div>
        )}

        {/* Loaded Document Overview */}
        {viewData && !isLoading && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-in fade-in duration-300">
            
            {/* Voucher Summary Bar - Fully Responsive with No Horizontal Scroll */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 w-full overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 md:gap-3">
                
                {/* Section 1: Voucher Number & Type */}
                <div className="shrink-0 min-w-0">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Voucher
                  </span>
                  <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
                    <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-mono font-bold text-slate-900 truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]">
                      {viewData.voucherNo || searchVoucherNo || 'N/A'}
                    </span>
                    <span className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-bold uppercase px-0.5 sm:px-1 md:px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {viewData.voucherType || (activeTab === 'CARD' ? 'CARD' : 'CHEQUE')}
                    </span>
                  </div>
                </div>

                <div className="w-px h-4 sm:h-5 md:h-6 bg-slate-200/80 shrink-0 hidden xs:block"></div>

                {/* Section 2: Account Number & Holder */}
                <div className="shrink-0 min-w-0 max-w-[80px] sm:max-w-[120px] md:max-w-[150px] lg:max-w-[180px]">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Account
                  </span>
                  <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5">
                    <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-mono font-bold text-slate-900 truncate">
                      {viewData.accountNumber || 'N/A'}
                    </span>
                    {viewData.accountHolder && (
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-slate-500 font-medium truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px] hidden xs:inline" title={viewData.accountHolder}>
                        ({viewData.accountHolder})
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-px h-4 sm:h-5 md:h-6 bg-slate-200/80 shrink-0 hidden xs:block"></div>

                {/* Section 3: Narration - Always Visible with Ellipsis */}
                <div className="flex-1 min-w-0 max-w-[120px] sm:max-w-[180px] md:max-w-[280px] lg:max-w-[400px]">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Narration
                  </span>
                  <span 
                    className="text-[9px] sm:text-[10px] md:text-xs text-slate-700 font-normal block mt-0.5 truncate" 
                    title={viewData.narration && viewData.narration.trim() !== '' ? viewData.narration : 'No narration'}
                  >
                    {viewData.narration && viewData.narration.trim() !== '' ? viewData.narration : 'No narration'}
                  </span>
                </div>

                <div className="w-px h-4 sm:h-5 md:h-6 bg-slate-200/80 shrink-0 hidden xs:block"></div>

                {/* Section 4: Amount */}
                <div className="shrink-0 text-right min-w-0">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Amount
                  </span>
                  {viewData.amount && viewData.amount.trim() !== '' ? (
                    <div className="text-[11px] sm:text-xs md:text-sm lg:text-base font-mono font-bold text-slate-900 mt-0.5">
                      {viewData.amount}
                    </div>
                  ) : (
                    <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-slate-400 italic mt-0.5">
                      N/A
                    </div>
                  )}
                  {viewData.amountWords && viewData.amountWords.trim() !== '' && (
                    <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-slate-500 font-normal italic truncate block max-w-[60px] sm:max-w-[80px] md:max-w-[120px] ml-auto" title={viewData.amountWords}>
                      {viewData.amountWords}
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* CHEQUE MODE SECTION */}
            {activeTab === 'CHEQUE' && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                
                {/* Scanned Images Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* Front Image View */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col group">
                    <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${viewData.frontImage ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'}`}></span>
                        <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">Front</h2>
                      </div>
                      {viewData.frontImage && (
                        <button
                          type="button"
                          onClick={() => setEnlargedImage({ src: viewData.frontImage!, title: 'Front Image View' })}
                          className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1 cursor-pointer transition-colors"
                        >
                          <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
                          <span className="hidden xs:inline">Enlarge</span>
                        </button>
                      )}
                    </div>

                    <div
                      onClick={() => viewData.frontImage && setEnlargedImage({ src: viewData.frontImage!, title: 'Front Image View' })}
                      className={`bg-slate-50 border border-dashed border-slate-200 rounded-xl h-48 sm:h-56 md:h-60 lg:h-64 flex items-center justify-center relative overflow-hidden transition-all ${
                        viewData.frontImage ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/20' : ''
                      }`}
                    >
                      {viewData.frontImage ? (
                        <>
                          <img
                            src={`data:image/jpeg;base64,${viewData.frontImage}`}
                            alt="Scanned Cheque Front"
                            className="max-h-full max-w-full object-contain p-1 sm:p-2 drop-shadow-xs transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-[9px] sm:text-xs font-bold text-white bg-slate-900/80 px-2 sm:px-3 py-1 rounded-full shadow flex items-center gap-1 sm:gap-1.5">
                              <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                              <span className="hidden xs:inline">Click to Enlarge</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-400 text-[10px] sm:text-xs flex flex-col items-center gap-1.5 sm:gap-2">
                          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-300" />
                          <span>No Front Image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Image View */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col group">
                    <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${viewData.backImage ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'}`}></span>
                        <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">Back</h2>
                      </div>
                      {viewData.backImage && (
                        <button
                          type="button"
                          onClick={() => setEnlargedImage({ src: viewData.backImage!, title: 'Back Image View' })}
                          className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1 cursor-pointer transition-colors"
                        >
                          <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
                          <span className="hidden xs:inline">Enlarge</span>
                        </button>
                      )}
                    </div>

                    <div
                      onClick={() => viewData.backImage && setEnlargedImage({ src: viewData.backImage!, title: 'Back Image View' })}
                      className={`bg-slate-50 border border-dashed border-slate-200 rounded-xl h-48 sm:h-56 md:h-60 lg:h-64 flex items-center justify-center relative overflow-hidden transition-all ${
                        viewData.backImage ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/20' : ''
                      }`}
                    >
                      {viewData.backImage ? (
                        <>
                          <img
                            src={`data:image/jpeg;base64,${viewData.backImage}`}
                            alt="Scanned Cheque Back"
                            className="max-h-full max-w-full object-contain p-1 sm:p-2 drop-shadow-xs transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-[9px] sm:text-xs font-bold text-white bg-slate-900/80 px-2 sm:px-3 py-1 rounded-full shadow flex items-center gap-1 sm:gap-1.5">
                              <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                              <span className="hidden xs:inline">Click to Enlarge</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-400 text-[10px] sm:text-xs flex flex-col items-center gap-1.5 sm:gap-2">
                          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-300" />
                          <span>No Back Image</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Structured MICR & Cheque Details Bento Card - Responsive Grid */}
                {(() => {
                  const checkNo = viewData.checkNumber || viewData.voucherNo;
                  const accNo = viewData.accountNumber;
                  const routNo = viewData.routingNumber;

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-2xs space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                          <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                            MICR & Cheque Info
                          </h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                        <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Check #</span>
                          <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-800">{checkNo || 'N/A'}</div>
                        </div>

                        <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Account #</span>
                          <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-900">{accNo || 'N/A'}</div>
                        </div>

                        <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Routing #</span>
                          <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-800">{routNo || 'N/A'}</div>
                        </div>

                        <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Date</span>
                          <div className="text-[10px] sm:text-xs font-medium text-slate-800">{viewData.checkDate || 'N/A'}</div>
                        </div>

                        <div className="col-span-2 p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Account Holder</span>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 truncate">{viewData.accountHolder || 'N/A'}</div>
                        </div>

                        <div className="col-span-2 p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-right">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Amount</span>
                          <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-900">
                            {viewData.amount ? viewData.amount : 'N/A'}
                            {viewData.amountWords && (
                              <span className="font-sans font-normal text-slate-600 block mt-0.5 text-[9px] sm:text-[10px] md:text-[11px]">
                                {viewData.amountWords}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4 p-2 sm:p-3 bg-slate-100 rounded-xl border border-slate-200">
                          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Raw Optical MICR Codeline</span>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-mono font-bold tracking-widest text-slate-900 break-all">
                            {viewData.micr || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* CARD MODE SECTION - Responsive */}
            {activeTab === 'CARD' && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 items-start">
                  
                  {/* Free-Standing 3D Card Visualizer - Responsive */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4">
                    <div 
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] h-[180px] sm:h-[200px] md:h-[220px] bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-700/60 cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                    >
                      {/* Ambient card glows */}
                      <div className="absolute -top-8 sm:-top-10 md:-top-12 -right-8 sm:-right-10 md:-right-12 w-24 sm:w-30 md:w-36 h-24 sm:h-30 md:h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="absolute -bottom-8 sm:-bottom-10 md:-bottom-12 -left-8 sm:-left-10 md:-left-12 w-24 sm:w-30 md:w-36 h-24 sm:h-30 md:h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

                      {!isCardFlipped ? (
                        /* Front of card */
                        <>
                          <div className="flex items-center justify-between relative z-10">
                            <div className="w-8 sm:w-9 md:w-11 h-6 sm:h-7 md:h-8 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-md border border-amber-500 shadow-inner flex items-center justify-center">
                              <div className="w-5 sm:w-6 md:w-7 h-3 sm:h-4 md:h-5 border border-amber-700/40 rounded-xs"></div>
                            </div>
                            <span className="font-extrabold tracking-widest text-[10px] sm:text-xs md:text-sm text-white drop-shadow-sm uppercase">
                              {cardDetails.cardBrand || viewData.cardType || 'CARD'}
                            </span>
                          </div>

                          <div className="font-mono text-base sm:text-lg md:text-xl font-bold tracking-widest text-center text-white drop-shadow-md my-auto relative z-10">
                            {cardDetails.cardNumber}
                          </div>

                          <div className="flex items-center justify-between text-[10px] sm:text-xs text-white relative z-10">
                            <div>
                              <div className="text-[6px] sm:text-[7px] md:text-[8px] text-white/50 uppercase tracking-wider font-semibold">Cardholder</div>
                              <div className="font-bold tracking-wide text-white drop-shadow-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-[190px] text-[10px] sm:text-xs">
                                {cardDetails.cardholderName || viewData.accountHolder || 'AUTHORIZED HOLDER'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[6px] sm:text-[7px] md:text-[8px] text-white/50 uppercase tracking-wider font-semibold">Expires</div>
                              <div className="font-mono font-bold text-white drop-shadow-sm text-[10px] sm:text-xs">{cardDetails.expiryDate}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Back of card */
                        <div className="flex flex-col justify-between h-full relative z-10">
                          <div className="w-full h-6 sm:h-7 md:h-9 bg-slate-950 rounded-sm -mx-4 sm:-mx-5 md:-mx-6 mt-1 shadow-inner"></div>
                          <div className="flex items-center justify-end gap-1 sm:gap-2 bg-white/90 p-1 sm:p-1.5 rounded text-slate-800 text-[10px] sm:text-xs font-mono">
                            <span className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500">CVV:</span>
                            <span className="font-bold tracking-widest">•••</span>
                          </div>
                          <div className="text-[7px] sm:text-[8px] md:text-[9px] text-white/50 text-center font-mono">
                            MagnePrint Secure Verified
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-slate-400 mt-2 sm:mt-3 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" /> 
                      <span className="hidden xs:inline">Click card to flip</span>
                      <span className="xs:hidden">Flip</span>
                    </span>
                  </div>

                  {/* Card Telemetry & Magnetic Track Data Bento - Responsive */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-2xs space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-100 pb-2 sm:pb-3">
                      <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                        Magnetic Tracks & Card Telemetry
                      </h2>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Track 1 Data</span>
                        <input
                          type="text"
                          value={viewData.trackData1 || 'N/A'}
                          readOnly
                          className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 text-slate-800 cursor-default truncate"
                        />
                      </div>

                      <div>
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Track 2 Data</span>
                        <input
                          type="text"
                          value={viewData.trackData2 || 'N/A'}
                          readOnly
                          className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 text-slate-800 cursor-default truncate"
                        />
                      </div>

                      <div>
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Track 3 Data</span>
                        <input
                          type="text"
                          value={viewData.trackData3 || 'N/A'}
                          readOnly
                          className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 text-slate-800 cursor-default truncate"
                        />
                      </div>

                      {/* Diagnostic Badges - Responsive Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1 sm:pt-2">
                        <div className="p-1.5 sm:p-2 md:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-400 font-bold uppercase block mb-0.5">T1</span>
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-800">{viewData.track1Status || 'OK'}</span>
                        </div>
                        <div className="p-1.5 sm:p-2 md:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-400 font-bold uppercase block mb-0.5">T2</span>
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-800">{viewData.track2Status || 'OK'}</span>
                        </div>
                        <div className="p-1.5 sm:p-2 md:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-400 font-bold uppercase block mb-0.5">MagPrint</span>
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-800">{viewData.magnePrintStatus || 'Valid'}</span>
                        </div>
                        <div className="p-1.5 sm:p-2 md:p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-emerald-600 font-bold uppercase block mb-0.5">Score</span>
                          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-700">{viewData.getScore || '100%'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Enlarged Image Lightbox Modal - Responsive */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-3.5 bg-slate-50 border-b border-slate-200 gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">{enlargedImage.title}</h3>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                <a
                  href={`data:image/jpeg;base64,${enlargedImage.src}`}
                  download={`voucher-${enlargedImage.title.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer flex-1 sm:flex-none justify-center"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" /> 
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setEnlargedImage(null)}
                  className="p-1 sm:p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Image Body */}
            <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-slate-100/80 flex items-center justify-center select-none">
              <img
                src={`data:image/jpeg;base64,${enlargedImage.src}`}
                alt={enlargedImage.title}
                className="max-w-full max-h-[60vh] sm:max-h-[65vh] md:max-h-[72vh] object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
              />
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-slate-50 border-t border-slate-200 gap-2">
              <span className="text-[10px] sm:text-xs text-slate-500 text-center sm:text-left">
                {enlargedImage.title} • Scanned Optical Capture
              </span>
              <button
                onClick={() => setEnlargedImage(null)}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] sm:text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 sm:py-4 text-center text-slate-400 text-[9px] sm:text-xs border-t border-slate-200 bg-white mt-auto px-2">
        Powered by X100 Cheque & Card Verification System
      </footer>
    </div>
  );
};

export default View;