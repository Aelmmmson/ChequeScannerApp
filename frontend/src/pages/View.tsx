import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { Search, Image as ImageIcon, FileText, Loader2, X } from 'lucide-react';

interface ViewData {
  voucherNo?: string | null;
  narration?: string | null;
  frontImage?: string | null;
  backImage?: string | null;
}

const View: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialVoucherNo = queryParams.get('voucherNo');
  const [searchVoucherNo, setSearchVoucherNo] = useState<string>(initialVoucherNo || '');
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

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
      if (!response.success) {
        toast({
          title: "Data Not Found",
          description: response.message || `No data found for voucher ${voucherNo}.`,
          variant: "destructive",
        });
        setViewData(null);
      } else {
        setViewData({
          voucherNo: response.data.voucherNo,
          narration: response.data.narration,
          frontImage: response.data.frontImage,
          backImage: response.data.backImage,
        });
        setSearchVoucherNo(voucherNo);
        toast({
          title: "Data Loaded",
          description: `Voucher ${voucherNo} loaded successfully.`,
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

  const openImage = (image: string) => {
    setEnlargedImage(image);
  };

  const closeImage = () => {
    setEnlargedImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-2 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <ImageIcon className="h-5 w-5 animate-pulse" />
          <h1 className="text-xl font-semibold tracking-tight">Voucher Viewer</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto p-2 sm:p-6 w-full">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-8 mb-6 animate-fade-in">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-2">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-transform group-hover:scale-110" />
              <input
                type="text"
                value={searchVoucherNo}
                onChange={(e) => setSearchVoucherNo(e.target.value)}
                placeholder="Enter Voucher Number"
                className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-800 placeholder-gray-400 transition-all duration-200 hover:shadow-md"
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-blue-300 flex items-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  'Search'
                )}
              </button>
              {viewData && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-5 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center text-blue-600 animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading voucher data...
            </div>
          )}

          {/* Voucher Data Display */}
          {viewData && !isLoading && (
            <div className="space-y-1 animate-slide-up">
              {/* Bento Grid for Voucher Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Voucher Number
                  </label>
                  <input
                    type="text"
                    value={viewData.voucherNo || ''}
                    readOnly
                    className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Narration
                  </label>
                  <input
                    type="text"
                    value={viewData.narration || 'N/A'}
                    readOnly
                    className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Bento Grid for Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-dashed border-blue-300 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    Front Image
                  </label>
                  {viewData.frontImage ? (
                    <div
                      className="relative rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => openImage(viewData.frontImage!)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${viewData.frontImage}`}
                        alt="Front Image"
                        className="w-full h-48 sm:h-64 object-contain transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 sm:h-64 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                      No Front Image
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 border-2 border-dashed border-blue-300 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    Back Image
                  </label>
                  {viewData.backImage ? (
                    <div
                      className="relative rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => openImage(viewData.backImage!)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${viewData.backImage}`}
                        alt="Back Image"
                        className="w-full h-48 sm:h-64 object-contain transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 sm:h-64 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                      No Back Image
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!viewData && !isLoading && !initialVoucherNo && (
            <div className="text-center text-gray-500 flex items-center justify-center gap-2">
              <Search className="h-5 w-5" />
              Enter a voucher number to view details.
            </div>
          )}
          {/* Footer */}
          <footer className="py-4 text-center">
            <p className="text-blue-700 text-sm italic animate-pulse">Powered by X100</p>
            {/* Card Details */}
        {/* <div className="col-lg-4 col-md-6">
          <div className="flip-card">
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <p className="heading_8264">MASTERCARD</p>
                <svg className="logo" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48">
                  <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path>
                  <path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path>
                  <path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48s-2.376-8.95-6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
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
                <svg version="1.1" className="contactless" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 50 50" xmlSpace="preserve">
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
                <p className="number">5105 1051 0510 5100</p>
                <p className="valid_thru">VALID THRU</p>
                <p className="date_8264">1 2 / 2 4</p>
                <p className="name">ANDERSON BENJAMIN</p>
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
        </div> */}
        {/* End of Card Details */}



          </footer>
        </div>
      </main >



  {/* Enlarged Image Modal */ }
{
  enlargedImage && (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={closeImage}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
          onClick={closeImage}
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>
        <img
          src={`data:image/jpeg;base64,${enlargedImage}`}
          alt="Enlarged Image"
          className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
        />
      </div>
    </div>
  )
}
    </div >
  );
};

export default View;