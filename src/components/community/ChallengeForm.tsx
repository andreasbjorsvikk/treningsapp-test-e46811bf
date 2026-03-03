import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { getFriends, createChallenge, Friend } from '@/services/communityService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ChallengeFormProps {
  open: boolean;
  onClose: () => void;
  preselectedUser?: Friend | null;
  onCreated?: () => void;
}

type ChallengeMetric = 'sessions' | 'distance' | 'duration' | 'elevation';

const periodOptions = [
  { value: 'week', label: 'Denne uken' },
  { value: 'month', label: 'Denne måneden' },
  { value: 'year', label: 'Dette året' },
];

const metricOptions: { value: ChallengeMetric; label: string }[] = [
  { value: 'sessions', label: 'Antall økter' },
  { value: 'distance', label: 'Distanse (km)' },
  { value: 'duration', label: 'Varighet (min)' },
  { value: 'elevation', label: 'Høydemeter (m)' },
];

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  // year
  return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
}

const ChallengeForm = ({ open, onClose, preselectedUser, onCreated }: ChallengeFormProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('sessions');
  const [activityType, setActivityType] = useState('all');
  const [period, setPeriod] = useState('month');
  const [target, setTarget] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getFriends().then(f => { setFriends(f); setLoading(false); });
      if (preselectedUser) setSelectedUsers([preselectedUser.id]);
    }
  }, [open, preselectedUser]);

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Fyll ut navn'); return; }
    setSubmitting(true);
    try {
      const dates = getPeriodDates(period);
      await createChallenge({
        name,
        emoji: emoji || undefined,
        metric,
        activityType,
        target: parseFloat(target) || 0,
        periodStart: dates.start,
        periodEnd: dates.end,
        invitedUserIds: selectedUsers,
      });
      toast.success('Utfordring opprettet!');
      onCreated?.();
      onClose();
      setName(''); setEmoji(''); setTarget(''); setSelectedUsers([]);
    } catch {
      toast.error('Kunne ikke opprette utfordring');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny utfordring</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Navn</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="F.eks. Mars-mila" />
            </div>
            <div className="w-16">
              <Label className="text-xs">Emoji</Label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🏔️" className="text-center" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Metrikk</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as ChallengeMetric)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {metricOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Aktivitetstype</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {allSessionTypes.map(t => (
                  <SelectItem key={t} value={t}>{sessionTypeConfig[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Periode</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">Mål (valgfritt)</Label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="—" />
            </div>
          </div>
          {!target && <p className="text-xs text-muted-foreground">Uten mål: den med mest vinner</p>}

          {/* Participant selection */}
          <div>
            <Label className="text-xs mb-2 block">Deltakere</Label>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Legg til venner først for å invitere dem</p>
            ) : (
              <div className="space-y-1">
                {friends.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                      selectedUsers.includes(u.id) ? 'bg-accent/10 text-accent' : 'bg-secondary/50 text-foreground'
                    }`}
                  >
                    <Avatar className="w-6 h-6">
                      {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                      <AvatarFallback className="text-[10px]">{(u.username || '?')[0]}</AvatarFallback>
                    </Avatar>
                    {u.username || 'Ukjent'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Opprett utfordring'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeForm;
