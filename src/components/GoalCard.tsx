import { useMemo, useState } from 'react';
import { Pencil, Trash2, Home, Archive } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';
import { getSessionsInPeriod, computeProgress, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Layers, Repeat } from 'lucide-react';

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

// Parse activityType string into array of types
function parseActivityTypes(activityType: string): string[] {
  if (activityType === 'all') return ['all'];
  return activityType.split(',').filter(Boolean);
}

interface GoalCardProps {
  goal: ExtraGoal;
  sessions: WorkoutSession[];
  onEdit: (goal: ExtraGoal) => void;
  onDelete: (id: string) => void;
  onToggleHome: (id: string) => void;
  onArchive?: (id: string) => void;
}

const GoalCard = ({ goal, sessions, onEdit, onDelete, onToggleHome, onArchive }: GoalCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const { settings } = useSettings();
  const { t, locale } = useTranslation();
  const isDark = settings.darkMode;

  const activityTypes = parseActivityTypes(goal.activityType);
  const isMultiType = activityTypes.length > 1 && !activityTypes.includes('all');
  const isAll = activityTypes.includes('all');

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

  // For single-type goals, use that type's color
  const singleType = !isAll && !isMultiType ? activityTypes[0] as SessionType : null;
  const colors = singleType ? getActivityColors(singleType, isDark) : null;

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

  // Card background: single type = tinted, multi/all = neutral
  const parsedRgb = colors?.bg.match(/\d+/g);
  const cardBg = singleType && parsedRgb
    ? { backgroundColor: `rgba(${parsedRgb[0]}, ${parsedRgb[1]}, ${parsedRgb[2]}, ${isDark ? 0.15 : 0.25})` }
    : {};

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2 relative group"
      style={cardBg}
    >
      {/* Top-right: archive & delete with confirmation */}
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onArchive && (
          <button onClick={() => setShowArchiveConfirm(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title={t('goalCard.archive')}>
            <Archive className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>

      {/* Progress visual */}
      <div className="w-24 h-24">
        <GoalProgressVisual
          metric={goal.metric}
          activityType={singleType || 'all'}
          percent={pct}
          current={current}
          target={goal.target}
        />
      </div>

      {/* Activity icon(s) */}
      <div className="flex items-center justify-center">
        {isAll ? (
          <div className="rounded-full p-1 bg-secondary">
            <Layers className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : isMultiType ? (
          <div className="flex items-center -space-x-1">
            {activityTypes.slice(0, 4).map((type) => {
              const c = getActivityColors(type as SessionType, isDark);
              return (
                <div key={type} className="rounded-full p-0.5 border border-background" style={{ backgroundColor: c.bg }}>
                  <ActivityIcon type={type as SessionType} className="w-4 h-4" colorOverride={!isDark ? c.text : undefined} />
                </div>
              );
            })}
          </div>
        ) : singleType && colors ? (
          <div className="rounded-full p-1" style={{ backgroundColor: colors.bg }}>
            <ActivityIcon type={singleType} className="w-5 h-5" colorOverride={!isDark ? colors.text : undefined} />
          </div>
        ) : null}
      </div>

      <p className="text-base font-bold leading-none">
        {formatValue(current, goal.metric)} / {formatValue(goal.target, goal.metric)}
        <span className="text-sm font-normal text-muted-foreground ml-1">{t(`metric.${goal.metric}`)}</span>
      </p>

      {!done && (
        <p className="text-sm text-muted-foreground leading-none">
          {formatValue(remaining, goal.metric)} {t(`metric.${goal.metric}`)} {t('goalCard.remaining')}
        </p>
      )}

      <div className="flex items-center gap-1">
        {goal.repeating && <Repeat className="w-3 h-3 text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>

      {!done && (
        <p className="text-xs text-muted-foreground">{daysLeft} {t('goalCard.daysLeft')}</p>
      )}

      <p className={`text-xs ${schedule.className}`}>{schedule.label}</p>

      {/* Bottom-left: Home toggle */}
      <button
        onClick={() => onToggleHome(goal.id)}
        className={`absolute bottom-2 left-2 p-1.5 rounded-lg transition-colors ${
          goal.showOnHome
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        }`}
        title={goal.showOnHome ? t('goals.removeFromHome') : t('goals.showOnHome')}
      >
        <Home className="w-4 h-4" />
      </button>

      {/* Bottom-right: Edit button */}
      <button
        onClick={() => onEdit(goal)}
        className="absolute bottom-2 right-2 p-1.5 rounded-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
        title={t('common.edit')}
      >
        <Pencil className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goalCard.deleteOrArchiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goalCard.deleteOrArchiveDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={() => onDelete(goal.id)} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">{t('common.no')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goalCard.archiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goalCard.archiveDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={() => { if (onArchive) onArchive(goal.id); }} className="w-full">
              {t('common.yes')}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">{t('common.no')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalCard;
