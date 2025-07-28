import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ 
  onClick, 
  disabled = false, 
  className, 
  children,
  icon
}) => {
  return (
    <Button 
      onClick={onClick} 
      disabled={disabled}
      className={cn("w-full justify-start mb-2 gap-2", className)}
      variant="outline"
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </Button>
  );
};

export default SidebarButton;