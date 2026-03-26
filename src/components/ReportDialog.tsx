import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Trophy, Award, Check, Mountain, Route, Clock, RefreshCw } from 'lucide-react';
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

  // Build slides dynamically
  const slides: React.ReactNode[] = [];

  // Slide 1: Overview stats — redesigned
  slides.push(
    <div className="space-y-6" key="overview">
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {data.period === 'week' ? 'Ukesrapport' : 'Månedsrapport'}
        </p>
        <h3 className="font-display font-bold text-2xl text-foreground">
          {data.period === 'month'
            ? data.periodLabel.split(' ')[0] // Just "Mars" not "Mars 2026"
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
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.totalSessions === 1 ? 'økt' : 'økter'}
            </p>
          </div>

          {/* Session type chips - larger */}
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

          {/* Stats cards with illustrations */}
          <div className="grid grid-cols-3 gap-2">
            {data.totalDistance > 0 && (
              <div className="text-center p-3 rounded-2xl bg-muted/30 border border-border/20 relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-center opacity-10 pointer-events-none">
                  <Route className="w-16 h-16 text-primary" strokeWidth={1} />
                </div>
                <p className="text-xl font-extrabold text-foreground relative z-10 animate-fade-in">{data.totalDistance.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider relative z-10">km</p>
              </div>
            )}
            {data.totalElevation > 0 && (
              <div className="text-center p-3 rounded-2xl bg-muted/30 border border-border/20 relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-center opacity-10 pointer-events-none">
                  <Mountain className="w-16 h-16 text-primary" strokeWidth={1} />
                </div>
                <p className="text-xl font-extrabold text-foreground relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  {data.totalElevation.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider relative z-10">høydemeter</p>
              </div>
            )}
            <div className="text-center p-3 rounded-2xl bg-muted/30 border border-border/20 relative overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-center opacity-10 pointer-events-none">
                <Clock className="w-16 h-16 text-primary" strokeWidth={1} />
              </div>
              <p className="text-xl font-extrabold text-foreground relative z-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {data.totalMinutes >= 60 ? `${Math.floor(data.totalMinutes / 60)}t ${data.totalMinutes % 60}m` : `${data.totalMinutes}m`}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider relative z-10">varighet</p>
            </div>
          </div>

          {/* Fun facts - more exciting */}
          {data.funFacts.length > 0 && (
            <div className="space-y-2 pt-1">
              {data.funFacts.map((fact, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/15 animate-fade-in"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{fact}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Slide 2 (month only): Primary goal wheel — no card wrapper
  if (data.period === 'month' && data.primaryGoalTarget !== null && data.primaryGoalTarget > 0) {
    const percent = (data.primaryGoalCurrent! / data.primaryGoalTarget) * 100;
    const diff = data.primaryGoalCurrent! - data.primaryGoalTarget;
    slides.push(
      <div className="space-y-5" key="primary-goal">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Månedsmål</p>
          <h3 className="font-display font-bold text-lg text-foreground">
            {data.periodLabel.split(' ')[0]}
          </h3>
        </div>

        <div className="flex justify-center">
          <div className="w-44 h-44">
            <ProgressWheel
              percent={percent}
              current={data.primaryGoalCurrent!}
              target={data.primaryGoalTarget}
              unit={data.primaryGoalUnit}
              title=""
              hasGoal={true}
            />
          </div>
        </div>

        <div className="text-center space-y-1.5">
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

  // Slide 3: Extra goals for the period
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
              <div key={goal.id} className="p-3 rounded-2xl bg-muted/30 border border-border/20 space-y-2">
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
                  {/* Medal or X */}
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
                      Gjenta mål
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
