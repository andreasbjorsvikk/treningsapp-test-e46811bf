import { useState } from 'react';
import { X, ChevronRight, BarChart3, Target, History, Trophy, Sparkles, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import GoalWheelsPreview from '@/components/tutorial/GoalWheelsPreview';
import GoalProgressVisual from '@/components/GoalProgressVisual';

interface TrainingTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

const GoalExamples = () => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground text-center">Eksempler:</p>
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="distance" activityType="løping" percent={65} current={26} target={40} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">40 km løping<br/>denne uken</p>
      </div>
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="sessions" activityType="styrke" percent={40} current={4} target={10} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">10 styrkeøkter<br/>denne mnd</p>
      </div>
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <div className="w-16 h-16">
          <GoalProgressVisual metric="elevation" activityType="fjelltur" percent={55} current={2750} target={5000} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center leading-tight font-medium">Flest høydemeter<br/>jun–aug</p>
      </div>
    </div>
  </div>
);

const steps = [
  {
    icon: BarChart3,
    title: 'Statistikk',
    description: 'Her får du oversikt over treningsstatistikken din. Se antall økter, distanse, tid og høydemeter – filtrert på måned, år eller totalt.',
  },
  {
    icon: Target,
    title: 'Mål',
    description: 'Sett deg et generelt treningsmål, eller lag mer spesifikke mål for ulike aktiviteter. Fremdriftshjulene viser deg hvordan du ligger an.',
    customContent: <GoalWheelsPreview />,
  },
  {
    icon: Sparkles,
    title: 'Andre mål',
    description: 'Du kan også sette mer spesifikke mål, med valgfri tidsperiode.',
    customContent: (
      <>
        <GoalExamples />
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span>Disse kan vises på forsiden ved å trykke på</span>
          <Home className="w-3.5 h-3.5 text-primary inline" />
        </div>
      </>
    ),
  },
  {
    icon: History,
    title: 'Historikk',
    description: 'Her finner du alle øktene dine, sortert etter måned og år. Du kan filtrere på aktivitetstype, eksportere og importere data.',
  },
  {
    icon: Trophy,
    title: 'Rekorder',
    description: 'Se dine personlige rekorder! Distanserekorder for løping og sykling oppdateres automatisk hvis du har synkronisert med Strava. For fjelltur kan du manuelt legge inn fjelltopper med dine rekordtider på.',
  },
];

const TrainingTutorialDialog = ({ open, onClose }: TrainingTutorialDialogProps) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else { onClose(); setStep(0); }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); setStep(0); }
  };

  const current = steps[step];
  const Icon = current.icon;

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

          <div className="flex justify-center text-primary">
            <Icon className="w-8 h-8" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-lg text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          </div>

          {current.customContent}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {step === 0 && (
                <Button variant="ghost" size="sm" onClick={() => { onClose(); setStep(0); }} className="text-muted-foreground">
                  Hopp over
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1">
                {step < steps.length - 1 ? <>Neste <ChevronRight className="w-3.5 h-3.5" /></> : 'Forstått!'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingTutorialDialog;
