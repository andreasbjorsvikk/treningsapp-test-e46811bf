import { useEffect, useState } from 'react';
import { Check, Mountain } from 'lucide-react';

interface CheckinSuccessAnimationProps {
  show: boolean;
  onDone: () => void;
  peakName: string;
}

const CheckinSuccessAnimation = ({ show, onDone, peakName }: CheckinSuccessAnimationProps) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'hidden'>('hidden');

  useEffect(() => {
    if (show) {
      setPhase('enter');
      const t1 = setTimeout(() => setPhase('visible'), 50);
      const t2 = setTimeout(() => setPhase('exit'), 2200);
      const t3 = setTimeout(() => { setPhase('hidden'); onDone(); }, 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [show, onDone]);

  if (phase === 'hidden') return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
      phase === 'enter' ? 'opacity-0' : phase === 'exit' ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className={`relative flex flex-col items-center gap-4 transition-all duration-500 ${
        phase === 'enter' ? 'scale-50 opacity-0' : phase === 'exit' ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Success circle */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
            <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </div>
          {/* Ring animation */}
          <div className={`absolute inset-0 rounded-full border-4 border-success/40 transition-all duration-700 ${
            phase === 'visible' ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`} />
          <div className={`absolute inset-0 rounded-full border-2 border-success/20 transition-all duration-1000 delay-200 ${
            phase === 'visible' ? 'scale-[2] opacity-0' : 'scale-100 opacity-100'
          }`} />
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-bold text-foreground">Sjekket inn!</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 justify-center">
            <Mountain className="w-4 h-4" />
            {peakName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckinSuccessAnimation;
