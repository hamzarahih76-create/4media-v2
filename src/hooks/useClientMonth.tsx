import { createContext, useContext, useState, ReactNode } from 'react';

interface ClientMonthContextType {
  selectedMonth: Date;
  setSelectedMonth: (date: Date | ((prev: Date) => Date)) => void;
}

const ClientMonthContext = createContext<ClientMonthContextType>({
  selectedMonth: new Date(),
  setSelectedMonth: () => {},
});

export function ClientMonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  return (
    <ClientMonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </ClientMonthContext.Provider>
  );
}

export function useClientMonth() {
  return useContext(ClientMonthContext);
}
