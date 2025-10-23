import { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface SearchContainerProps {
  children: ReactNode;
  className?: string;
}

export function SearchContainer({ children, className }: SearchContainerProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      {children}
    </div>
  );
}