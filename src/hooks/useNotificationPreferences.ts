/**
 * Hook for managing notification preferences stored in the database.
 * Provides cached preferences with optimistic updates.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationPreferences {
  friend_challenge: boolean;
  challenge_complete: boolean;
  goal_reached: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
}

const DEFAULTS: NotificationPreferences = {
  friend_challenge: true,
  challenge_complete: true,
  goal_reached: true,
  weekly_report: true,
  monthly_report: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notification-preferences', user?.id];

  const { data: preferences, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) return DEFAULTS;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Try to create default row, but don't fail if RLS blocks it
        const { data: created, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (insertError) {
          console.warn('[notification_preferences] Insert failed, using defaults:', insertError.message);
          return DEFAULTS;
        }
        return {
          friend_challenge: created.friend_challenge,
          challenge_complete: created.challenge_complete,
          goal_reached: created.goal_reached,
          weekly_report: created.weekly_report,
          monthly_report: created.monthly_report,
        };
      }
      return {
        friend_challenge: data.friend_challenge,
        challenge_complete: data.challenge_complete,
        goal_reached: data.goal_reached,
        weekly_report: data.weekly_report,
        monthly_report: data.monthly_report,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user) return;
      const { error } = await supabase
        .from('notification_preferences')
        .update(patch as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<NotificationPreferences>(queryKey);
      queryClient.setQueryData(queryKey, { ...(prev ?? DEFAULTS), ...patch });
      return { prev };
    },
    onError: (_err, _patch, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    preferences: preferences ?? DEFAULTS,
    isLoading,
    updatePreference: (key: keyof NotificationPreferences, value: boolean) => {
      mutation.mutate({ [key]: value });
    },
  };
}
