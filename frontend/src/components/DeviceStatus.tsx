
import React from 'react';

interface DeviceStatusProps {
  connected: boolean;
}

const DeviceStatus: React.FC<DeviceStatusProps> = ({ connected }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-4 h-4 rounded-full ${connected ? 'bg-scanner-connected' : 'bg-scanner-disconnected'}`}
        aria-label={connected ? 'Device Connected' : 'Device Disconnected'}
      />
      {/* <span className="text-sm font-medium">
        {connected ? 'Connected' : 'Disconnected'}
      </span> */}
    </div>
  );
};

export default DeviceStatus;
