import { useState, useEffect } from 'react';
import { X, ChevronRight, Mountain, Map, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_KEY = 'treningslogg_map_tutorial_done';

interface TutorialStep {
  title: string;
  text: string;
  icon: React.ReactNode;
  position?: 'center' | 'top-left';
}

const steps: TutorialStep[] = [
  {
    title: 'Velkommen til fjelltopp-kartet! ⛰️',
    text: 'Her kan du sjekke inn på fjelltopper som du bestiger. Du kan sjekke inn flere ganger på hver topp og øke scoren din på lederlistene.',
    icon: <Mountain className="w-8 h-8" />,
    position: 'center',
  },
  {
    title: 'Kartvisning',
    text: 'Skift mellom 2D/3D og ulike kartvisninger med knappene øverst til venstre.',
    icon: <Map className="w-8 h-8" />,
    position: 'top-left',
  },
  {
    title: 'Foreslå ny topp',
    text: 'Tips: for å foreslå ny fjelltopp som ikke eksisterer her enda, trykk og hold inne på kartet på nøyaktig toppen sin posisjon. Om du står på toppen når du sender forespørsel, vil du bli sjekket inn når den blir godkjent.',
    icon: <MapPin className="w-8 h-8" />,
    position: 'center',
  },
];

const MapTutorial = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  if (!visible) return null;

  const current = steps[step];
  const isTopLeft = current.position === 'top-left';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]" onClick={dismiss} />
      
      {/* Arrow pointing to top-left controls */}
      {isTopLeft && (
        <div className="fixed top-14 left-20 z-[9999]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-card drop-shadow-lg">
            <path d="M20 40 L5 0 L35 0 Z" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* Tutorial card */}
      <div
        className={`fixed z-[9999] ${
          isTopLeft
            ? 'top-[54px] left-4 right-4 max-w-sm'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-[calc(100%-2rem)]'
        }`}
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="flex justify-center text-primary">
            {current.icon}
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-lg text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.text}</p>
          </div>

          {/* Progress dots + buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {step < steps.length - 1 && (
                <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
                  Hopp over
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1">
                {step < steps.length - 1 ? (
                  <>Neste <ChevronRight className="w-3.5 h-3.5" /></>
                ) : (
                  'Forstått!'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapTutorial;
