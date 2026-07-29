import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ 
  onClick, 
  disabled = false, 
  className, 
  children,
  icon,
  variant = "outline"
}) => {
  return (
    <Button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "w-full justify-start mb-2 gap-2 text-xs font-semibold tracking-wide py-2.5 px-3 rounded-md border transition-all duration-200 shadow-2xs active:scale-[0.98]",
        className
      )}
      variant={variant}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      {children}
    </Button>
  );
};

export default SidebarButton;