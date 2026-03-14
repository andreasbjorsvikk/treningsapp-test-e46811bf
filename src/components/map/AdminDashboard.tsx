import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Mountain, TrendingUp, Activity, CalendarDays } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';

interface UserStat {
  total_users: number;
  new_this_week: number;
  new_this_month: number;
  active_this_week: number;
  active_this_month: number;
}

interface PeakStat {
  peak_id: string;
  peak_name: string;
  elevation: number;
  area: string;
  total_checkins: number;
  unique_visitors: number;
}

interface AdminLogEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  details: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStat | null>(null);
  const [peakStats, setPeakStats] = useState<PeakStat[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'peaks'>('users');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUserStats(), loadPeakStats()]);
    setLoading(false);
  };

  const loadUserStats = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, created_at');
      if (!profiles) return;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const total_users = profiles.length;
      const new_this_week = profiles.filter(p => new Date(p.created_at) >= weekStart).length;
      const new_this_month = profiles.filter(p => new Date(p.created_at) >= monthStart).length;

      // Active = users with checkins or workouts this week/month
      const weekStr = weekStart.toISOString();
      const monthStr = monthStart.toISOString();

      const [{ data: weekCheckins }, { data: monthCheckins }, { data: weekWorkouts }, { data: monthWorkouts }] = await Promise.all([
        supabase.from('peak_checkins').select('user_id').gte('checked_in_at', weekStr),
        supabase.from('peak_checkins').select('user_id').gte('checked_in_at', monthStr),
        supabase.from('workout_sessions').select('user_id').gte('date', weekStr),
        supabase.from('workout_sessions').select('user_id').gte('date', monthStr),
      ]);

      const activeWeekIds = new Set([
        ...(weekCheckins || []).map((c: any) => c.user_id),
        ...(weekWorkouts || []).map((w: any) => w.user_id),
      ]);
      const activeMonthIds = new Set([
        ...(monthCheckins || []).map((c: any) => c.user_id),
        ...(monthWorkouts || []).map((w: any) => w.user_id),
      ]);

      setUserStats({
        total_users,
        new_this_week,
        new_this_month,
        active_this_week: activeWeekIds.size,
        active_this_month: activeMonthIds.size,
      });
    } catch (e) {
      console.error('User stats error:', e);
    }
  };

  const loadPeakStats = async () => {
    try {
      const [{ data: checkins }, { data: peaks }] = await Promise.all([
        supabase.from('peak_checkins').select('peak_id, user_id'),
        supabase.from('peaks_db').select('id, name_no, elevation_moh, area'),
      ]);

      if (!checkins || !peaks) return;

      const peakMap = new Map(peaks.map(p => [p.id, p]));
      const peakCheckinMap = new Map<string, { total: number; visitors: Set<string> }>();

      for (const c of checkins as any[]) {
        if (!peakCheckinMap.has(c.peak_id)) {
          peakCheckinMap.set(c.peak_id, { total: 0, visitors: new Set() });
        }
        const entry = peakCheckinMap.get(c.peak_id)!;
        entry.total++;
        entry.visitors.add(c.user_id);
      }

      const stats: PeakStat[] = Array.from(peakCheckinMap.entries())
        .map(([peakId, data]) => {
          const peak = peakMap.get(peakId);
          return {
            peak_id: peakId,
            peak_name: peak?.name_no || 'Ukjent',
            elevation: peak?.elevation_moh || 0,
            area: peak?.area || '',
            total_checkins: data.total,
            unique_visitors: data.visitors.size,
          };
        })
        .sort((a, b) => b.total_checkins - a.total_checkins);

      setPeakStats(stats);
    } catch (e) {
      console.error('Peak stats error:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="font-display text-xl font-bold">Admin Dashboard</h2>

      {/* Tab selector */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
        {([
          { id: 'users' as const, label: 'Brukere', icon: Users },
          { id: 'peaks' as const, label: 'Fjelltopper', icon: Mountain },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && userStats && (
        <div className="space-y-3">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Totalt brukere" value={userStats.total_users} />
            <StatCard icon={TrendingUp} label="Nye denne uken" value={userStats.new_this_week} />
            <StatCard icon={CalendarDays} label="Nye denne måneden" value={userStats.new_this_month} />
            <StatCard icon={Activity} label="Aktive denne uken" value={userStats.active_this_week} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <StatCard icon={Activity} label="Aktive denne måneden" value={userStats.active_this_month} />
          </div>
          {userStats.total_users > 0 && (
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Engasjement</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold">
                  {Math.round((userStats.active_this_month / userStats.total_users) * 100)}%
                </span>
                <span className="text-xs text-muted-foreground">aktive brukere denne måneden</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full mt-2">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (userStats.active_this_month / userStats.total_users) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'peaks' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Mest populære fjelltopper etter antall innsjekkinger</p>
          {peakStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen innsjekkinger ennå.</p>
          ) : (
            <div className="space-y-2">
              {peakStats.slice(0, 30).map((peak, index) => (
                <div
                  key={peak.peak_id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                >
                  <div className="w-8 text-center font-display font-bold text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{peak.peak_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {peak.elevation} moh · {peak.area}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg">{peak.total_checkins}</p>
                    <p className="text-[10px] text-muted-foreground">{peak.unique_visitors} unike</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="p-3 rounded-xl bg-card border border-border/50 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default AdminDashboard;
