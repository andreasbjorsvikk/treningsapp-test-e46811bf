import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockUsers, mockGroups, ChallengeMetric, MockUser } from '@/data/mockCommunity';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';

interface ChallengeFormProps {
  open: boolean;
  onClose: () => void;
  preselectedUser?: MockUser | null;
}

const periodOptions = [
  { value: 'week', label: 'Denne uken' },
  { value: 'month', label: 'Denne måneden' },
  { value: 'year', label: 'Dette året' },
  { value: 'custom', label: 'Egendefinert' },
];

const metricOptions: { value: ChallengeMetric; label: string }[] = [
  { value: 'sessions', label: 'Antall økter' },
  { value: 'distance', label: 'Distanse (km)' },
  { value: 'duration', label: 'Varighet (min)' },
  { value: 'elevation', label: 'Høydemeter (m)' },
];

const ChallengeForm = ({ open, onClose, preselectedUser }: ChallengeFormProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('sessions');
  const [activityType, setActivityType] = useState('all');
  const [period, setPeriod] = useState('month');
  const [target, setTarget] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    preselectedUser ? [preselectedUser.id] : []
  );

  const friends = mockUsers.filter(u => u.id !== 'me');

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Fyll ut navn');
      return;
    }
    toast.success('Utfordring opprettet (mock)');
    onClose();
    setName(''); setEmoji(''); setTarget(''); setSelectedUsers([]);
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
          {!target && (
            <p className="text-xs text-muted-foreground">Uten mål: den med mest vinner</p>
          )}

          {/* Invite link */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText('https://treningsapp.no/challenge/invite/xyz');
              toast.success('Invitasjonslenke kopiert!');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> Kopier invitasjonslenke
          </button>

          {/* Participant selection */}
          <div>
            <Label className="text-xs mb-2 block">Deltakere</Label>
            <div className="space-y-1">
              {friends.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                    selectedUsers.includes(u.id) ? 'bg-accent/10 text-accent' : 'bg-secondary/50 text-foreground'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center">
                    <span className="text-[10px] font-medium">{u.username[0]}</span>
                  </div>
                  {u.username}
                </button>
              ))}
            </div>

            {mockGroups.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Grupper</p>
                {mockGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      const memberIds = g.members.filter(m => m.id !== 'me').map(m => m.id);
                      setSelectedUsers(prev => {
                        const all = new Set([...prev, ...memberIds]);
                        return Array.from(all);
                      });
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-sm bg-secondary/50 hover:bg-secondary/80 transition-colors mb-1"
                  >
                    <span>{g.emoji}</span>
                    {g.name}
                    <span className="text-xs text-muted-foreground ml-auto">{g.members.length} medl.</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Opprett utfordring
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeForm;
