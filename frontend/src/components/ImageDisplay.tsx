import React from 'react';

interface ImageDisplayProps {
  label: string;
  imageData: string | null;
  onCompare?: () => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ label, imageData, onCompare }) => {
  return (
    <div className="border-2 border-scanner-lightgray bg-white rounded-md p-4 mb-4 shadow-md relative">
      <h3 className="font-medium text-scanner-text mb-2">{label}</h3>
      <div className="bg-white border border-dashed border-scanner-lightgray rounded-md h-64 flex items-center justify-center">
        {imageData ? (
          <img 
            src={`data:image/jpeg;base64,${imageData}`} 
            alt={`${label} of voucher`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-gray-500">No image available</span>
        )}
      </div>
      {label === 'Front' && imageData && (
        <button
          onClick={onCompare}
          className="absolute bottom-2 right-2 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-md text-blue-600 font-semibold rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200"
        >
          Compare Signature
        </button>
      )}
    </div>
  );
};

export default ImageDisplay;