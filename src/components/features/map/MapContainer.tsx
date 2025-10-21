import { ReactNode } from 'react';

interface MapContainerProps {
  children: ReactNode;
  className?: string;
}

export function MapContainer({ children, className }: MapContainerProps) {
  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {children}
    </div>
  );
}