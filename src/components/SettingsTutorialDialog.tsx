import { useState, useEffect } from 'react';
import { X, ChevronRight, User, Lock, Baby, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_KEY = 'treningslogg_settings_tutorial_done';

interface SettingsTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: <User className="w-8 h-8 text-primary" />,
    title: 'Profilen din',
    text: 'Her kan du endre navn og profilbilde. Trykk på profilbildet for å laste opp et nytt bilde.',
  },
  {
    icon: <Lock className="w-8 h-8 text-primary" />,
    title: 'Endre passord',
    text: 'Du kan endre passordet ditt under «Konto»-seksjonen i innstillingene.',
  },
  {
    icon: <Baby className="w-8 h-8 text-primary" />,
    title: 'Legg til barn',
    text: 'Under «Barn» kan du legge til barneprofiler. Når du sjekker inn på en fjelltopp, kan du ta med barna dine slik at de også får registrert toppen.',
  },
  {
    icon: <Share2 className="w-8 h-8 text-primary" />,
    title: 'Del tilgang',
    text: 'Du kan dele tilgang til barnet ditt med andre brukere (f.eks. partner), slik at de også kan sjekke inn barnet på fjelltopper.',
  },
];

const SettingsTutorialDialog = ({ open, onClose }: SettingsTutorialDialogProps) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const dismiss = () => {
    onClose();
    localStorage.setItem(TUTORIAL_KEY, 'true');
    window.dispatchEvent(new CustomEvent('settings-tutorial-dismissed'));
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  if (!open) return null;

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

          <div className="flex justify-center">{current.icon}</div>

          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-lg text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.text}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
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

export { TUTORIAL_KEY as SETTINGS_TUTORIAL_KEY };
export default SettingsTutorialDialog;
