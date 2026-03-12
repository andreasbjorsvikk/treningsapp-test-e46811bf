import { ChallengeWithParticipants } from '@/pages/CommunityPage';
import { SessionType } from '@/types/workout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Activity, Home, Pencil, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

const metricUnits: Record<string, string> = {
  sessions: '',
  distance: 'km',
  duration: 't',
  elevation: 'm',
};


interface ChallengeCardProps {
  challenge: ChallengeWithParticipants;
  onClick: () => void;
  onEdit?: (challenge: ChallengeWithParticipants) => void;
}

const ChallengeCard = ({ challenge, onClick, onEdit }: ChallengeCardProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const isDark = settings.darkMode;
  const c = challenge.challenge;
  const unit = metricUnits[c.metric] || '';
  const myParticipant = challenge.participants.find(p => p.userId === user?.id);
  const activityTypes = c.activity_type === 'all' ? [] : c.activity_type.split(',');

  const locale = t('date.locale');
  const startDate = new Date(c.period_start);
  const endDate = new Date(c.period_end);
  const periodStr = `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;

  // Only show accepted participants (and self if pending)
  const visibleParticipants = challenge.participants.filter(p => {
    if (p.status === 'accepted') return true;
    if (p.status === 'pending' && p.userId === user?.id) return true;
    return false;
  });
  const sorted = [...visibleParticipants].sort((a, b) => a.rank - b.rank);
  const maxProgress = Math.max(...visibleParticipants.map(p => p.progress), 1);

  return (
    <button
      onClick={onClick}
      className="w-full glass-card card-gradient rounded-lg p-3.5 text-left transition-colors hover:bg-card/90 shadow-md"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {c.emoji && <span className="text-xl">{c.emoji}</span>}
          <h3 className="font-display font-semibold text-base">{c.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          {activityTypes.length > 0 ? (
            activityTypes.map(type => {
              const colors = getActivityColors(type as SessionType, isDark);
              return (
                <div
                  key={type}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.bg }}
                >
                  <ActivityIcon type={type as SessionType} className="w-3.5 h-3.5" colorOverride={colors.text} />
                </div>
              );
            })
          ) : (
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm text-muted-foreground">{periodStr}</p>
        <p className="text-sm font-medium text-accent">
          {c.target > 0
            ? `${t('challengeCard.target')}: ${c.target} ${unit}`
            : t(`challenge.noTarget.${c.metric}`)
          }
        </p>
      </div>

      {/* Progress bars with ranking */}
      <div className="space-y-2 mb-2.5">
        {sorted.slice(0, 3).map((p, i) => {
          const pct = c.target > 0
            ? Math.min((p.progress / c.target) * 100, 100)
            : maxProgress > 0 ? (p.progress / maxProgress) * 100 : 0;
          const isSelf = p.userId === user?.id;
          const isLeader = i === 0 && p.progress > 0;
          return (
            <div key={p.userId} className="flex items-center gap-2">
              <span className={`text-xs font-bold w-5 text-center ${
                i === 0 ? 'text-warning' : 'text-muted-foreground'
              }`}>
                {isLeader ? <Trophy className="w-3.5 h-3.5 inline" /> : `#${p.rank}`}
              </span>
              <Avatar className="w-5 h-5 shrink-0 border border-background">
                {p.avatarUrl ? <AvatarImage src={p.avatarUrl} /> : null}
                <AvatarFallback className="text-[8px] font-medium">{(p.username || '?')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs truncate ${isSelf ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {isSelf ? t('common.me') : p.username}
                  </span>
                  <span className="text-xs font-medium ml-1">
                    {(c.metric === 'distance' ? p.progress.toFixed(1) : Math.round(p.progress))}{unit ? ` ${unit}` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isLeader ? 'bg-accent' : 'bg-muted-foreground/40'}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {myParticipant && (
            <span className="text-sm font-medium text-accent">#{myParticipant.rank}</span>
          )}
          <span className="text-sm text-muted-foreground">· {visibleParticipants.length} {t('challengeCard.participants')}</span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && c.created_by === user?.id && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(challenge); }}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title={t('common.edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const current = settings.pinnedChallengeIds || [];
              const isPinned = current.includes(c.id);
              const next = isPinned ? current.filter(id => id !== c.id) : [...current, c.id];
              updateSettings({ pinnedChallengeIds: next });
              toast.success(isPinned ? t('challenge.removedFromHome') : t('challenge.addedToHome'));
            }}
            className={`p-1.5 rounded-md transition-colors ${
              (settings.pinnedChallengeIds || []).includes(c.id)
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground/40 hover:text-muted-foreground'
            }`}
            title={(settings.pinnedChallengeIds || []).includes(c.id) ? t('challenge.removeFromHome') : t('challenge.showOnHome')}
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <div className="flex -space-x-1.5 ml-1">
            {challenge.participants.slice(0, 4).map(p => (
              <Avatar key={p.userId} className="w-6 h-6 border border-background">
                {p.avatarUrl ? <AvatarImage src={p.avatarUrl} /> : null}
                <AvatarFallback className="text-[9px] font-medium">{(p.username || '?')[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ChallengeCard;