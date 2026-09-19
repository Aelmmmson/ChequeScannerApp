import React, { useState } from 'react';
import { ShieldCheck, Image as ImageIcon, ZoomIn, X, Download } from 'lucide-react';
import { appConfig } from '@/config/appConfig';

interface ImageDisplayProps {
  label: string;
  imageData: string | null;
  onCompare?: () => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ label, imageData, onCompare }) => {
  const [isEnlarged, setIsEnlarged] = useState<boolean>(false);

  return (
    <>
      <div className="border border-slate-200/90 bg-white rounded-xl p-4 shadow-sm relative group hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${imageData ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
            {label} Image View
          </h3>
          {imageData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEnlarged(true)}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                title={`Enlarge ${label} Image`}
              >
                <ZoomIn className="w-3 h-3" />
                <span>Enlarge</span>
              </button>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full font-semibold">
                Captured
              </span>
            </div>
          )}
        </div>

        {/* Image Container with Hover Overlay */}
        <div 
          onClick={() => imageData && setIsEnlarged(true)}
          className={`bg-slate-50/80 border border-dashed border-slate-200 rounded-lg h-64 flex items-center justify-center relative overflow-hidden transition-all group/container ${
            imageData ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/20' : ''
          }`}
        >
          {imageData ? (
            <>
              <img 
                src={`data:image/jpeg;base64,${imageData}`} 
                alt={`${label} of voucher`}
                className="max-w-full max-h-full object-contain p-2 drop-shadow-xs transition-transform duration-300 group-hover/container:scale-[1.02]"
              />

              {/* Hover View Overlay Icon */}
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] opacity-0 group-hover/container:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <div className="p-2 bg-white/90 text-blue-700 rounded-full shadow-lg transform group-hover/container:scale-110 transition-transform duration-200">
                  <ZoomIn className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2.5 py-0.5 rounded-full shadow">
                  Click to Enlarge {label} View
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200/80">
                <ImageIcon className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs font-medium text-slate-500">No image available</span>
            </div>
          )}
        </div>

        {label === 'Front' && imageData && onCompare && appConfig.SIGNATURE_VALIDATION_ENABLED === 'Y' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className="absolute bottom-6 right-6 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer z-10"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-100 shrink-0" />
            <span className="animate-pulse tracking-wide font-semibold text-white">Validate Signature</span>
          </button>
        )}
      </div>

      {/* Enlarged Image Lightbox Modal */}
      {isEnlarged && imageData && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsEnlarged(false)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enlarged {label} Image View</h3>
                  <p className="text-[11px] text-slate-500 font-normal">High resolution scanned document capture</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`data:image/jpeg;base64,${imageData}`}
                  download={`voucher-${label.toLowerCase()}-image.jpg`}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Download image"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setIsEnlarged(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/70 flex items-center justify-center select-none">
              <img
                src={`data:image/jpeg;base64,${imageData}`}
                alt={`Enlarged ${label} of voucher`}
                className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{label} View • MagTek Optical Scan</span>
              <button
                onClick={() => setIsEnlarged(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageDisplay;