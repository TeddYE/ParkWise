import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ViewContainerProps {
  children: ReactNode;
  className?: string;
}

export function ViewContainer({ children, className }: ViewContainerProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      {children}
    </div>
  );
}