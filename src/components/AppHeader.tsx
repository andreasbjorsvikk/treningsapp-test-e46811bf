import { Activity } from 'lucide-react';

interface AppHeaderProps {
  className?: string;
}

const AppHeader = ({ className }: AppHeaderProps) => {
  return (
    <header className={`glass-card sticky top-0 z-10 border-b border-border/50 ${className || ''}`}>
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2.5">
          <div className="gradient-energy rounded-lg p-1.5">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-lg">
            Trenings<span className="text-gradient-energy">appen</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Din personlige treningsdagbok
        </p>
      </div>
    </header>
  );
};

export default AppHeader;
