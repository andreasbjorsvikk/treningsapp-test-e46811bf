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

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={`${Math.round(fillPct)}% fremgang`}>
        {metric === 'elevation' ? (
          <MountainShape fillPct={fillPct} color={colors.text} done={done} />
        ) : metric === 'minutes' ? (
          <ClockShape fillPct={fillPct} color={colors.text} done={done} />
        ) : metric === 'distance' ? (
          <CircuitShape fillPct={fillPct} color={colors.text} done={done} />
        ) : (
          <BoltShape fillPct={fillPct} color={colors.text} done={done} />
        )}
      </svg>
    </div>
  );
};

// Mountain for elevation
function MountainShape({ fillPct, color, done }: { fillPct: number; color: string; done: boolean }) {
  const clipY = 60 - (fillPct / 100) * 52;
  return (
    <>
      <defs>
        <clipPath id={`mtn-clip-${fillPct}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      {/* Background mountain */}
      <path d="M32 8 L58 56 H6 Z" fill={color} opacity={0.15} strokeLinejoin="round" />
      {/* Filled mountain */}
      <path d="M32 8 L58 56 H6 Z" fill={color} opacity={done ? 1 : 0.7} clipPath={`url(#mtn-clip-${fillPct})`} strokeLinejoin="round" />
      {/* Snow cap */}
      <path d="M32 8 L38 20 H26 Z" fill="white" opacity={0.5} />
    </>
  );
}

// Clock for minutes
function ClockShape({ fillPct, color, done }: { fillPct: number; color: string; done: boolean }) {
  const angle = (fillPct / 100) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 32, cy = 32, r = 24;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = angle >= 360
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
    : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`;

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.12} />
      <path d={arcPath} fill={color} opacity={done ? 1 : 0.6} />
      {/* Clock center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="white" opacity={0.8} />
      {/* Tick marks */}
      {[0, 90, 180, 270].map(a => {
        const tr = (a - 90) * (Math.PI / 180);
        return (
          <line
            key={a}
            x1={cx + 20 * Math.cos(tr)}
            y1={cy + 20 * Math.sin(tr)}
            x2={cx + 24 * Math.cos(tr)}
            y2={cy + 24 * Math.sin(tr)}
            stroke="white"
            strokeWidth={1.5}
            opacity={0.5}
          />
        );
      })}
    </>
  );
}

// Circuit/ring for distance — a donut that fills up
function CircuitShape({ fillPct, color, done }: { fillPct: number; color: string; done: boolean }) {
  const cx = 32, cy = 32, r = 22;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (fillPct / 100) * circumference;
  const angle = (fillPct / 100) * 360;
  const rad = ((angle - 90) * Math.PI) / 180;
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy + r * Math.sin(rad);

  return (
    <>
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6} opacity={0.12} />
      {/* Filled ring */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        opacity={done ? 1 : 0.7}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Moving dot */}
      {fillPct > 0 && fillPct < 100 && (
        <circle cx={dotX} cy={dotY} r={3.5} fill={color} opacity={0.9} />
      )}
      {/* Center km label */}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill={color} opacity={0.8}>
        km
      </text>
      {/* Start marker */}
      <circle cx={cx} cy={cy - r} r={2} fill={color} opacity={0.3} />
    </>
  );
}

// Lightning bolt for sessions
function BoltShape({ fillPct, color, done }: { fillPct: number; color: string; done: boolean }) {
  const clipY = 60 - (fillPct / 100) * 54;
  return (
    <>
      <defs>
        <clipPath id={`bolt-clip-${fillPct}`}>
          <rect x="0" y={clipY} width="64" height={64 - clipY} />
        </clipPath>
      </defs>
      {/* Background bolt */}
      <path d="M36 6 L18 34 H28 L24 58 L46 26 H34 Z" fill={color} opacity={0.15} />
      {/* Filled bolt */}
      <path d="M36 6 L18 34 H28 L24 58 L46 26 H34 Z" fill={color} opacity={done ? 1 : 0.7} clipPath={`url(#bolt-clip-${fillPct})`} />
    </>
  );
}

export default GoalProgressVisual;
