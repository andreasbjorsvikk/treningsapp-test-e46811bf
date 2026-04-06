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
  if (!ctx) throw new Error('useAppDataContext must be used within AppDataProvider');
  return ctx;
}
