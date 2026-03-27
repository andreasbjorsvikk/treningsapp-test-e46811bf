/**
 * useProfile — React Query-backed hook for user profile data.
 * Cached via IDB persist for offline access.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Optimistic update
    queryClient.setQueryData(['profile', user.id], (old: Profile | undefined) =>
      old ? { ...old, ...updates } : old
    );
    const { error } = await supabase.from('profiles').update(updates as any).eq('id', user.id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      throw error;
    }
  };

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile,
    refetch: query.refetch,
  };
}
