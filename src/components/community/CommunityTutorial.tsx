import { useState, useEffect } from 'react';
import { X, ChevronRight, Trophy, Users, BarChart3, Home, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_KEY = 'treningslogg_community_tutorial_done';

interface TutorialStep {
  title: string;
  text: string;
  icon: React.ReactNode;
  customContent?: React.ReactNode;
}

const ChallengeExamples = () => (
  <div className="space-y-2 py-1">
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/60 border border-border/40">
      <span className="text-lg">🏃</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">Flest km i mars</p>
        <p className="text-[10px] text-muted-foreground">Løping · 1. – 31. mars</p>
      </div>
      <div className="text-xs font-bold text-primary">42 km</div>
    </div>
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/60 border border-border/40">
      <span className="text-lg">💪</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">Styrke-duellen 2026</p>
        <p className="text-xs text-muted-foreground">Styrke · Hele året</p>
      </div>
      <div className="text-xs font-bold text-primary">100 økter</div>
    </div>
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/60 border border-border/40">
      <span className="text-lg">⛰️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">Høydemeter-kamp</p>
        <p className="text-xs text-muted-foreground">Fjelltur · Jun – Aug</p>
      </div>
      <div className="text-xs font-bold text-primary">5000 m</div>
    </div>
  </div>
);

const HomePinDemo = () => (
  <div className="flex items-center justify-center gap-2 py-2">
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
      <Home className="w-3.5 h-3.5" />
      <span>Vis på forsiden</span>
    </div>
  </div>
);

const steps: TutorialStep[] = [
  {
    title: 'Velkommen til Fellesskap! 🤝',
    text: 'Her kan du utfordre venner på ulike måter – velg aktivitetstype, metrikk og tidsperiode fritt. Stillingen oppdateres fortløpende!',
    icon: <Swords className="w-8 h-8" />,
    customContent: <ChallengeExamples />,
  },
  {
    title: 'Utfordringer på forsiden',
    text: 'Utfordringer du vil følge med på kan festes til forsiden, slik at du alltid ser stillingen uten å gå inn hit.',
    icon: <Trophy className="w-8 h-8" />,
    customContent: <HomePinDemo />,
  },
  {
    title: 'Ledertavle & Venner',
    text: 'Under «Ledertavle» kan du sammenligne deg med vennene dine på økter, distanse, tid og høydemeter – per uke, måned eller år. Under «Venner» kan du søke etter og legge til venner, se deres profil og invitere dem til utfordringer.',
    icon: <Users className="w-8 h-8" />,
  },
];

const CommunityTutorial = () => {
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

          <div className="flex justify-center text-primary">
            {current.icon}
          </div>

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

export default CommunityTutorial;
