import { useState } from 'react';
import { X, ChevronRight, Home, CalendarDays, Map, Dumbbell, Users, Settings, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';
import connectWithStravaImg from '@/assets/strava/connect-with-strava.png';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  username?: string;
  onNavigateToStrava?: () => void;
  onRequestExit?: () => void;
}

const TOTAL_STEPS = 3;

const WelcomeDialog = ({ open, onClose, username, onNavigateToStrava, onRequestExit }: WelcomeDialogProps) => {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const tabs = [
    { icon: Home, label: t('welcome.tab.home'), desc: t('welcome.tab.homeDesc') },
    { icon: CalendarDays, label: t('welcome.tab.calendar'), desc: t('welcome.tab.calendarDesc') },
    { icon: Map, label: t('welcome.tab.map'), desc: t('welcome.tab.mapDesc') },
    { icon: Dumbbell, label: t('welcome.tab.training'), desc: t('welcome.tab.trainingDesc') },
    { icon: Users, label: t('welcome.tab.community'), desc: t('welcome.tab.communityDesc') },
    { icon: Settings, label: t('welcome.tab.settings'), desc: t('welcome.tab.settingsDesc') },
  ];

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setStep(0); }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else { onClose(); setStep(0); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <button
            onClick={() => { if (onRequestExit) onRequestExit(); else { onClose(); setStep(0); } }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          {step === 0 ? (
            <>
              <div className="flex justify-center text-primary">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-display font-bold text-xl text-foreground">
                  {t('welcome.title')}{username ? `, ${username}` : ''}!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('welcome.subtitle')}
                </p>
              </div>
            </>
          ) : step === 1 ? (
            <>
              <div className="text-center space-y-1">
                <h3 className="font-display font-bold text-lg text-foreground">{t('welcome.exploreTabs')}</h3>
                <p className="text-xs text-muted-foreground">{t('welcome.exploreTabsDesc')}</p>
              </div>
              <div className="space-y-2">
                {tabs.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center text-primary">
                <RefreshCw className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-display font-bold text-lg text-foreground">{t('welcome.stravaTip')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('welcome.stravaDesc')}
                </p>
              </div>
              <div className="flex justify-center pt-1">
                <button
                  onClick={() => {
                    onClose();
                    setStep(0);
                    onNavigateToStrava?.();
                  }}
                  className="transition-transform hover:scale-105 active:scale-95"
                >
                  <img src={connectWithStravaImg} alt="Connect with Strava" className="h-10 object-contain" />
                </button>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <Button size="sm" onClick={next} className="gap-1">
              {step < TOTAL_STEPS - 1 ? <>{t('tutorial.next')} <ChevronRight className="w-3.5 h-3.5" /></> : t('tutorial.letsBegin')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
