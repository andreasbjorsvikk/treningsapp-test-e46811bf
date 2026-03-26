import { useState } from 'react';
import { BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ReportPromptProps {
  open: boolean;
  type: 'week' | 'month';
  onView: () => void;
  onLater: () => void;
  onDismiss: () => void;
}

const ReportPrompt = ({ open, type, onView, onLater, onDismiss }: ReportPromptProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="max-w-xs p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-foreground">
              {type === 'week' ? 'Din ukesrapport er klar' : 'Din månedsrapport er klar'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Se en oppsummering av {type === 'week' ? 'uken' : 'måneden'} din.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onView} className="w-full">Se rapport</Button>
            <Button variant="outline" onClick={onLater} className="w-full">Se senere</Button>
            <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              Nei takk
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPrompt;
