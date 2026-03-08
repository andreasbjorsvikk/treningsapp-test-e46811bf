import { useMemo, useState } from 'react';
import { Pencil, Trash2, Home } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';
import { getSessionsInPeriod, computeProgress, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Layers } from 'lucide-react';

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
}

function formatCustomDate(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const day = d.getDate();
  const monthStr = d.toLocaleString(locale, { month: 'short' });
  return `${day}. ${monthStr}`;
}

interface GoalCardProps {
  goal: ExtraGoal;
  sessions: WorkoutSession[];
  onEdit: (goal: ExtraGoal) => void;
  onDelete: (id: string) => void;
  onToggleHome: (id: string) => void;
}

const GoalCard = ({ goal, sessions, onEdit, onDelete, onToggleHome }: GoalCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { settings } = useSettings();
  const { t, locale } = useTranslation();
  const isDark = settings.darkMode;

  const periodSessions = useMemo(
    () => getSessionsInPeriod(sessions, goal.period, goal.activityType, goal.customStart, goal.customEnd),
    [sessions, goal]
  );

  const current = computeProgress(periodSessions, goal.metric);
  const pct = Math.min((current / goal.target) * 100, 100);
  const done = current >= goal.target;
  const remaining = Math.max(0, goal.target - current);
  const daysLeft = getDaysRemainingInPeriod(goal.period, goal.customEnd);
  const fraction = getPeriodFractionElapsed(goal.period, goal.customStart, goal.customEnd);
  const expected = goal.target * fraction;

  const type = goal.activityType === 'all' ? 'styrke' : goal.activityType;
  const colors = getActivityColors(type, isDark);
  const isActivitySpecific = goal.activityType !== 'all';

  const periodLabels: Record<GoalPeriod | 'custom', string> = {
    week: t('goalCard.thisWeek'),
    month: t('goalCard.thisMonth'),
    year: t('goalCard.thisYear'),
    custom: '',
  };

  const periodLabel = goal.period === 'custom'
    ? `${formatCustomDate(goal.customStart, locale)} – ${formatCustomDate(goal.customEnd, locale)}`
    : periodLabels[goal.period];

  const getScheduleStatus = (cur: number, exp: number, isDone: boolean): { label: string; className: string } => {
    if (isDone) return { label: t('goalCard.reached'), className: 'text-success font-semibold' };
    const diff = cur - exp;
    const tolerance = exp * 0.05;
    if (Math.abs(diff) <= tolerance && exp > 0) return { label: t('goalCard.onTrack'), className: 'text-primary font-medium' };
    if (cur >= exp) return { label: t('goalCard.ahead'), className: 'text-success font-medium' };
    return { label: t('goalCard.behind'), className: 'text-warning font-medium' };
  };

  const schedule = getScheduleStatus(current, expected, done);

  const parsedRgb = colors.bg.match(/\d+/g);
  const cardBg = isActivitySpecific && parsedRgb
    ? { backgroundColor: `rgba(${parsedRgb[0]}, ${parsedRgb[1]}, ${parsedRgb[2]}, ${isDark ? 0.15 : 0.25})` }
    : {};

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2 relative group"
      style={cardBg}
    >
      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(goal)} className="p-1 rounded-md hover:bg-secondary transition-colors">
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="p-1 rounded-md hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>

      {/* Progress visual */}
      <div className="w-24 h-24">
        <GoalProgressVisual
          metric={goal.metric}
          activityType={goal.activityType}
          percent={pct}
          current={current}
          target={goal.target}
        />
      </div>

      {/* Activity icon */}
      <div className="flex items-center justify-center">
        {goal.activityType === 'all' ? (
          <div className="rounded-full p-1 bg-secondary">
            <Layers className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-full p-1" style={{ backgroundColor: colors.bg }}>
            <ActivityIcon type={goal.activityType} className="w-5 h-5" colorOverride={!isDark ? colors.text : undefined} />
          </div>
        )}
      </div>

      <p className="text-sm font-bold">
        {formatValue(current, goal.metric)} / {formatValue(goal.target, goal.metric)}
        <span className="text-xs font-normal text-muted-foreground ml-1">{t(`metric.${goal.metric}`)}</span>
      </p>

      {!done && (
        <p className="text-xs text-muted-foreground">
          {formatValue(remaining, goal.metric)} {t(`metric.${goal.metric}`)} {t('goalCard.remaining')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {!done && (
        <p className="text-xs text-muted-foreground">{daysLeft} {t('goalCard.daysLeft')}</p>
      )}

      <p className={`text-xs ${schedule.className}`}>{schedule.label}</p>

      {/* Home toggle */}
      <button
        onClick={() => onToggleHome(goal.id)}
        className={`absolute bottom-2 left-2 p-1 rounded-md transition-colors ${
          goal.showOnHome
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        }`}
        title={goal.showOnHome ? t('goals.removeFromHome') : t('goals.showOnHome')}
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goalCard.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goalCard.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(goal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalCard;
