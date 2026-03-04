import { ChallengeWithParticipants } from '@/pages/CommunityPage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, MountainSnow, Activity, Home, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

const metricIcons: Record<string, typeof Activity> = {
  sessions: Activity,
  distance: MapPin,
  duration: Clock,
  elevation: MountainSnow,
};

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
  const c = challenge.challenge;
  const Icon = metricIcons[c.metric] || Activity;
  const unit = metricUnits[c.metric] || '';
  const myParticipant = challenge.participants.find(p => p.userId === user?.id);
  const progressPct = myParticipant && c.target > 0 ? Math.min((myParticipant.progress / c.target) * 100, 100) : 0;

  const locale = t('date.locale');
  const startDate = new Date(c.period_start);
  const endDate = new Date(c.period_end);
  const periodStr = `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;

  return (
    <button
      onClick={onClick}
      className="w-full glass-card rounded-lg p-3.5 text-left transition-colors hover:bg-card/90 shadow-md"
      style={{ background: 'linear-gradient(to bottom right, hsl(var(--primary) / 0.14), hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.11))' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {c.emoji && <span className="text-xl">{c.emoji}</span>}
          <h3 className="font-display font-semibold text-base">{c.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{periodStr}</p>
        <p className="text-sm font-medium text-accent">
          {c.target > 0
            ? `${t('challengeCard.target')}: ${c.target} ${unit}`
            : t(`challenge.noTarget.${c.metric}`)
          }
        </p>
      </div>

      {/* Progress bars */}
      <div className="space-y-1.5 mb-2.5">
        {challenge.participants.slice(0, 3).map(p => (
          <div key={p.userId} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16 truncate">{p.username}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: c.target > 0 ? `${Math.min((p.progress / c.target) * 100, 100)}%` : '0%' }}
              />
            </div>
            <span className="text-sm font-medium w-14 text-right">
              {p.progress}{unit ? ` ${unit}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {myParticipant && (
            <span className="text-sm font-medium text-accent">#{myParticipant.rank}</span>
          )}
          <span className="text-sm text-muted-foreground">· {challenge.participants.length} {t('challengeCard.participants')}</span>
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
