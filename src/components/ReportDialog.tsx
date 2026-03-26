import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Trophy, Award, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ReportData } from '@/utils/reportUtils';
import ActivityIcon from '@/components/ActivityIcon';
import ProgressWheel from '@/components/ProgressWheel';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import { SessionType } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  data: ReportData | null;
  onRepeatGoal?: (goalId: string) => void;
}

// Custom SVG: Mountain with elevation text inside
const MountainGraphic = ({ value }: { value: string }) => (
  <svg viewBox="0 0 120 90" className="w-full h-full" fill="none">
    <path d="M10 85 L40 20 L55 45 L70 15 L110 85 Z" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" />
    <path d="M40 20 L48 35 L55 45 L50 38 Z" fill="hsl(var(--primary) / 0.08)" />
    <path d="M70 15 L78 30 L85 42 L75 35 Z" fill="hsl(var(--primary) / 0.08)" />
    <path d="M37 25 L40 20 L43 25 L41 24 Z" fill="hsl(var(--muted-foreground) / 0.2)" />
    <path d="M67 20 L70 15 L73 20 L71 19 Z" fill="hsl(var(--muted-foreground) / 0.2)" />
    <text x="60" y="62" textAnchor="middle" className="fill-foreground font-extrabold" fontSize="16">{value} m</text>
  </svg>
);

// Custom SVG: Horizontal road with km on it
const RoadGraphic = ({ value }: { value: string }) => (
  <svg viewBox="0 0 120 90" className="w-full h-full" fill="none">
    <path d="M5 55 L115 55" stroke="hsl(var(--primary) / 0.3)" strokeWidth="18" strokeLinecap="round" />
    <path d="M5 55 L115 55" stroke="hsl(var(--primary) / 0.12)" strokeWidth="14" strokeLinecap="round" />
    <path d="M10 55 L110 55" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1" strokeLinecap="round" strokeDasharray="6 5" />
    <text x="60" y="42" textAnchor="middle" className="fill-foreground font-extrabold" fontSize="16">{value} km</text>
  </svg>
);

// Custom SVG: Clock with time inside
const ClockGraphic = ({ value }: { value: string }) => (
  <svg viewBox="0 0 120 90" className="w-full h-full" fill="none">
    <circle cx="60" cy="45" r="35" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.25)" strokeWidth="2" />
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 60 + 30 * Math.sin(rad);
      const y1 = 45 - 30 * Math.cos(rad);
      const x2 = 60 + 33 * Math.sin(rad);
      const y2 = 45 - 33 * Math.cos(rad);
      return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" />;
    })}
    <line x1="60" y1="45" x2="60" y2="22" stroke="hsl(var(--primary) / 0.4)" strokeWidth="2" strokeLinecap="round" />
    <line x1="60" y1="45" x2="75" y2="38" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="60" cy="45" r="2" fill="hsl(var(--primary) / 0.4)" />
    <text x="60" y="56" textAnchor="middle" className="fill-foreground font-bold" fontSize="11">{value}</text>
  </svg>
);

