import { useState } from 'react';
import { X, ChevronRight, Target, Sparkles, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import GoalWheelsPreview from '@/components/tutorial/GoalWheelsPreview';
import { useTranslation } from '@/i18n/useTranslation';

interface GoalTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

const GoalExamples = ({ t }: { t: (key: string) => string }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground text-center">{t('tutorial.examples')}</p>
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="distance" activityType="løping" percent={65} current={26} target={40} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">{t('goalTutorial.example1')}</p>
      </div>
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="sessions" activityType="styrke" percent={40} current={4} target={10} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">{t('goalTutorial.example2')}</p>
      </div>
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="elevation" activityType="fjelltur" percent={55} current={2750} target={5000} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">{t('goalTutorial.example3')}</p>
      </div>
    </div>
  </div>
);

const GoalTutorialDialog = ({ open, onClose }: GoalTutorialDialogProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < 1) setStep(1);
    else onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setStep(0); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <button
            onClick={() => { onClose(); setStep(0); }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          {step === 0 ? (
            <>
              <div className="flex justify-center text-primary">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-display font-bold text-lg text-foreground">{t('goalTutorial.title')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('goalTutorial.desc')}</p>
              </div>
              <GoalWheelsPreview />
            </>
          ) : (
            <>
              <div className="flex justify-center text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-display font-bold text-lg text-foreground">{t('goalTutorial.otherGoals')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('goalTutorial.otherGoalsDesc')}</p>
              </div>
              <GoalExamples t={t} />
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>{t('goalTutorial.showOnHome')}</span>
                <Home className="w-3.5 h-3.5 text-primary inline" />
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {[0, 1].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {step === 0 && (
                <Button variant="ghost" size="sm" onClick={() => { onClose(); setStep(0); }} className="text-muted-foreground">
                  {t('tutorial.skip')}
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1">
                {step === 0 ? (
                  <>{t('tutorial.next')} <ChevronRight className="w-3.5 h-3.5" /></>
                ) : (
                  t('tutorial.understood')
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalTutorialDialog;
