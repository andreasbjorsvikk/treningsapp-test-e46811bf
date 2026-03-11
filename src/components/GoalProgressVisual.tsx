import { GoalMetric, SessionType } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface GoalProgressVisualProps {
  metric: GoalMetric;
  activityType: string;
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

  // In dark mode, colors.text is often white which is invisible on dark bg
  // Use colors.bg (which is the vivid activity color in dark mode) for fill
  const fillColor = isDark ? colors.bg : colors.text;
  const ghostColor = isDark ? colors.bg : colors.text;

  // Use unique IDs based on a combination to avoid SVG clip conflicts
  const uid = `${metric}-${activityType}-${Math.round(fillPct)}`;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={`${Math.round(fillPct)}% fremgang`}>
        {metric === 'elevation' ? (
          <MountainShape fillPct={fillPct} color={fillColor} ghostColor={ghostColor} done={done} uid={uid} />
        ) : metric === 'minutes' ? (
          <ClockShape fillPct={fillPct} color={fillColor} ghostColor={ghostColor} done={done} />
        ) : metric === 'distance' ? (
          <DistanceShape fillPct={fillPct} color={fillColor} ghostColor={ghostColor} done={done} uid={uid} />
        ) : (
          <BoltShape fillPct={fillPct} color={fillColor} ghostColor={ghostColor} done={done} uid={uid} />
        )}
      </svg>
    </div>
  );
};

// Mountain for elevation
function MountainShape({ fillPct, color, ghostColor, done, uid }: { fillPct: number; color: string; ghostColor: string; done: boolean; uid: string }) {
  const clipY = 58 - (fillPct / 100) * 50;
  return (
    <>
      <defs>
        <clipPath id={`mtn-${uid}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      <path d="M32 6 L58 58 H6 Z" fill={ghostColor} opacity={0.15} strokeLinejoin="round" />
      <path d="M32 6 L58 58 H6 Z" fill={color} opacity={done ? 1 : 0.85} clipPath={`url(#mtn-${uid})`} strokeLinejoin="round" />
    </>
  );
}

// Clock for minutes/hours
function ClockShape({ fillPct, color, ghostColor, done }: { fillPct: number; color: string; ghostColor: string; done: boolean }) {
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
      <circle cx={cx} cy={cy} r={r} fill={ghostColor} opacity={0.15} />
      <path d={arcPath} fill={color} opacity={done ? 1 : 0.85} />
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

// Horizontal road bar for distance
function DistanceShape({ fillPct, color, ghostColor, done, uid }: { fillPct: number; color: string; ghostColor: string; done: boolean; uid: string }) {
  const barY = 24;
  const barH = 16;
  const barW = 56;
  const barX = 4;
  const fillW = (fillPct / 100) * barW;
  
  return (
    <>
      <rect x={barX} y={barY} width={barW} height={barH} rx={8} fill={ghostColor} opacity={0.15} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={i} x={barX + 4 + i * 6.5} y={barY + 7} width={3.5} height={2} rx={1} fill={ghostColor} opacity={0.1} />
      ))}
      <rect x={barX} y={barY} width={Math.max(fillW, barH)} height={barH} rx={8} fill={color} opacity={done ? 1 : 0.85} />
      <rect x={barX} y={barY} width={fillW} height={barH} rx={8} fill={color} opacity={done ? 1 : 0.85} />
    </>
  );
}

// Lightning bolt for sessions
function BoltShape({ fillPct, color, ghostColor, done, uid }: { fillPct: number; color: string; ghostColor: string; done: boolean; uid: string }) {
  const clipY = 60 - (fillPct / 100) * 56;
  return (
    <>
      <defs>
        <clipPath id={`bolt-${uid}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      <path d="M36 4 L16 34 H28 L22 60 L48 26 H34 Z" fill={ghostColor} opacity={0.15} />
      <path d="M36 4 L16 34 H28 L22 60 L48 26 H34 Z" fill={color} opacity={done ? 1 : 0.85} clipPath={`url(#bolt-${uid})`} />
    </>
  );
}

export default GoalProgressVisual;