const ReportDialog = ({ open, onClose, data, onRepeatGoal }: ReportDialogProps) => {
  const [slide, setSlide] = useState(0);
  const [repeatConfirm, setRepeatConfirm] = useState<string | null>(null);
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  if (!data) return null;

  const formatMetricUnit = (metric: string) => {
    if (metric === 'distance') return 'km';
    if (metric === 'elevation') return 'm';
    if (metric === 'minutes') return 'timer';
    return 'økter';
  };

  const slides: React.ReactNode[] = [];

  // Slide 1: Overview
  slides.push(
    <div className="space-y-5" key="overview">
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {data.period === 'week' ? 'Ukesrapport' : 'Månedsrapport'}
        </p>
        <h3 className="font-display font-bold text-2xl text-foreground">
          {data.period === 'month'
            ? data.periodLabel.split(' ')[0]
            : data.periodLabel}
        </h3>
      </div>

      {data.totalSessions === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Ingen økter registrert denne {data.period === 'week' ? 'uken' : 'måneden'}.
        </p>
      ) : (
        <>
          {/* Session count */}
          <div className="text-center">
            <p className="text-5xl font-extrabold text-foreground leading-none">{data.totalSessions}</p>
            <p className="text-sm text-muted-foreground mt-0">
              {data.totalSessions === 1 ? 'økt' : 'økter'}
            </p>
          </div>

          {/* Session type chips */}
          <div className="flex justify-center gap-2 flex-wrap">
            {Object.entries(data.sessionsByType)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const colors = getActivityColors(type as SessionType, isDark);
                return (
                  <div key={type} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/20"
                    style={{ backgroundColor: colors.bg }}>
                    <ActivityIcon type={type as SessionType} className="w-5 h-5" colorOverride={colors.text} />
                    <span className="text-sm font-semibold" style={{ color: colors.text }}>{count}</span>
                  </div>
                );
              })}
          </div>

          {/* Custom graphic stats */}
          <div className="grid grid-cols-3 gap-2">
            {data.totalDistance > 0 && (
              <div className="animate-fade-in">
                <RoadGraphic value={data.totalDistance.toFixed(1)} />
              </div>
            )}
            {data.totalElevation > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <MountainGraphic value={data.totalElevation.toLocaleString()} />
              </div>
            )}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <ClockGraphic value={data.totalMinutes >= 60 ? `${Math.floor(data.totalMinutes / 60)}t${data.totalMinutes % 60}m` : `${data.totalMinutes}m`} />
            </div>
          </div>

          {/* Fun facts - compact */}
          {data.funFacts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {data.funFacts.map((fact, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/15 animate-fade-in"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{fact}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Slide 2 (month only): Primary goal wheel — NO card wrapper
  if (data.period === 'month' && data.primaryGoalTarget !== null && data.primaryGoalTarget > 0) {
    const percent = (data.primaryGoalCurrent! / data.primaryGoalTarget) * 100;
    const diff = data.primaryGoalCurrent! - data.primaryGoalTarget;
    slides.push(
      <div className="space-y-4" key="primary-goal">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Månedsmål</p>
          <h3 className="font-display font-bold text-lg text-foreground">
            {data.periodLabel.split(' ')[0]}
          </h3>
        </div>

        <div className="flex justify-center py-2">
          <div className="w-44 h-44">
            <ProgressWheel
              percent={percent}
              current={data.primaryGoalCurrent!}
              target={data.primaryGoalTarget}
              unit={data.primaryGoalUnit}
              title=""
              hasGoal={true}
              naked={true}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          {data.primaryGoalCurrent! >= data.primaryGoalTarget ? (
            <>
              <p className="text-lg font-bold text-foreground">Du nådde målet! 🎯</p>
              {diff > 0 && (
                <p className="text-sm text-muted-foreground">
                  Du hadde {diff} {diff === 1 ? 'økt' : data.primaryGoalUnit} mer enn målet
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-foreground">Nesten!</p>
              <p className="text-sm text-muted-foreground">
                Du hadde {Math.abs(diff)} {Math.abs(diff) === 1 ? 'økt' : data.primaryGoalUnit} fra målet
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Slide 3: Extra goals
  if (data.extraGoals.length > 0) {
    slides.push(
      <div className="space-y-5" key="extra-goals">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {data.period === 'week' ? 'Ukesmål' : 'Månedsmål'}
          </p>
          <h3 className="font-display font-bold text-lg text-foreground">Andre mål</h3>
        </div>

        <div className="space-y-3">
          {data.extraGoals.map(({ goal, current, reached }) => {
            const percent = goal.target > 0 ? (current / goal.target) * 100 : 0;
            const unit = formatMetricUnit(goal.metric);
            const currentDisplay = goal.metric === 'distance' ? current.toFixed(1) : Math.round(current);
            return (
              <div key={goal.id}
                className={`p-3 rounded-2xl border-2 space-y-2 ${
                  reached
                    ? 'bg-green-500/8 border-green-500/40'
                    : 'bg-red-500/8 border-red-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0">
                    <GoalProgressVisual
                      metric={goal.metric as any}
                      activityType={goal.activityType as any}
                      percent={Math.min(percent, 100)}
                      current={current}
                      target={goal.target}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {goal.target} {unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentDisplay} {unit} {reached ? 'oppnådd' : `av ${goal.target}`}
                    </p>
                  </div>
                  {reached ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>

                {/* Repeat goal button */}
                {!goal.repeating ? (
                  repeatConfirm === goal.id ? (
                    <div className="flex items-center gap-2 pt-1">
                      <p className="text-xs text-muted-foreground flex-1">
                        Gjenta for neste {data.period === 'week' ? 'uke' : 'måned'}?
                      </p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRepeatConfirm(null)}>
                        Avbryt
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
                        onRepeatGoal?.(goal.id);
                        setRepeatConfirm(null);
                      }}>
                        <Check className="w-3 h-3" /> Ja
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      onClick={() => setRepeatConfirm(goal.id)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Gjenta mål?
                    </Button>
                  )
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center pt-1 flex items-center justify-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5" />
                    Gjentas automatisk
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Slide 4: Challenge results
  if (data.challenges.length > 0) {
    slides.push(
      <div className="space-y-5" key="challenges">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Utfordringer</p>
          <h3 className="font-display font-bold text-lg text-foreground">
            {data.period === 'month' ? data.periodLabel.split(' ')[0] : data.periodLabel}
          </h3>
        </div>

        <div className="space-y-3">
          {data.challenges.map((c, i) => (
            <div key={i} className="p-3 rounded-2xl bg-muted/30 border border-border/20 space-y-2">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                Du ble #{c.rank} av {c.total}
              </p>
              <div className="space-y-1">
                {c.leaderboard.slice(0, 5).map((entry, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    <span className="font-bold w-4 text-right">{j + 1}.</span>
                    <span className="truncate flex-1">{entry.username}</span>
                    <span className="font-medium">{entry.progress.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalSlides = slides.length;
  const currentSlide = Math.min(slide, totalSlides - 1);

  const next = () => {
    if (currentSlide < totalSlides - 1) setSlide(s => s + 1);
    else { onClose(); setSlide(0); }
  };

  const prev = () => {
    if (currentSlide > 0) setSlide(s => s - 1);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setSlide(0); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <button
            onClick={() => { onClose(); setSlide(0); }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {slides[currentSlide]}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {currentSlide > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1">
                {currentSlide < totalSlides - 1 ? <>Neste <ChevronRight className="w-3.5 h-3.5" /></> : 'Lukk'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
