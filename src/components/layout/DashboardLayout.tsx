import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex justify-end py-3 px-8">
            <NotificationBell />
          </div>
        </div>
        <div className="container py-6 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
