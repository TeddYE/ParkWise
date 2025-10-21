import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  header?: ReactNode;
}

export function AppLayout({ children, header }: AppLayoutProps) {
  return (
    <div className="h-full bg-background flex flex-col">
      {header}
      <main className="flex-1 overflow-hidden relative z-0">
        {children}
      </main>
    </div>
  );
}