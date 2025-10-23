import { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface MapContainerProps {
  children: ReactNode;
  className?: string;
}

export function MapContainer({ children, className }: MapContainerProps) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      {children}
    </div>
  );
}