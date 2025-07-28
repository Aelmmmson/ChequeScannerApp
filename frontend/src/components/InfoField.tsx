import { Edit } from 'lucide-react';
import React from 'react';

interface InfoFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  compact?: boolean;
}

const InfoField: React.FC<InfoFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  readOnly = true,
  required = false,
  placeholder = "",
  compact = false
}) => {
  return (
    <div className={compact ? "mb-2" : "mb-4"}>
      <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-scanner-text mb-1`}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          readOnly={readOnly}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          className={`w-full ${compact ? 'p-1.5 text-xs' : 'p-2 text-sm'} border border-scanner-lightgray rounded-md ${
            readOnly ? 'bg-white' : 'bg-background'
          } text-scanner-text pr-10`}
        />
        {!readOnly && (
          <Edit className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        )}
      </div>
    </div>
  );
};

export default InfoField;