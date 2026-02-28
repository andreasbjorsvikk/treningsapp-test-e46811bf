import { GoalMetric, SessionType } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface GoalProgressVisualProps {
  metric: GoalMetric;
  activityType: SessionType | 'all';
  percent: number; // 0-100
  current: number;
  target: number;
}

const GoalProgressVisual = ({ metric, activityType, percent, current, target }: GoalProgressVisualProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  
  const type = activityType === 'all' ? 'styrke' : activityType;
  const colors = getActivityColors(type, isDark);
  const fillPct = Math.min(percent, 100);
  const done = percent >= 100;

  // Use unique IDs based on a combination to avoid SVG clip conflicts
  const uid = `${metric}-${activityType}-${Math.round(fillPct)}`;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={`${Math.round(fillPct)}% fremgang`}>
        {metric === 'elevation' ? (
          <MountainShape fillPct={fillPct} color={colors.text} done={done} uid={uid} />
        ) : metric === 'minutes' ? (
          <ClockShape fillPct={fillPct} color={colors.text} done={done} />
        ) : metric === 'distance' ? (
          <DistanceShape fillPct={fillPct} color={colors.text} done={done} uid={uid} />
        ) : (
          <BoltShape fillPct={fillPct} color={colors.text} done={done} uid={uid} />
        )}
      </svg>
    </div>
  );
};

// Mountain for elevation
function MountainShape({ fillPct, color, done, uid }: { fillPct: number; color: string; done: boolean; uid: string }) {
  const clipY = 58 - (fillPct / 100) * 50;
  return (
    <>
      <defs>
        <clipPath id={`mtn-${uid}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      <path d="M32 6 L58 58 H6 Z" fill={color} opacity={0.12} strokeLinejoin="round" />
      <path d="M32 6 L58 58 H6 Z" fill={color} opacity={done ? 1 : 0.7} clipPath={`url(#mtn-${uid})`} strokeLinejoin="round" />
      <path d="M32 6 L39 19 H25 Z" fill="white" opacity={0.45} />
    </>
  );
}

// Clock for minutes/hours
function ClockShape({ fillPct, color, done }: { fillPct: number; color: string; done: boolean }) {
  const angle = (fillPct / 100) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 32, cy = 32, r = 26;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = angle >= 360
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
    : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`;

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.1} />
      <path d={arcPath} fill={color} opacity={done ? 1 : 0.55} />
      <circle cx={cx} cy={cy} r={2.5} fill="white" opacity={0.85} />
      {[0, 90, 180, 270].map(a => {
        const tr = (a - 90) * (Math.PI / 180);
        return (
          <line
            key={a}
            x1={cx + 22 * Math.cos(tr)}
            y1={cy + 22 * Math.sin(tr)}
            x2={cx + 26 * Math.cos(tr)}
            y2={cy + 26 * Math.sin(tr)}
            stroke="white"
            strokeWidth={1.5}
            opacity={0.45}
          />
        );
      })}
    </>
  );
}

// Road/track ring for distance
function DistanceShape({ fillPct, color, done, uid }: { fillPct: number; color: string; done: boolean; uid: string }) {
  const cx = 32, cy = 32, r = 24;
  const circumference = 2 * Math.PI * r;
  const fillLen = (fillPct / 100) * circumference;
  const angle = (fillPct / 100) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy + r * Math.sin(rad);

  return (
    <>
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8} opacity={0.1} strokeLinecap="round" />
      {/* Filled arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        opacity={done ? 1 : 0.7}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={circumference - fillLen}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Progress dot */}
      {fillPct > 0 && fillPct < 100 && (
        <circle cx={dotX} cy={dotY} r={4} fill={color} opacity={0.9} />
      )}
      {/* Start marker */}
      <circle cx={cx} cy={cy - r} r={3} fill={color} opacity={0.4} />
      {/* Flag at finish */}
      {fillPct >= 100 && (
        <circle cx={cx} cy={cy - r} r={5} fill={color} opacity={1} />
      )}
      {/* Center km text */}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill={color} opacity={0.7}>
        km
      </text>
    </>
  );
}

// Lightning bolt for sessions
function BoltShape({ fillPct, color, done, uid }: { fillPct: number; color: string; done: boolean; uid: string }) {
  const clipY = 60 - (fillPct / 100) * 56;
  return (
    <>
      <defs>
        <clipPath id={`bolt-${uid}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      <path d="M36 4 L16 34 H28 L22 60 L48 26 H34 Z" fill={color} opacity={0.12} />
      <path d="M36 4 L16 34 H28 L22 60 L48 26 H34 Z" fill={color} opacity={done ? 1 : 0.7} clipPath={`url(#bolt-${uid})`} />
    </>
  );
}

export default GoalProgressVisual;
