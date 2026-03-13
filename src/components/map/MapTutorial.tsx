import { useState, useEffect } from 'react';
import { X, ChevronRight, Mountain, Map, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_KEY = 'treningslogg_map_tutorial_done';

interface TutorialStep {
  title: string;
  text: string;
  icon: React.ReactNode;
  customContent?: React.ReactNode;
  arrowDirection?: 'up-left';
}

// Animated check-in demo component
const CheckinAnimation = () => {
  const [phase, setPhase] = useState<'idle' | 'pressing' | 'checked'>('idle');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('pressing'), 1200);
    const timer2 = setTimeout(() => setPhase('checked'), 2200);
    const timer3 = setTimeout(() => {
      setPhase('idle');
    }, 4500);

    const interval = setInterval(() => {
      setPhase('idle');
      setTimeout(() => setPhase('pressing'), 1200);
      setTimeout(() => setPhase('checked'), 2200);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex items-center gap-6">
        {/* Peak marker */}
        <div className="relative">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
              phase === 'checked'
                ? 'bg-[hsl(152,60%,42%)] border-[hsl(152,60%,35%)] scale-110'
                : phase === 'pressing'
                ? 'bg-[hsl(152,60%,42%)]/30 border-[hsl(152,60%,42%)]/50 scale-105'
                : 'bg-card border-border'
            }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-all duration-500 ${
                phase === 'checked' ? 'stroke-white' : 'stroke-muted-foreground'
              }`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 3 4 8 5-5 2 15H2L8 3z" />
            </svg>
            {/* Checkmark overlay */}
            {phase === 'checked' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[hsl(152,60%,42%)] border-2 border-card flex items-center justify-center animate-scale-in">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
            )}
          </div>
          {/* Ripple effect */}
          {phase === 'checked' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-[hsl(152,60%,42%)] animate-ping opacity-30" />
              <div className="absolute inset-[-4px] rounded-full border border-[hsl(152,60%,42%)] animate-ping opacity-20" style={{ animationDelay: '150ms' }} />
            </>
          )}
        </div>

        {/* Arrow */}
        <div className={`transition-opacity duration-300 ${phase === 'pressing' || phase === 'checked' ? 'opacity-100' : 'opacity-30'}`}>
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
            <path d="M0 6h24M20 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Result label */}
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-500 ${
            phase === 'checked'
              ? 'bg-[hsl(152,60%,42%)]/15 text-[hsl(152,60%,42%)] scale-105'
              : 'bg-muted text-muted-foreground scale-100'
          }`}
        >
          {phase === 'checked' ? '✓ Nådd!' : 'Sjekk inn'}
        </div>
      </div>
    </div>
  );
};

const steps: TutorialStep[] = [
  {
    title: 'Velkommen til fjelltopp-kartet! ⛰️',
    text: 'Her kan du sjekke inn på fjelltopper som du bestiger. Du kan sjekke inn flere ganger på hver topp og øke scoren din på lederlistene.',
    icon: <Mountain className="w-8 h-8" />,
    customContent: <CheckinAnimation />,
  },
  {
    title: 'Kartvisning',
    text: 'Skift mellom 2D/3D og ulike kartvisninger med knappene øverst til venstre.',
    icon: <Map className="w-8 h-8" />,
    arrowDirection: 'up-left',
  },
  {
    title: 'Foreslå ny topp',
    text: 'Tips: for å foreslå ny fjelltopp som ikke eksisterer her enda, trykk og hold inne på kartet på nøyaktig toppen sin posisjon. Om du står på toppen når du sender forespørsel, vil du bli sjekket inn når den blir godkjent.',
    icon: <MapPin className="w-8 h-8" />,
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]" onClick={dismiss} />

      {/* Large arrow pointing diagonally up-left to map controls for step 2 */}
      {current.arrowDirection === 'up-left' && (
        <div className="fixed z-[10000] pointer-events-none" style={{ top: '56px', left: '16px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="drop-shadow-xl">
            {/* Arrowhead pointing up-left */}
            <path d="M12 8 L8 40 L40 36" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Curved shaft from arrowhead towards center/bottom-right */}
            <path d="M10 38 C30 50, 50 70, 90 110" stroke="hsl(var(--primary))" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="8 4" />
          </svg>
        </div>
      )}

      {/* Tutorial card - always centered */}
      <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-[calc(100%-2rem)]">
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

          {/* Custom content (animation etc) */}
          {current.customContent}

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
