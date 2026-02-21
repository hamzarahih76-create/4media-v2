import { Outlet } from 'react-router-dom';
import { ClientMonthProvider } from '@/hooks/useClientMonth';

export function ClientMonthWrapper() {
  return (
    <ClientMonthProvider>
      <Outlet />
    </ClientMonthProvider>
  );
}
