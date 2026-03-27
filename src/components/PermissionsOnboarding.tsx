/**
 * Permissions onboarding for native platforms.
 * Shows explanation screens before requesting each permission.
 * Never blocking — always skippable. Can be re-opened from Settings.
 *
 * Only renders on native platforms (Capacitor).
 */
import { useState } from 'react';
import { isNativePlatform } from '@/utils/capacitor';
import { MapPin, Bell, Camera, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PermissionStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onRequest: () => Promise<void>;
}

const ONBOARDING_KEY = 'treningsapp_permissions_onboarded';

interface PermissionsOnboardingProps {
  open: boolean;
  onClose: () => void;
}

const PermissionsOnboarding = ({ open, onClose }: PermissionsOnboardingProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  // Only show on native platforms
  if (!isNativePlatform()) return null;

  const steps: PermissionStep[] = [
    {
      id: 'location',
      icon: <MapPin className="w-10 h-10 text-primary" />,
      title: 'Posisjonstilgang',
      description:
        'Vi trenger tilgang til posisjonen din for å registrere toppbestigninger og vise deg på kartet.',
      onRequest: async () => {
        // TODO: Capacitor Geolocation.requestPermissions()
        console.debug('[permissions] Location requested (scaffold)');
      },
    },
    {
      id: 'notifications',
      icon: <Bell className="w-10 h-10 text-primary" />,
      title: 'Varsler',
      description:
        'Få beskjed når venner fullfører utfordringer, sender venneforespørsler, eller når du når mål.',
      onRequest: async () => {
        // TODO: pushService.requestPermission()
        console.debug('[permissions] Push requested (scaffold)');
      },
    },
    {
      id: 'camera',
      icon: <Camera className="w-10 h-10 text-primary" />,
      title: 'Kameratilgang',
      description:
        'Ta bilder på toppen for å dokumentere toppbestigningene dine.',
      onRequest: async () => {
        // TODO: cameraService.checkPermission()
        console.debug('[permissions] Camera requested (scaffold)');
      },
    },
    {
      id: 'health',
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: 'Apple Health',
      description:
        'Koble til Apple Health for å synkronisere treningsøkter, skritt og kalorier automatisk.',
      onRequest: async () => {
        // TODO: HealthKit permission
        console.debug('[permissions] Health requested (scaffold)');
      },
    },
  ];

  const currentStep = steps[stepIndex];
  if (!currentStep) {
    // All steps done
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
    return null;
  }

  const handleAllow = async () => {
    await currentStep.onRequest();
    setStepIndex((i) => i + 1);
  };

  const handleSkip = () => {
    setStepIndex((i) => i + 1);
  };

  const handleSkipAll = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="mb-2">{currentStep.icon}</div>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription className="text-sm">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleAllow} className="w-full">
            Tillat
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Ikke nå
          </Button>
          <button
            onClick={handleSkipAll}
            className="text-xs text-muted-foreground hover:underline mx-auto"
          >
            Hopp over alle
          </button>
        </DialogFooter>
        <p className="text-[10px] text-muted-foreground text-center">
          Steg {stepIndex + 1} av {steps.length} · Du kan endre dette i Innstillinger
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsOnboarding;

export function shouldShowOnboarding(): boolean {
  return isNativePlatform() && localStorage.getItem(ONBOARDING_KEY) !== 'true';
}
