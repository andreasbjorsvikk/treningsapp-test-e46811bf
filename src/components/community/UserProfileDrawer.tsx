import { useState, useEffect } from 'react';
import { Friend, getChallenges, getChallengeParticipants, getChallengeProgress, ChallengeRow } from '@/services/communityService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Swords, Activity, Clock, Mountain, Loader2, TrendingUp, ChevronLeft, Trophy, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType, PrimaryGoalPeriod } from '@/types/workout';
import { useAuth } from '@/hooks/useAuth';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { getMonthTarget, getYearTarget, getActiveGoalForDate, getYearExpectedProgress, getEarliestStart, convertGoalValue } from '@/services/primaryGoalService';
import ChallengeDetail from '@/components/community/ChallengeDetail';
import { ChallengeWithParticipants } from '@/pages/CommunityPage';

interface UserProfileDrawerProps {
  user: Friend | null;
  open: boolean;
  onClose: () => void;
  onInviteToChallenge?: (user: Friend) => void;
}

type StatPeriod = 'week' | 'month' | 'year';

interface PeriodStats {
  sessions: number;
  duration: number;
  distance: number;
  elevation: number;
}

interface SharedChallenge {
  id: string;
  name: string;
  emoji: string | null;
  metric: string;
  target: number;
  periodEnd: string;
  myProgress: number;
  friendProgress: number;
  isActive: boolean;
}

