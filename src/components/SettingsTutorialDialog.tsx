import { useState, useEffect } from 'react';
import { X, ChevronRight, User, Lock, Baby, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

const TUTORIAL_KEY = 'treningslogg_settings_tutorial_done';

interface SettingsTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsTutorialDialog = ({ open, onClose }: SettingsTutorialDialogProps) => {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const steps = [
    { icon: <User className="w-8 h-8 text-primary" />, title: t('settingsTutorial.profile'), text: t('settingsTutorial.profileDesc') },
    { icon: <Lock className="w-8 h-8 text-primary" />, title: t('settingsTutorial.password'), text: t('settingsTutorial.passwordDesc') },
    { icon: <Baby className="w-8 h-8 text-primary" />, title: t('settingsTutorial.children'), text: t('settingsTutorial.childrenDesc') },
    { icon: <Share2 className="w-8 h-8 text-primary" />, title: t('settingsTutorial.share'), text: t('settingsTutorial.shareDesc') },
  ];

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
          <button onClick={dismiss} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground">
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
                <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">{t('tutorial.skip')}</Button>
              )}
              <Button size="sm" onClick={next} className="gap-1">
                {step < steps.length - 1 ? <>{t('tutorial.next')} <ChevronRight className="w-3.5 h-3.5" /></> : t('tutorial.understood')}
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
