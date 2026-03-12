import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import { getFriends, createChallenge, updateChallenge, deleteChallenge, Friend } from '@/services/communityService';
import { ChallengeWithParticipants } from '@/pages/CommunityPage';
import { toast } from 'sonner';
import { Loader2, Trash2, Layers } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface ChallengeFormProps {
  open: boolean;
  onClose: () => void;
  preselectedUser?: Friend | null;
  onCreated?: () => void;
  editChallenge?: ChallengeWithParticipants | null;
}

type ChallengeMetric = 'sessions' | 'distance' | 'duration' | 'elevation';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  if (period === 'week') {
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...6=Sat
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { start: toLocalDateStr(monday), end: toLocalDateStr(sunday) };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  // year
  return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
}

const ChallengeForm = ({ open, onClose, preselectedUser, onCreated, editChallenge }: ChallengeFormProps) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const disabledTypes = settings.disabledSessionTypes || [];
  const isEditing = !!editChallenge;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('sessions');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [target, setTarget] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      
      const loadData = async () => {
        const friendsList = await getFriends();
        setFriends(friendsList);
        
        // When editing, fetch fresh participants to catch users who left
        if (editChallenge) {
          const { getChallengeParticipants } = await import('@/services/communityService');
          const freshParts = await getChallengeParticipants(editChallenge.challenge.id);
          setFreshParticipantIds(freshParts.map(p => p.user_id));
        } else {
          setFreshParticipantIds([]);
        }
        
        setLoading(false);
      };
      loadData();

      if (editChallenge) {
        const c = editChallenge.challenge;
        setName(c.name);
        setEmoji(c.emoji || '');
        setMetric(c.metric as ChallengeMetric);
        setSelectedTypes(c.activity_type === 'all' ? ['all'] : c.activity_type.split(','));
        setTarget(c.target > 0 ? String(c.target) : '');
        setPeriod('month');
      } else {
        setName('');
        setEmoji('');
        setMetric('sessions');
        setSelectedTypes(['all']);
        setPeriod('month');
        setTarget('');
        setSelectedUsers(preselectedUser ? [preselectedUser.id] : []);
      }
      setShowDeleteConfirm(false);
    }
  }, [open, preselectedUser, editChallenge]);

  // Use fresh participant IDs (fetched on open) instead of stale props
  const availableFriends = isEditing
    ? friends.filter(f => !freshParticipantIds.includes(f.id))
    : friends;

  const toggleType = (type: string) => {
    if (type === 'all') {
      setSelectedTypes(['all']);
      return;
    }
    setSelectedTypes(prev => {
      const filtered = prev.filter(t => t !== 'all');
      if (filtered.includes(type)) {
        const next = filtered.filter(t => t !== type);
        return next.length === 0 ? ['all'] : next;
      }
      return [...filtered, type];
    });
  };

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error(t('challenge.fillName')); return; }
    if (period === 'custom' && (!customStart || !customEnd)) { toast.error(t('challenge.fillDates')); return; }
    setSubmitting(true);
    try {
      const dates = period === 'custom' ? { start: customStart, end: customEnd } : getPeriodDates(period);
      if (isEditing) {
        await updateChallenge(editChallenge!.challenge.id, {
          name,
          emoji: emoji || undefined,
          metric,
          activityType: selectedTypes.includes('all') ? 'all' : selectedTypes.join(','),
          target: parseFloat(target) || 0,
          periodStart: dates.start,
          periodEnd: dates.end,
          newInvitedUserIds: selectedUsers.length > 0 ? selectedUsers : undefined,
        });
        toast.success(t('challenge.updated'));
      } else {
        await createChallenge({
          name,
          emoji: emoji || undefined,
          metric,
          activityType: selectedTypes.includes('all') ? 'all' : selectedTypes.join(','),
          target: parseFloat(target) || 0,
          periodStart: dates.start,
          periodEnd: dates.end,
          invitedUserIds: selectedUsers,
        });
        toast.success(t('community.createSuccess'));
      }
      onCreated?.();
      onClose();
      setName(''); setEmoji(''); setTarget(''); setSelectedUsers([]);
    } catch {
      toast.error(isEditing ? t('challenge.updateError') : t('community.createError'));
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!editChallenge) return;
    setSubmitting(true);
    try {
      await deleteChallenge(editChallenge.challenge.id);
      toast.success(t('challenge.deleted'));
      onCreated?.();
      onClose();
    } catch {
      toast.error(t('community.createError'));
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('challenge.editChallenge') : t('challenge.newChallenge')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">{t('challenge.name')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('challenge.namePlaceholder')} />
            </div>
            <div className="w-16">
              <Label className="text-xs">{t('challenge.emoji')}</Label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🏔️" className="text-center" />
            </div>
          </div>

          <div>
            <Label className="text-xs">{t('challenge.metric')}</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as ChallengeMetric)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['sessions', 'distance', 'duration', 'elevation'] as ChallengeMetric[]).map(o => (
                  <SelectItem key={o} value={o}>{t(`challenge.metric${o.charAt(0).toUpperCase() + o.slice(1)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{t('challenge.activityType')}</Label>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1.5">
              <button
                type="button"
                onClick={() => toggleType('all')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedTypes.includes('all')
                    ? 'gradient-energy text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {t('goalForm.all')}
              </button>
              {allSessionTypes.filter(tp => !disabledTypes.includes(tp)).map(type => {
                const colors = getActivityColors(type, isDark);
                const selected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: selected ? colors.bg : undefined,
                      color: selected ? colors.text : undefined,
                    }}
                  >
                    <ActivityIcon type={type} className="w-3.5 h-3.5" colorOverride={selected ? colors.text : undefined} />
                    {t(`activity.${type}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">{t('challenge.period')}</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
              {['week', 'month', 'year', 'custom'].map(o => (
                    <SelectItem key={o} value={o}>{t(`challenge.period${o.charAt(0).toUpperCase() + o.slice(1)}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">{t('challenge.target')}</Label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="—" />
            </div>
          </div>

          {period === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">{t('challenge.customFrom')}</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">{t('challenge.customTo')}</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
          {!target && <p className="text-xs text-muted-foreground">{t('challenge.noTargetDesc')}</p>}

          {/* Participant selection */}
          <div>
            <Label className="text-xs mb-2 block">
              {isEditing ? t('challenge.addParticipants') : t('challenge.participants')}
            </Label>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : availableFriends.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {isEditing ? t('challenge.allFriendsInvited') : t('community.addFriendsFirst')}
              </p>
            ) : (
              <div className="space-y-1">
                {availableFriends.map(u => (
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
                    {u.username || t('common.unknown')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isEditing ? t('challenge.saveChallenge') : t('challenge.createChallenge'))}
          </button>

          {isEditing && (
            <>
              {showDeleteConfirm ? (
                <div className="space-y-2 w-full">
                  <p className="text-xs text-muted-foreground text-center">{t('challenge.deleteConfirm')}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={submitting}
                      className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('common.delete')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {t('challenge.deleteChallenge')}
                </button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeForm;
