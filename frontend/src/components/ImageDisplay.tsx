import React from 'react';
import { ShieldCheck, Image as ImageIcon } from 'lucide-react';

interface ImageDisplayProps {
  label: string;
  imageData: string | null;
  onCompare?: () => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ label, imageData, onCompare }) => {
  return (
    <div className="border border-slate-200/90 bg-white rounded-xl p-4 shadow-sm relative group hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${imageData ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
          {label} Image View
        </h3>
        {imageData && (
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full font-semibold">
            Captured
          </span>
        )}
      </div>
      <div className="bg-slate-50/80 border border-dashed border-slate-200 rounded-lg h-64 flex items-center justify-center relative overflow-hidden transition-colors group-hover:border-slate-300">
        {imageData ? (
          <img 
            src={`data:image/jpeg;base64,${imageData}`} 
            alt={`${label} of voucher`}
            className="max-w-full max-h-full object-contain p-2 drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200/80">
              <ImageIcon className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs font-medium text-slate-500">No image available</span>
          </div>
        )}
      </div>
      {label === 'Front' && imageData && (
        <button
          onClick={onCompare}
          className="absolute bottom-6 right-6 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-100 shrink-0" />
          <span className="animate-pulse tracking-wide font-semibold text-white">Validate Signature</span>
        </button>
      )}
    </div>
  );
};

export default ImageDisplay;