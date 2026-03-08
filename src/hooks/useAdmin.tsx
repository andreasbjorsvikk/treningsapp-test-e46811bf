import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminContextType {
  isAdmin: boolean;
  adminMode: boolean;
  setAdminMode: (on: boolean) => void;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminMode: false,
  setAdminMode: () => {},
  loading: true,
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminMode(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      const hasAdmin = !!data;
      setIsAdmin(hasAdmin);
      if (!hasAdmin) setAdminMode(false);
      setLoading(false);
    };
    check();
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, adminMode, setAdminMode, loading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
