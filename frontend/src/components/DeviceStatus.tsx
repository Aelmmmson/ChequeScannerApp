
import React from 'react';

interface DeviceStatusProps {
  connected: boolean;
}

const DeviceStatus: React.FC<DeviceStatusProps> = ({ connected }) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
      connected 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
        : 'bg-slate-800/80 text-slate-400 border-slate-700/80'
    }`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
      <span className="tracking-wider uppercase">{connected ? 'Scanner Ready' : 'Disconnected'}</span>
    </div>
  );
};

export default DeviceStatus;
