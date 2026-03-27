import { useState, useEffect } from 'react';
import WelcomeDialog from '@/components/WelcomeDialog';
import CalendarTutorialDialog from '@/components/CalendarTutorialDialog';
import TrainingTutorialDialog from '@/components/TrainingTutorialDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

type TutorialPhase = 'welcome' | 'calendar' | 'map' | 'training' | 'community' | 'settings' | 'done';

const PHASE_ORDER: TutorialPhase[] = ['welcome', 'calendar', 'map', 'training', 'community', 'settings'];

interface FullTutorialFlowProps {
  open: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

const FullTutorialFlow = ({ open, onClose, onNavigateTab }: FullTutorialFlowProps) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<TutorialPhase>('welcome');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (open) setPhase('welcome');
  }, [open]);

  if (!open) return null;

  const handleRequestClose = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    setPhase('done');
    onClose();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  const goToPhase = (next: TutorialPhase) => {
    setPhase(next);
    switch (next) {
      case 'welcome':
        onNavigateTab('hjem');
        break;
      case 'calendar':
        onNavigateTab('kalender');
        break;
      case 'map':
        onNavigateTab('kart');
        localStorage.removeItem('treningslogg_map_tutorial_done');
        setTimeout(() => window.dispatchEvent(new CustomEvent('show-map-tutorial')), 300);
        {
          const mapHandler = () => {
            window.removeEventListener('map-tutorial-dismissed', mapHandler);
            advanceFrom('map');
          };
          window.addEventListener('map-tutorial-dismissed', mapHandler);
        }
        break;
      case 'training':
        onNavigateTab('trening');
        break;
      case 'community':
        onNavigateTab('fellesskap');
        localStorage.removeItem('treningslogg_community_tutorial_done');
        setTimeout(() => window.dispatchEvent(new CustomEvent('show-community-tutorial')), 300);
        {
          const handler = () => {
            window.removeEventListener('community-tutorial-dismissed', handler);
            advanceFrom('community');
          };
          window.addEventListener('community-tutorial-dismissed', handler);
        }
        break;
      case 'settings':
        onNavigateTab('settings');
        localStorage.removeItem('treningslogg_settings_tutorial_done');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate-to-profile'));
          setTimeout(() => window.dispatchEvent(new CustomEvent('show-settings-tutorial')), 300);
        }, 200);
        {
          const settingsHandler = () => {
            window.removeEventListener('settings-tutorial-dismissed', settingsHandler);
            finish();
          };
          window.addEventListener('settings-tutorial-dismissed', settingsHandler);
        }
        break;
    }
  };

  const advanceFrom = (current: TutorialPhase) => {
    const idx = PHASE_ORDER.indexOf(current);
    if (idx < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[idx + 1]);
    } else {
      finish();
    }
  };

  const advanceToNext = () => {
    advanceFrom(phase);
  };

  const finish = () => {
    setPhase('done');
    onClose();
  };

  return (
    <>
      {phase === 'welcome' && (
        <WelcomeDialog
          open={true}
          onClose={advanceToNext}
          onRequestExit={handleRequestClose}
        />
      )}
      {phase === 'calendar' && (
        <CalendarTutorialDialog open={true} onClose={advanceToNext} onRequestExit={handleRequestClose} />
      )}
      {phase === 'training' && (
        <TrainingTutorialDialog open={true} onClose={advanceToNext} onRequestExit={handleRequestClose} />
      )}

      <Dialog open={showExitConfirm} onOpenChange={(v) => { if (!v) cancelExit(); }}>
        <DialogContent className="max-w-xs p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <h3 className="font-display font-bold text-lg text-foreground">
              {t('language') === 'en' ? 'Exit tutorial?' : 'Vil du avslutte tutorial?'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('language') === 'en' ? 'You can restart it from the help section in settings.' : 'Du kan starte den igjen fra hjelp-seksjonen i innstillinger.'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" size="sm" onClick={cancelExit}>
                {t('language') === 'en' ? 'Continue' : 'Fortsett'}
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmExit}>
                {t('language') === 'en' ? 'Exit' : 'Avslutt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FullTutorialFlow;
