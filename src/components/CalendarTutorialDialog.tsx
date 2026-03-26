import { useState } from 'react';
import { X, CalendarDays, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CalendarTutorialDialogProps {
  open: boolean;
  onClose: () => void;
  onRequestExit?: () => void;
}

const CalendarTutorialDialog = ({ open, onClose, onRequestExit }: CalendarTutorialDialogProps) => {
  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <button
            onClick={() => { if (onRequestExit) onRequestExit(); else onClose(); }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center text-primary">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-lg text-foreground">Kalender</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Trykk på en dato for å se detaljer, legge til en økt manuelt, eller registrere en helsehendelse.
            </p>
          </div>

          <div className="space-y-2.5 px-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Legg til ny økt eller helsehendelse</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Trykk på en økt for å se detaljer eller redigere</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onClose}>
              Forstått!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarTutorialDialog;
