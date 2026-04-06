import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';

type AppDataContextType = ReturnType<typeof useAppData>;

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const data = useAppData();
  return (
    <AppDataContext.Provider value={data}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppDataContext() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    // During HMR, the context may temporarily be null — force a re-render
    // instead of crashing with a blank screen.
    const [, forceUpdate] = useState(0);
    useEffect(() => {
      const t = setTimeout(() => forceUpdate((n) => n + 1), 50);
      return () => clearTimeout(t);
    }, []);
    throw new Error('useAppDataContext must be used within AppDataProvider');
  }
  return ctx;
}
