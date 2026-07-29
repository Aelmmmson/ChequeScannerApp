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
    <div className={compact ? "mb-2" : "mb-3.5"}>
      <label className={`block ${compact ? 'text-[11px]' : 'text-xs'} font-semibold tracking-wider uppercase text-slate-500 mb-1`}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group">
        <input
          type="text"
          readOnly={readOnly}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          className={`w-full ${compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2 text-sm'} border rounded-lg transition-all duration-150 font-medium ${
            readOnly 
              ? 'bg-slate-50/80 border-slate-200/90 text-slate-800 focus:outline-none' 
              : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 hover:border-slate-400 shadow-2xs'
          } pr-9`}
        />
        {!readOnly && (
          <Edit className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors h-3.5 w-3.5 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default InfoField;