interface RecentSession {
  type: string;
  date: string;
  distance: number | null;
  duration_minutes: number;
  title: string | null;
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getYearStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function rowToPeriod(row: any): PrimaryGoalPeriod {
  return {
    id: row.id,
    inputPeriod: row.input_period,
    inputTarget: row.input_target,
    validFrom: row.valid_from,
    createdAt: row.created_at,
  };
}

const UserProfileDrawer = ({ user, open, onClose, onInviteToChallenge }: UserProfileDrawerProps) => {
  const { user: me } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [statPeriod, setStatPeriod] = useState<StatPeriod>('week');
  const [periodStats, setPeriodStats] = useState<Record<StatPeriod, PeriodStats>>({
    week: { sessions: 0, duration: 0, distance: 0, elevation: 0 },
    month: { sessions: 0, duration: 0, distance: 0, elevation: 0 },
    year: { sessions: 0, duration: 0, distance: 0, elevation: 0 },
  });
  const [activityBreakdown, setActivityBreakdown] = useState<{ type: string; count: number }[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [sharedChallenges, setSharedChallenges] = useState<SharedChallenge[]>([]);
  const [friendGoalPeriods, setFriendGoalPeriods] = useState<PrimaryGoalPeriod[]>([]);
  const [friendMonthSessions, setFriendMonthSessions] = useState(0);
  const [friendYearSessions, setFriendYearSessions] = useState(0);
  const [challengeDetailData, setChallengeDetailData] = useState<ChallengeWithParticipants | null>(null);
  const [fullChallengeData, setFullChallengeData] = useState<Map<string, ChallengeWithParticipants>>(new Map());
  const [friendPrivacy, setFriendPrivacy] = useState<{
    workouts: string; stats: string; goals: string; peakCheckins: string;
    workoutsFriends: string[]; statsFriends: string[]; goalsFriends: string[]; peakCheckinsFriends: string[];
  }>({ workouts: 'me', stats: 'me', goals: 'me', peakCheckins: 'friends', workoutsFriends: [], statsFriends: [], goalsFriends: [], peakCheckinsFriends: [] });

  // Helper to check if current user can see a privacy-protected section
  const canSee = (level: string, friendsList: string[]): boolean => {
    if (!me) return false;
    if (level === 'me') return false;
    if (level === 'friends') return true; // already friends (RLS ensures this)
    if (level === 'selected') return friendsList.includes(me.id);
    return false;
  };

  const canSeeWorkouts = canSee(friendPrivacy.workouts, friendPrivacy.workoutsFriends);
  const canSeeStats = canSee(friendPrivacy.stats, friendPrivacy.statsFriends);
  const canSeeGoals = canSee(friendPrivacy.goals, friendPrivacy.goalsFriends);

  useEffect(() => {
    if (!user || !open || !me) return;

    const load = async () => {
      setLoading(true);

      // Load friend's privacy settings
      const { data: profileData } = await supabase
        .from('profiles')
        .select('privacy_workouts, privacy_stats, privacy_goals, privacy_peak_checkins, privacy_workouts_friends, privacy_stats_friends, privacy_goals_friends, privacy_peak_checkins_friends')
        .eq('id', user.id)
        .single();
      
      const privacy = {
        workouts: (profileData as any)?.privacy_workouts || 'me',
        stats: (profileData as any)?.privacy_stats || 'me',
        goals: (profileData as any)?.privacy_goals || 'me',
        peakCheckins: (profileData as any)?.privacy_peak_checkins || 'friends',
        workoutsFriends: (profileData as any)?.privacy_workouts_friends || [],
        statsFriends: (profileData as any)?.privacy_stats_friends || [],
        goalsFriends: (profileData as any)?.privacy_goals_friends || [],
        peakCheckinsFriends: (profileData as any)?.privacy_peak_checkins_friends || [],
      };
      setFriendPrivacy(privacy);

      const canSeeW = canSee(privacy.workouts, privacy.workoutsFriends);
      const canSeeS = canSee(privacy.stats, privacy.statsFriends);
      const canSeeG = canSee(privacy.goals, privacy.goalsFriends);
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();
      const yearStart = getYearStart();

      // Fetch friend's sessions (only if allowed)
      if (!canSeeW && !canSeeS) {
        setPeriodStats({ week: { sessions: 0, duration: 0, distance: 0, elevation: 0 }, month: { sessions: 0, duration: 0, distance: 0, elevation: 0 }, year: { sessions: 0, duration: 0, distance: 0, elevation: 0 } });
        setRecentSessions([]);
        setActivityBreakdown([]);
      }

      const { data: sessions } = canSeeW || canSeeS ? await supabase
        .from('workout_sessions')
        .select('type, date, distance, duration_minutes, elevation_gain, title')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(500) : { data: null };

      // We need goal periods loaded first to filter year sessions correctly
      let loadedGoalPeriods: PrimaryGoalPeriod[] = [];
      if (canSeeG) {
        try {
          const { data: goalRows } = await supabase
            .from('primary_goal_periods')
            .select('*')
            .eq('user_id', user.id)
            .order('valid_from', { ascending: true });
          loadedGoalPeriods = (goalRows || []).map(rowToPeriod);
          setFriendGoalPeriods(loadedGoalPeriods);
        } catch { setFriendGoalPeriods([]); }
      } else {
        setFriendGoalPeriods([]);
      }

      if (sessions) {
        const week: PeriodStats = { sessions: 0, duration: 0, distance: 0, elevation: 0 };
        const month: PeriodStats = { sessions: 0, duration: 0, distance: 0, elevation: 0 };
        const year: PeriodStats = { sessions: 0, duration: 0, distance: 0, elevation: 0 };
        const typeCounts: Record<string, number> = {};
        const earliestStart = getEarliestStart(loadedGoalPeriods);
        let yearSessionsForGoal = 0;

        for (const s of sessions) {
          const d = new Date(s.date);
          typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
          if (d >= weekStart) {
            week.sessions++; week.duration += s.duration_minutes || 0;
            week.distance += s.distance || 0; week.elevation += s.elevation_gain || 0;
          }
          if (d >= monthStart) {
            month.sessions++; month.duration += s.duration_minutes || 0;
            month.distance += s.distance || 0; month.elevation += s.elevation_gain || 0;
          }
          if (d >= yearStart) {
            year.sessions++; year.duration += s.duration_minutes || 0;
            year.distance += s.distance || 0; year.elevation += s.elevation_gain || 0;
            // Only count sessions from earliest goal start for year goal progress
            if (!earliestStart || d >= earliestStart) {
              yearSessionsForGoal++;
            }
          }
        }

        setPeriodStats({ week, month, year });
        setFriendMonthSessions(month.sessions);
        setFriendYearSessions(yearSessionsForGoal);
        setActivityBreakdown(
          Object.entries(typeCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
        );
        setRecentSessions(sessions.slice(0, 6));
      }

      // Fetch friend's primary goal periods (only if allowed)
      if (canSeeG) {
        try {
          const { data: goalRows } = await supabase
            .from('primary_goal_periods')
            .select('*')
            .eq('user_id', user.id)
            .order('valid_from', { ascending: true });
          setFriendGoalPeriods((goalRows || []).map(rowToPeriod));
        } catch { setFriendGoalPeriods([]); }
      } else {
        setFriendGoalPeriods([]);
      }

      // Fetch shared challenges
      try {
        const allChallenges = await getChallenges();
        const shared: SharedChallenge[] = [];
        const fullDataMap = new Map<string, ChallengeWithParticipants>();
        for (const c of allChallenges) {
          const parts = await getChallengeParticipants(c.id);
          const acceptedParts = parts.filter(p => p.status === 'accepted');
          const acceptedIds = acceptedParts.map(p => p.user_id);
          if (acceptedIds.includes(me.id) && acceptedIds.includes(user.id)) {
            const progress = await getChallengeProgress(c, acceptedIds);
            const now = new Date().toISOString().split('T')[0];
            shared.push({
              id: c.id, name: c.name, emoji: c.emoji, metric: c.metric,
              target: c.target, periodEnd: c.period_end,
              myProgress: progress[me.id] || 0, friendProgress: progress[user.id] || 0,
              isActive: c.period_end >= now,
            });
            // Build full challenge data for detail view
            const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', acceptedIds);
            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            const participantData = acceptedParts.map(p => {
              const profile = profileMap.get(p.user_id);
              return {
                userId: p.user_id,
                username: profile?.username || '?',
                avatarUrl: profile?.avatar_url || null,
                progress: progress[p.user_id] || 0,
                rank: 0,
                status: p.status,
              };
            }).sort((a, b) => b.progress - a.progress);
            participantData.forEach((p, i) => { p.rank = i + 1; });
            fullDataMap.set(c.id, { challenge: c, participants: participantData });
          }
        }
        setSharedChallenges(shared);
        setFullChallengeData(fullDataMap);
      } catch {}

      setLoading(false);
    };

    load();
  }, [user, open, me]);

  if (!user) return null;

  const stats = periodStats[statPeriod];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTarget = getMonthTarget(friendGoalPeriods, currentYear, currentMonth);
  const yearTarget = getYearTarget(friendGoalPeriods, currentYear);
  const monthPct = monthTarget > 0 ? Math.min(100, (friendMonthSessions / monthTarget) * 100) : 0;
  const yearPct = yearTarget > 0 ? Math.min(100, (friendYearSessions / yearTarget) * 100) : 0;

  // Compute pace diff accounting for goal start date
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const activeGoalForMonth = getActiveGoalForDate(friendGoalPeriods, monthEnd);
  const goalStartInMonth = activeGoalForMonth ? new Date(activeGoalForMonth.validFrom) : null;
  const goalStartDay = goalStartInMonth && goalStartInMonth.getFullYear() === currentYear && goalStartInMonth.getMonth() === currentMonth
    ? goalStartInMonth.getDate() : 1;
  const activeDaysInMonth = daysInMonth - goalStartDay + 1;
  const monthDaysElapsed = Math.max(0, now.getDate() - goalStartDay + now.getHours() / 24);
  const monthExpectedFraction = activeDaysInMonth > 0 ? Math.min(1, monthDaysElapsed / activeDaysInMonth) : 0;
  const monthExpected = monthTarget * monthExpectedFraction;
  const monthDiff = friendMonthSessions - monthExpected;

  const { expected: yearExpected } = getYearExpectedProgress(friendGoalPeriods, currentYear, now);
  const yearDiff = friendYearSessions - yearExpected;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}t ${m}m` : `${m}m`;
  };

  const metricUnit = (metric: string) => {
    switch (metric) {
      case 'distance': return 'km';
      case 'duration': return 'min';
      case 'elevation': return 'm';
      default: return '';
    }
  };

  const periodLabels: Record<StatPeriod, string> = { week: 'Denne uken', month: 'Denne måneden', year: 'I år' };

  return (
    <>
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh] h-[92vh]">
        <div className="overflow-y-auto scrollbar-hide pb-8 h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border/30">
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
              className="flex items-center gap-1 -ml-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px]"
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Profil</span>
            </button>
            <span className="flex-1" />
          </div>

          {/* Profile hero */}
          <div className="px-4 pt-6 pb-4 text-center">
            <div className="flex justify-center mb-3">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {(user.username || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="text-lg font-bold">{user.username || 'Ukjent'}</h2>
            {onInviteToChallenge && (
              <button
                onClick={() => onInviteToChallenge(user)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Swords className="w-4 h-4" /> Inviter til utfordring
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="px-4 space-y-5">
              {/* Stats section - requires workouts or stats permission */}
              {canSeeStats ? (
                <>
                  {/* Period selector */}
                  <div className="flex gap-1">
                    {(['week', 'month', 'year'] as StatPeriod[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setStatPeriod(p)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          statPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {p === 'week' ? 'Uke' : p === 'month' ? 'Måned' : 'År'}
                      </button>
                    ))}
                  </div>

                  {/* Stats grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{periodLabels[statPeriod]}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <StatTile icon={<Activity className="w-3.5 h-3.5" />} value={String(stats.sessions)} label="Økter" />
                      <StatTile icon={<Clock className="w-3.5 h-3.5" />} value={formatDuration(stats.duration)} label="Tid" />
                      <StatTile icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${stats.distance.toFixed(1)} km`} label="Distanse" />
                      <StatTile icon={<Mountain className="w-3.5 h-3.5" />} value={`${stats.elevation} m`} label="Høydemeter" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-secondary/40 p-4 text-center">
                  <Shield className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Statistikk er skjult</p>
                </div>
              )}

              {/* Goal progress bars - side by side */}
              {canSeeGoals && (monthTarget > 0 || yearTarget > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Målprogresjon</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {monthTarget > 0 && (
                      <GoalProgressBar
                        label="Måned"
                        current={friendMonthSessions}
                        target={Math.round(monthTarget)}
                        percent={monthPct}
                        diff={monthDiff}
                      />
                    )}
                    {yearTarget > 0 && (
                      <GoalProgressBar
                        label="År"
                        current={friendYearSessions}
                        target={Math.round(yearTarget)}
                        percent={yearPct}
                        diff={yearDiff}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Recent sessions */}
              {/* Recent sessions */}
              {canSeeWorkouts && recentSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Siste økter</h3>
                  <div className="space-y-1.5">
                    {recentSessions.map((s, i) => {
                      const colors = getActivityColors(s.type as SessionType, settings.darkMode);
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: colors.bg }}>
                            <ActivityIcon type={s.type as SessionType} className="w-4 h-4" colorOverride={!settings.darkMode ? colors.text : undefined} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title || s.type}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {s.distance ? <p className="text-sm font-medium">{s.distance.toFixed(1)} km</p> : null}
                            <p className="text-[11px] text-muted-foreground">{formatDuration(s.duration_minutes)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shared challenges - at bottom */}
              {sharedChallenges.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Felles utfordringer
                  </h3>
                  
                  {/* Active challenges */}
                  {sharedChallenges.filter(c => c.isActive).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Aktive</p>
                      {sharedChallenges.filter(c => c.isActive).map(ch => (
                        <div key={ch.id} className="cursor-pointer" onClick={() => setChallengeDetailData(fullChallengeData.get(ch.id) || null)}>
                          <ChallengeComparisonCard challenge={ch} friendName={user.username?.split(' ')[0] || '?'} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past challenges */}
                  {sharedChallenges.filter(c => !c.isActive).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Tidligere</p>
                      {sharedChallenges.filter(c => !c.isActive).map(ch => (
                        <div key={ch.id} className="cursor-pointer" onClick={() => setChallengeDetailData(fullChallengeData.get(ch.id) || null)}>
                          <ChallengeComparisonCard challenge={ch} friendName={user.username?.split(' ')[0] || '?'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {periodStats.year.sessions === 0 && periodStats.month.sessions === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Ingen treningsdata å vise ennå</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>

    <ChallengeDetail
      challenge={challengeDetailData}
      open={!!challengeDetailData}
      onClose={() => setChallengeDetailData(null)}
    />
    </>
  );
};

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-center">
      <div className="flex justify-center mb-1 text-primary">{icon}</div>
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function getProgressColor(diff: number): string {
  // Match ProgressWheel's getPaceColor logic
  if (diff >= 5) return 'hsl(152, 58%, 38%)';
  if (diff >= 1) return 'hsl(142, 50%, 48%)';
  if (diff >= -0.5) return 'hsl(142, 50%, 48%)';
  if (diff >= -2) return 'hsl(45, 85%, 48%)';
  if (diff >= -5) return 'hsl(25, 85%, 48%)';
  return 'hsl(0, 65%, 48%)';
}

function GoalProgressBar({ label, current, target, percent, diff }: { label: string; current: number; target: number; percent: number; diff: number }) {
  const barColor = percent >= 100 ? 'hsl(45, 90%, 50%)' : getProgressColor(diff);
  return (
    <div className="rounded-xl bg-secondary/50 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{current}/{target}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, percent)}%`, backgroundColor: barColor }} />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{Math.round(percent)}%</p>
    </div>
  );
}

function ChallengeComparisonCard({ challenge: ch, friendName }: { challenge: { id: string; name: string; emoji: string | null; metric: string; target: number; myProgress: number; friendProgress: number; isActive: boolean; periodEnd: string }; friendName: string }) {
  const metricUnit = (m: string) => { switch(m) { case 'distance': return 'km'; case 'duration': return 'min'; case 'elevation': return 'm'; default: return ''; } };
  const unit = metricUnit(ch.metric);
  const iAmLeading = ch.myProgress >= ch.friendProgress;
  const maxVal = Math.max(ch.myProgress, ch.friendProgress, ch.target || 1);
  const myPct = (ch.myProgress / maxVal) * 100;
  const friendPct = (ch.friendProgress / maxVal) * 100;
  const leaderLabel = iAmLeading ? '👑 Meg' : `👑 ${friendName}`;
  
  return (
    <div className="rounded-xl bg-secondary/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {ch.emoji && <span className="text-base">{ch.emoji}</span>}
        <span className="text-sm font-semibold flex-1">{ch.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{leaderLabel}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-10 text-muted-foreground">Meg</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${iAmLeading ? 'bg-primary' : 'bg-muted-foreground/40'}`} style={{ width: `${myPct}%` }} />
          </div>
          <span className="text-[11px] font-medium w-14 text-right">
            {ch.metric === 'sessions' ? ch.myProgress : ch.myProgress.toFixed(1)}{unit && ` ${unit}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-10 text-muted-foreground truncate">{friendName}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${!iAmLeading ? 'bg-primary' : 'bg-muted-foreground/40'}`} style={{ width: `${friendPct}%` }} />
          </div>
          <span className="text-[11px] font-medium w-14 text-right">
            {ch.metric === 'sessions' ? ch.friendProgress : ch.friendProgress.toFixed(1)}{unit && ` ${unit}`}
          </span>
        </div>
      </div>
      {ch.target > 0 && <p className="text-[10px] text-muted-foreground">Mål: {ch.target} {unit}</p>}
    </div>
  );
}

export default UserProfileDrawer;
