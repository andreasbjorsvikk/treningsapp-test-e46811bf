import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Trophy, TrendingUp, Target, Award, BarChart3 } from 'lucide-react';
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
}

const ReportDialog = ({ open, onClose, data }: ReportDialogProps) => {
  const [slide, setSlide] = useState(0);
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  if (!data) return null;

  // Build slides dynamically
  const slides: React.ReactNode[] = [];

  // Slide 1: Overview stats
  slides.push(
    <div className="space-y-5" key="overview">
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data.period === 'week' ? 'Ukesrapport' : 'Månedsrapport'}
        </p>
        <h3 className="font-display font-bold text-xl text-foreground">{data.periodLabel}</h3>
      </div>

      {data.totalSessions === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">Ingen økter registrert denne {data.period === 'week' ? 'uken' : 'måneden'}.</p>
      ) : (
        <>
          {/* Session count with type icons */}
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-foreground">{data.totalSessions}</p>
            <p className="text-sm text-muted-foreground">
              {data.totalSessions === 1 ? 'økt' : 'økter'}
            </p>
            <div className="flex justify-center gap-1.5 flex-wrap pt-1">
              {Object.entries(data.sessionsByType)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const colors = getActivityColors(type as SessionType, isDark);
                  return (
                    <div key={type} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/30"
                      style={{ backgroundColor: colors.bg }}>
                      <ActivityIcon type={type as SessionType} className="w-4 h-4" colorOverride={colors.text} />
                      <span className="text-xs font-medium" style={{ color: colors.text }}>{count}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {data.totalDistance > 0 && (
              <div className="text-center p-3 rounded-xl bg-muted/40 border border-border/30">
                <p className="text-lg font-bold text-foreground">{data.totalDistance.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">km</p>
              </div>
            )}
            {data.totalElevation > 0 && (
              <div className="text-center p-3 rounded-xl bg-muted/40 border border-border/30">
                <p className="text-lg font-bold text-foreground">{data.totalElevation.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">hm</p>
              </div>
            )}
            <div className="text-center p-3 rounded-xl bg-muted/40 border border-border/30">
              <p className="text-lg font-bold text-foreground">
                {data.totalMinutes >= 60 ? `${Math.floor(data.totalMinutes / 60)}t ${data.totalMinutes % 60}m` : `${data.totalMinutes}m`}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">varighet</p>
            </div>
          </div>

          {/* Fun facts */}
          {data.funFacts.length > 0 && (
            <div className="space-y-2 pt-1">
              {data.funFacts.map((fact, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground">{fact}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Slide 2 (month only): Primary goal wheel
  if (data.period === 'month' && data.primaryGoalTarget !== null && data.primaryGoalTarget > 0) {
    const percent = (data.primaryGoalCurrent! / data.primaryGoalTarget) * 100;
    const diff = data.primaryGoalCurrent! - data.primaryGoalTarget;
    slides.push(
      <div className="space-y-5" key="primary-goal">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Månedsmål</p>
          <h3 className="font-display font-bold text-lg text-foreground">{data.periodLabel}</h3>
        </div>

        <div className="flex justify-center">
          <div className="w-40 h-40">
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

        <div className="text-center space-y-2">
          {data.primaryGoalCurrent! >= data.primaryGoalTarget ? (
            <>
              <p className="text-lg font-bold text-foreground">Du nådde målet!</p>
              {diff > 0 && (
                <p className="text-sm text-muted-foreground">{diff} {data.primaryGoalUnit} mer enn målet</p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-foreground">Nesten!</p>
              <p className="text-sm text-muted-foreground">
                {Math.abs(diff)} {data.primaryGoalUnit} {diff < 0 ? 'fra målet' : 'over målet'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Slide 3: Extra goals for the period (only if any exist)
  if (data.extraGoals.length > 0) {
    slides.push(
      <div className="space-y-5" key="extra-goals">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {data.period === 'week' ? 'Ukesmål' : 'Månedsmål'}
          </p>
          <h3 className="font-display font-bold text-lg text-foreground">Andre mål</h3>
        </div>

        <div className="space-y-4">
          {data.extraGoals.map(({ goal, current, reached }) => {
            const percent = goal.target > 0 ? (current / goal.target) * 100 : 0;
            return (
              <div key={goal.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/30">
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
                  <p className="text-sm font-semibold text-foreground truncate">
                    {goal.target} {goal.metric === 'distance' ? 'km' : goal.metric === 'elevation' ? 'm' : goal.metric === 'minutes' ? 'timer' : 'økter'}
                  </p>
                  <p className={`text-xs ${reached ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                    {reached ? 'Mål nådd!' : percent >= 80 ? 'Nesten!' : `${current.toFixed(current % 1 ? 1 : 0)} / ${goal.target}`}
                  </p>
                </div>
                {reached && <Award className="w-5 h-5 text-green-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Slide 4 (month only): Challenge results
  if (data.period === 'month' && data.challenges.length > 0) {
    slides.push(
      <div className="space-y-5" key="challenges">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utfordringer</p>
          <h3 className="font-display font-bold text-lg text-foreground">{data.periodLabel}</h3>
        </div>

        <div className="space-y-3">
          {data.challenges.map((c, i) => (
            <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-2">
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
