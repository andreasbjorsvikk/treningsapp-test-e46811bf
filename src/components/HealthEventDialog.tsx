import { useState, useEffect } from 'react';
import { HealthEvent, HealthEventType } from '@/types/workout';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ambulance, Cross } from 'lucide-react';

interface HealthEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<HealthEvent, 'id'>) => void;
  event?: HealthEvent;
}

const HealthEventDialog = ({ open, onClose, onSave, event }: HealthEventDialogProps) => {
  const { t } = useTranslation();
  const [type, setType] = useState<HealthEventType>(event?.type || 'sickness');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setType(event?.type || 'sickness');
      setDateFrom(event?.dateFrom?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setDateTo(event?.dateTo?.slice(0, 10) || '');
      setNotes(event?.notes || '');
    }
  }, [open, event]);

  const handleSave = () => {
    onSave({
      type,
      dateFrom: new Date(dateFrom + 'T12:00:00').toISOString(),
      dateTo: dateTo ? new Date(dateTo + 'T12:00:00').toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">
            {event ? t('health.editEvent') : t('health.newEvent')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label>{t('health.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as HealthEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sickness">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-900/40">
                      <Ambulance className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </span>
                    {t('health.sickness')}
                  </span>
                </SelectItem>
                <SelectItem value="injury">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-900/40">
                      <Cross className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </span>
                    {t('health.injury')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('health.dateFrom')}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label>{t('health.dateTo')}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('health.notes')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('health.notesPlaceholder')} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('health.cancel')}</Button>
          <Button onClick={handleSave}>{event ? t('health.save') : t('health.add')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HealthEventDialog;
