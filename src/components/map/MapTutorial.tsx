import { useState, useEffect } from 'react';
import { X, ChevronRight, Mountain, Map, MapPin, List, Rss, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_KEY = 'treningslogg_map_tutorial_done';

interface TutorialStep {
  title: string;
  text: string;
  icon: React.ReactNode;
  customContent?: React.ReactNode;
}

// ── Step 1: Check-in animation with button press ──
const CheckinAnimation = () => {
  const [phase, setPhase] = useState<'idle' | 'pressing' | 'checked'>('idle');

  useEffect(() => {
    const run = () => {
      setPhase('idle');
      setTimeout(() => setPhase('pressing'), 1200);
      setTimeout(() => setPhase('checked'), 2200);
    };
    run();
    const interval = setInterval(run, 5000);
    return () => clearInterval(interval);
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
              width="24" height="24" viewBox="0 0 24 24" fill="none"
              className={`transition-all duration-500 ${phase === 'checked' ? 'stroke-white' : 'stroke-muted-foreground'}`}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m8 3 4 8 5-5 2 15H2L8 3z" />
            </svg>
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

        {/* Sjekk inn button with press animation */}
        <div className="relative">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              phase === 'checked'
                ? 'bg-[hsl(152,60%,42%)]/15 text-[hsl(152,60%,42%)] scale-105'
                : phase === 'pressing'
                ? 'bg-primary/20 text-primary scale-90 shadow-inner'
                : 'bg-muted text-muted-foreground scale-100'
            }`}
          >
            {phase === 'checked' ? '✓ Nådd!' : 'Sjekk inn'}
          </div>
          {/* Finger/tap indicator during pressing */}
          {phase === 'pressing' && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Step 2: Map style rotation demo ──
const MapStyleDemo = () => {
  const [styleIdx, setStyleIdx] = useState(0);
  const styles = [
    { name: 'Standard', bg: 'bg-[#e8e0d8]', elements: (
      <g>
        <path d="M5 35 L20 12 L35 30 L50 8 L65 25 L75 18" stroke="#7a8a5c" strokeWidth="2" fill="none" />
        <path d="M0 40 L80 40" stroke="#bbb" strokeWidth="0.5" />
        <circle cx="40" cy="25" r="2" fill="#d44" opacity="0.8" />
      </g>
    )},
    { name: 'Satellitt', bg: 'bg-[#2a3a2a]', elements: (
      <g>
        <rect x="0" y="0" width="80" height="50" fill="#3a4a35" />
        <path d="M5 35 L20 15 L35 28 L50 10 L65 22 L75 16" fill="#4a5a40" stroke="#5a6a50" strokeWidth="1" />
        <path d="M10 38 Q30 32 50 38 Q65 42 80 36" fill="#2a3a28" opacity="0.5" />
        <circle cx="40" cy="22" r="2" fill="#ff4444" />
      </g>
    )},
    { name: 'Topografisk', bg: 'bg-[#f5f0e8]', elements: (
      <g>
        <ellipse cx="40" cy="20" rx="25" ry="12" fill="none" stroke="#c4a882" strokeWidth="0.8" />
        <ellipse cx="40" cy="20" rx="18" ry="8" fill="none" stroke="#c4a882" strokeWidth="0.8" />
        <ellipse cx="40" cy="20" rx="10" ry="4" fill="none" stroke="#c4a882" strokeWidth="0.8" />
        <path d="M15 38 Q30 34 45 38 Q60 42 75 36" stroke="#6a9fd8" strokeWidth="1.5" fill="none" />
        <circle cx="40" cy="20" r="2" fill="#d44" opacity="0.8" />
      </g>
    )},
    { name: '3D', bg: 'bg-[#1a2540]', elements: (
      <g>
        <path d="M0 45 L15 30 L25 35 L40 15 L55 28 L65 20 L80 32 L80 50 L0 50 Z" fill="#3a5a3a" opacity="0.7" />
        <path d="M0 48 L20 38 L40 18 L60 30 L80 35 L80 50 L0 50 Z" fill="#2a4a2a" opacity="0.5" />
        <circle cx="40" cy="15" r="2" fill="#ff4444" />
        <text x="40" y="12" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">▲</text>
      </g>
    )},
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStyleIdx(i => (i + 1) % styles.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const current = styles[styleIdx];

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className={`w-56 h-32 rounded-xl ${current.bg} border border-border/60 overflow-hidden relative transition-colors duration-500 shadow-md`}>
        <svg width="100%" height="100%" viewBox="0 0 80 50" preserveAspectRatio="xMidYMid slice">
          {current.elements}
        </svg>
        {/* Style label */}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/40 text-white text-[9px] font-medium backdrop-blur-sm">
          {current.name}
        </div>
      </div>
      {/* Style dots */}
      <div className="flex gap-1.5">
        {styles.map((s, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === styleIdx ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  );
};

// ── Step 3: Long-press suggestion animation ──
const LongPressAnimation = () => {
  const [phase, setPhase] = useState<'idle' | 'pressing' | 'spawned'>('idle');

  useEffect(() => {
    const run = () => {
      setPhase('idle');
      setTimeout(() => setPhase('pressing'), 800);
      setTimeout(() => setPhase('spawned'), 2200);
    };
    run();
    const interval = setInterval(run, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-48 h-28 rounded-xl bg-[#e8e0d8] border border-border/60 relative overflow-hidden shadow-md">
        {/* Topo-like lines */}
        <svg width="100%" height="100%" viewBox="0 0 80 50" className="absolute inset-0">
          <ellipse cx="40" cy="22" rx="20" ry="10" fill="none" stroke="#c4a882" strokeWidth="0.6" opacity="0.5" />
          <ellipse cx="40" cy="22" rx="12" ry="6" fill="none" stroke="#c4a882" strokeWidth="0.6" opacity="0.5" />
        </svg>

        {/* Finger pressing */}
        {phase === 'pressing' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Ripple rings */}
            <div className="absolute inset-[-12px] rounded-full border-2 border-primary/30 animate-ping" />
            <div className="absolute inset-[-6px] rounded-full border border-primary/20 animate-ping" style={{ animationDelay: '200ms' }} />
            {/* Finger */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
              <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
              <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
            </svg>
          </div>
        )}

        {/* Spawned peak icon */}
        {phase === 'spawned' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 3 4 8 5-5 2 15H2L8 3z" />
              </svg>
            </div>
          </div>
        )}
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
    text: 'Bytt mellom ulike kartvisninger – standard, satellitt, topografisk og 3D – med knappene øverst til venstre.',
    icon: <Map className="w-8 h-8" />,
    customContent: <MapStyleDemo />,
  },
  {
    title: 'Foreslå ny topp',
    text: 'For å foreslå en ny fjelltopp som ikke finnes her enda, trykk og hold inne på kartet der toppen er. Om du står på toppen vil du bli sjekket inn når den blir godkjent.',
    icon: <MapPin className="w-8 h-8" />,
    customContent: <LongPressAnimation />,
  },
  {
    title: 'Toppliste',
    text: 'Bla gjennom alle tilgjengelige topper sortert etter høyde eller avstand fra deg. Trykk på en topp for å se detaljer og sjekke inn.',
    icon: <List className="w-8 h-8" />,
  },
  {
    title: 'Feed',
    text: 'I feeden kan du se de siste innsjekkingene fra deg selv og vennene dine, med bilder og kommentarer.',
    icon: <Rss className="w-8 h-8" />,
  },
  {
    title: 'Lederliste',
    text: 'Sammenlign deg med andre og se hvem som har flest innsjekkinger og unike topper. Klatre på listene og utfordre venner!',
    icon: <Trophy className="w-8 h-8" />,
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
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]" onClick={dismiss} />

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
