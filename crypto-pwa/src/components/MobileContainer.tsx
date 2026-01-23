import type { ReactNode } from 'react';

interface MobileContainerProps {
  children: ReactNode;
}

export default function MobileContainer({ children }: MobileContainerProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-mobile w-full min-h-screen bg-white dark:bg-gray-800 shadow-lg">
        {children}
      </div>
    </div>
  );
}
