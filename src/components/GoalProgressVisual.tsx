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
      <path d="M32 6 L58 58 H6 Z" fill={color} opacity={done ? 1 : 0.65} clipPath={`url(#mtn-${uid})`} strokeLinejoin="round" />
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
      <path d={arcPath} fill={color} opacity={done ? 1 : 0.6} />
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

// Horizontal road/bar for distance
function DistanceShape({ fillPct, color, done, uid }: { fillPct: number; color: string; done: boolean; uid: string }) {
  const barY = 26;
  const barH = 12;
  const barW = 52;
  const barX = 6;
  const fillW = (fillPct / 100) * barW;
  
  return (
    <>
      {/* Road background */}
      <rect x={barX} y={barY} width={barW} height={barH} rx={6} fill={color} opacity={0.12} />
      {/* Road dashes */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={i} x={barX + 4 + i * 6.5} y={barY + 5} width={3.5} height={2} rx={1} fill={color} opacity={0.08} />
      ))}
      {/* Filled progress */}
      <rect x={barX} y={barY} width={Math.max(fillW, barH)} height={barH} rx={6} fill={color} opacity={done ? 1 : 0.7}>
        <clipPath id={`dist-clip-${uid}`}>
          <rect x={barX} y={barY} width={fillW} height={barH} />
        </clipPath>
      </rect>
      <rect x={barX} y={barY} width={fillW} height={barH} rx={6} fill={color} opacity={done ? 1 : 0.7} />
      {/* Start pin */}
      <circle cx={barX + 3} cy={barY + barH + 6} r={2.5} fill={color} opacity={0.3} />
      <line x1={barX + 3} y1={barY + barH} x2={barX + 3} y2={barY + barH + 4} stroke={color} strokeWidth={1.5} opacity={0.3} />
      {/* End flag */}
      <line x1={barX + barW - 3} y1={barY - 2} x2={barX + barW - 3} y2={barY + barH + 6} stroke={color} strokeWidth={1.5} opacity={done ? 0.8 : 0.2} />
      <path d={`M${barX + barW - 3} ${barY - 2} L${barX + barW + 5} ${barY + 2} L${barX + barW - 3} ${barY + 6}`} fill={color} opacity={done ? 0.9 : 0.2} />
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
