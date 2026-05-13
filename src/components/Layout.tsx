import type { ReactNode } from 'react';
import Navbar from './Navbar';
import PageLoader from './PageLoader';

interface LayoutProps {
  children: ReactNode;
  loading?: boolean;
}

export default function Layout({ children, loading = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col transition-colors duration-200">
      {loading && <PageLoader />}
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
