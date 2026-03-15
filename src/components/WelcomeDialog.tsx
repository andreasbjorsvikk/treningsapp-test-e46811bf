import { useState } from 'react';
import { X, ChevronRight, Home, CalendarDays, Map, Dumbbell, Users, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  username?: string;
}

const tabs = [
  { icon: Home, label: 'Hjem', desc: 'Oversikt, mål og siste økter' },
  { icon: CalendarDays, label: 'Kalender', desc: 'Se og legg til økter dag for dag' },
  { icon: Map, label: 'Kart', desc: 'Sjekk inn på fjelltopper' },
  { icon: Dumbbell, label: 'Trening', desc: 'Statistikk, mål og historikk' },
  { icon: Users, label: 'Fellesskap', desc: 'Utfordringer og venner' },
  { icon: Settings, label: 'Innstillinger', desc: 'Tilpass appen etter dine ønsker' },
];

const WelcomeDialog = ({ open, onClose, username }: WelcomeDialogProps) => {
  const [step, setStep] = useState(0);

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setStep(0); }
  };

  const next = () => {
    if (step === 0) setStep(1);
    else { onClose(); setStep(0); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <button
            onClick={() => { onClose(); setStep(0); }}
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
                  Velkommen{username ? `, ${username}` : ''}!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  La oss ta en rask titt på hva du kan gjøre i appen.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <h3 className="font-display font-bold text-lg text-foreground">Utforsk fanene</h3>
                <p className="text-xs text-muted-foreground">Trykk på fanene for å utforske</p>
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
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {[0, 1].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <Button size="sm" onClick={next} className="gap-1">
              {step === 0 ? <>Neste <ChevronRight className="w-3.5 h-3.5" /></> : 'La oss begynne!'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
