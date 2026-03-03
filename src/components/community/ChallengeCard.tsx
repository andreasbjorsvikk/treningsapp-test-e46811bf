import { Challenge, metricUnits } from '@/data/mockCommunity';
import { MapPin, Clock, MountainSnow, Activity } from 'lucide-react';

const metricIcons: Record<string, typeof Activity> = {
  sessions: Activity,
  distance: MapPin,
  duration: Clock,
  elevation: MountainSnow,
};

interface ChallengeCardProps {
  challenge: Challenge;
  onClick: (c: Challenge) => void;
}

const ChallengeCard = ({ challenge, onClick }: ChallengeCardProps) => {
  const Icon = metricIcons[challenge.metric] || Activity;
  const unit = metricUnits[challenge.metric];
  const myParticipant = challenge.participants.find(p => p.user.id === 'me');
  const progressPct = myParticipant ? Math.min((myParticipant.progress / challenge.target) * 100, 100) : 0;

  const startDate = new Date(challenge.periodStart);
  const endDate = new Date(challenge.periodEnd);
  const periodStr = `${startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`;

  return (
    <button
      onClick={() => onClick(challenge)}
      className="w-full glass-card rounded-lg p-3.5 text-left transition-colors hover:bg-card/90"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {challenge.emoji && <span className="text-xl">{challenge.emoji}</span>}
          <h3 className="font-display font-semibold text-base">{challenge.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{periodStr}</p>
        <p className="text-sm font-medium text-accent">
          {challenge.target > 0
            ? `Mål: ${challenge.target} ${unit}`
            : `Mest ${challenge.metric === 'sessions' ? 'økter' : challenge.metric === 'distance' ? 'km' : challenge.metric === 'duration' ? 'timer' : 'm'}`
          }
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-2.5">
        {challenge.participants.slice(0, 3).map(p => (
          <div key={p.user.id} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16 truncate">{p.user.username}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min((p.progress / challenge.target) * 100, 100)}%` }}
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
          <span className="text-sm text-muted-foreground">· {challenge.participants.length} deltakere</span>
        </div>
        {/* Participant avatars */}
        <div className="flex -space-x-1.5">
          {challenge.participants.slice(0, 4).map(p => (
            <div
              key={p.user.id}
              className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center"
            >
              <span className="text-[9px] font-medium">{p.user.username[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
};

export default ChallengeCard;
