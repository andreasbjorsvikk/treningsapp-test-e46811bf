import { useState, useEffect } from 'react';
import { X, ChevronRight, Mountain, Map, MapPin, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { peakIconTiers } from '@/utils/peakIcons';

const TUTORIAL_KEY = 'treningslogg_map_tutorial_done';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

// Correct Hovlandsnuten (Tysnes) coordinates from DB
const HOVLANDSNUTEN = { lat: 60.0149, lng: 5.6774, elev: 726 };

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
      <div className="flex items-center gap-2">
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
            <div className={`w-9 h-9 rounded-full flex items-end justify-center [clip-path:inset(0_0_25%_0)] overflow-hidden ${phase === 'checked' ? 'bg-white/20 border border-white/40' : ''}`}>
              <img src={peakIconTiers.high} alt="" className="w-8 h-8 object-contain object-bottom" />
            </div>
          </div>
          {/* Ripple effect */}
          {phase === 'checked' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-[hsl(152,60%,42%)] animate-ping opacity-30" />
              <div className="absolute inset-[-4px] rounded-full border border-[hsl(152,60%,42%)] animate-ping opacity-20" style={{ animationDelay: '150ms' }} />
            </>
          )}
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

// ── Step 2: Static map preview rotating between satellite and terrain ──
const MapStylePreview = () => {
  const [styleIdx, setStyleIdx] = useState(0);
  const mapStyles = [
    { name: 'Satellitt', style: 'satellite-streets-v12' },
    { name: 'Terreng', style: 'outdoors-v12' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStyleIdx(i => (i + 1) % mapStyles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const current = mapStyles[styleIdx];
  const zoom = 13;
  const pitch = 50;
  const bearing = 45;
  const width = 400;
  const height = 220;
  
  const markerUrl = `https://api.mapbox.com/styles/v1/mapbox/${current.style}/static/pin-s-mountain+ff4444(${HOVLANDSNUTEN.lng},${HOVLANDSNUTEN.lat})/${HOVLANDSNUTEN.lng},${HOVLANDSNUTEN.lat},${zoom},${bearing},${pitch}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="w-64 h-36 rounded-xl border border-border/60 overflow-hidden relative shadow-md">
        <img
          src={markerUrl}
          alt={`Hovlandsnuten - ${current.name}`}
          className="w-full h-full object-cover"
          key={`map-style-${styleIdx}`}
        />
        {/* Style label */}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-medium backdrop-blur-sm">
          {current.name}
        </div>
      </div>
      {/* Style dots */}
      <div className="flex gap-1.5">
        {mapStyles.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === styleIdx ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  );
};

// ── Step 3: Long-press suggestion animation with terrain map ──
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

  const zoom = 13.5;
  const width = 380;
  const height = 200;
  const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${HOVLANDSNUTEN.lng},${HOVLANDSNUTEN.lat},${zoom},0,40/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;

  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-56 h-32 rounded-xl border border-border/60 relative overflow-hidden shadow-md">
        <img src={staticUrl} alt="Terrengkart" className="w-full h-full object-cover" />

        {/* Finger pressing with ripple */}
        {phase === 'pressing' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-[-12px] rounded-full border-2 border-primary/30 animate-ping" />
            <div className="absolute inset-[-6px] rounded-full border border-primary/20 animate-ping" style={{ animationDelay: '200ms' }} />
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
            <div className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-end justify-center [clip-path:inset(0_0_25%_0)] overflow-hidden shadow-lg">
              <img src={peakIconTiers.medium} alt="" className="w-9 h-9 object-contain object-bottom" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Step 4 content: Topper, Feed & Lederliste combined ──
const OverviewContent = () => (
  <div className="space-y-2 py-1">
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border/40">
      <Mountain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-foreground">Topper</p>
        <p className="text-[11px] text-muted-foreground">Bla gjennom alle topper sortert etter høyde eller avstand fra deg.</p>
      </div>
    </div>
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border/40">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-foreground">Feed</p>
        <p className="text-[11px] text-muted-foreground">Se de siste innsjekkingene fra deg selv og vennene dine, med bilder.</p>
      </div>
    </div>
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border/40">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-foreground">Lederliste</p>
        <p className="text-[11px] text-muted-foreground">Se hvem som har flest innsjekkinger og unike topper.</p>
      </div>
    </div>
  </div>
);

const PeakIcon = ({ src }: { src: string }) => (
  <img src={src} alt="" className="w-10 h-10 object-contain" />
);

const steps: TutorialStep[] = [
  {
    title: 'Velkommen til fjelltopp-kartet! ⛰️',
    text: 'Her kan du sjekke inn på fjelltopper som du bestiger. Du kan sjekke inn flere ganger på hver topp og øke scoren din på lederlistene.',
    icon: <PeakIcon src={peakIconTiers.veryHigh} />,
    customContent: <CheckinAnimation />,
  },
  {
    title: 'Kartvisning',
    text: 'Bytt mellom satellitt- og terrengvisning. Du kan også veksle mellom 2D og 3D-visning.',
    icon: <PeakIcon src={peakIconTiers.high} />,
    customContent: <MapStylePreview />,
  },
  {
    title: 'Foreslå ny topp',
    text: 'For å foreslå en ny fjelltopp som ikke finnes her enda, trykk og hold inne på kartet der toppen er. Om du står på toppen vil du bli sjekket inn når den blir godkjent.',
    icon: <PeakIcon src={peakIconTiers.medium} />,
    customContent: <LongPressAnimation />,
  },
  {
    title: 'Utforsk de andre fanene',
    text: '',
    icon: <PeakIcon src={peakIconTiers.low} />,
    customContent: <OverviewContent />,
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

      <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-[calc(100%-2rem)]">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          {current.icon && (
            <div className="flex justify-center text-primary">
              {current.icon}
            </div>
          )}

          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-lg text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.text}</p>
          </div>

          {current.customContent}

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
