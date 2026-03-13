import { useState, useEffect } from 'react';
import { X, ChevronRight, Trophy, Users, Home, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ActivityIcon from '@/components/ActivityIcon';

const TUTORIAL_KEY = 'treningslogg_community_tutorial_done';

interface TutorialStep {
  title: string;
  text: string;
  icon: React.ReactNode;
  customContent?: React.ReactNode;
}

const ChallengeExamples = () => {
  const isDark = document.documentElement.classList.contains('dark');
  
  const getColors = (type: string) => {
    const colorMap: Record<string, { lightBg: string; lightText: string; darkBg: string }> = {
      løping: { lightBg: 'rgb(210,229,255)', lightText: 'rgb(42,93,168)', darkBg: 'rgb(77,120,179)' },
      styrke: { lightBg: 'rgb(212,212,216)', lightText: '#000000', darkBg: 'rgb(98,100,104)' },
      fjelltur: { lightBg: 'rgb(212,242,184)', lightText: 'rgb(47,107,69)', darkBg: 'rgb(105,162,85)' },
    };
    return colorMap[type] || colorMap.løping;
  };

  const renderExample = (type: 'løping' | 'styrke' | 'fjelltur', title: string, subtitle: string) => {
    const colors = getColors(type);
    return (
      <div className="flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border/40">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: isDark ? colors.darkBg : colors.lightBg }}
        >
          <ActivityIcon
            type={type}
            className="w-5 h-5"
            colorOverride={isDark ? '#ffffff' : colors.lightText}
          />
        </div>
        <div className="min-w-0 text-center">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 py-1">
      <p className="text-xs font-semibold text-muted-foreground text-center">Eksempler:</p>
      {renderExample('løping', 'Flest km løpt i mars', 'Løping · 1. – 31. mars')}
      {renderExample('styrke', 'Flest styrkeøkter i 2026', 'Styrke · Hele året')}
      {renderExample('fjelltur', 'Flest høydemeter i sommer', 'Fjelltur · Jun – Aug')}
    </div>
  );
};

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
    title: 'Fellesskap',
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
