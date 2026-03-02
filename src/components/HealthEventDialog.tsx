import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { HealthEvent, HealthEventType } from '@/types/workout';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ambulance, Cross, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<HealthEvent, 'id'>) => void;
  event?: HealthEvent;
}

const HealthEventDialog = ({ open, onClose, onSave, event }: HealthEventDialogProps) => {
  const { t } = useTranslation();
  const [type, setType] = useState<HealthEventType>(event?.type || 'sickness');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setType(event?.type || 'sickness');
      setDateFrom(event?.dateFrom ? new Date(event.dateFrom) : new Date());
      setDateTo(event?.dateTo ? new Date(event.dateTo) : undefined);
      setNotes(event?.notes || '');
    }
  }, [open, event]);

  const handleSave = () => {
    if (!dateFrom) return;
    onSave({
      type,
      dateFrom: new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 12).toISOString(),
      dateTo: dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 12).toISOString() : undefined,
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {dateFrom ? format(dateFrom, 'd. MMM yyyy', { locale: nb }) : <span>Velg dato</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>{t('health.dateTo')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {dateTo ? format(dateTo, 'd. MMM yyyy', { locale: nb }) : <span>Valgfritt</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
