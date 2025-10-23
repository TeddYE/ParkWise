import { ReactNode } from 'react';

interface SearchContainerProps {
  children: ReactNode;
  className?: string;
}

export function SearchContainer({ children, className }: SearchContainerProps) {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      {children}
    </div>
  );
}