import { useState, useEffect } from 'react';
import TrainingTutorialDialog from '@/components/TrainingTutorialDialog';
import CalendarTutorialDialog from '@/components/CalendarTutorialDialog';

// Community, Map and Settings tutorials are self-rendering, triggered via events

type TutorialPhase = 'training' | 'calendar' | 'community' | 'map' | 'settings' | 'done';

const PHASE_ORDER: TutorialPhase[] = ['training', 'calendar', 'community', 'map', 'settings'];

interface FullTutorialFlowProps {
  open: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

const FullTutorialFlow = ({ open, onClose, onNavigateTab }: FullTutorialFlowProps) => {
  const [phase, setPhase] = useState<TutorialPhase>('training');

  useEffect(() => {
    if (open) setPhase('training');
  }, [open]);

  if (!open) return null;

  const advanceToNext = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      const next = PHASE_ORDER[idx + 1];
      setPhase(next);
      switch (next) {
        case 'training': onNavigateTab('trening'); break;
        case 'calendar': onNavigateTab('kalender'); break;
        case 'community':
          onNavigateTab('fellesskap');
          localStorage.removeItem('treningslogg_community_tutorial_done');
          setTimeout(() => window.dispatchEvent(new CustomEvent('show-community-tutorial')), 300);
          {
            const handler = () => {
              window.removeEventListener('community-tutorial-dismissed', handler);
              advanceFromCommunity();
            };
            window.addEventListener('community-tutorial-dismissed', handler);
          }
          break;
        case 'map':
          onNavigateTab('kart');
          localStorage.removeItem('treningslogg_map_tutorial_done');
          setTimeout(() => window.dispatchEvent(new CustomEvent('show-map-tutorial')), 300);
          {
            const mapHandler = () => {
              window.removeEventListener('map-tutorial-dismissed', mapHandler);
              advanceFromMap();
            };
            window.addEventListener('map-tutorial-dismissed', mapHandler);
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
    } else {
      finish();
    }
  };

  const advanceFromCommunity = () => {
    const idx = PHASE_ORDER.indexOf('community');
    const next = PHASE_ORDER[idx + 1];
    setPhase(next);
    if (next === 'map') {
      onNavigateTab('kart');
      localStorage.removeItem('treningslogg_map_tutorial_done');
      setTimeout(() => window.dispatchEvent(new CustomEvent('show-map-tutorial')), 300);
      const mapHandler = () => {
        window.removeEventListener('map-tutorial-dismissed', mapHandler);
        advanceFromMap();
      };
      window.addEventListener('map-tutorial-dismissed', mapHandler);
    }
  };

  const advanceFromMap = () => {
    const idx = PHASE_ORDER.indexOf('map');
    const next = PHASE_ORDER[idx + 1];
    if (next === 'settings') {
      setPhase('settings');
      onNavigateTab('settings');
      localStorage.removeItem('treningslogg_settings_tutorial_done');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to-profile'));
        setTimeout(() => window.dispatchEvent(new CustomEvent('show-settings-tutorial')), 300);
      }, 200);
      const settingsHandler = () => {
        window.removeEventListener('settings-tutorial-dismissed', settingsHandler);
        finish();
      };
      window.addEventListener('settings-tutorial-dismissed', settingsHandler);
    } else {
      finish();
    }
  };

  const finish = () => {
    setPhase('done');
    onClose();
  };

  return (
    <>
      {phase === 'training' && (
        <TrainingTutorialDialog open={true} onClose={advanceToNext} />
      )}
      {phase === 'calendar' && (
        <CalendarTutorialDialog open={true} onClose={advanceToNext} />
      )}
      {/* Community, Map and Settings tutorials are self-rendering, triggered via events */}
    </>
  );
};

export default FullTutorialFlow;
