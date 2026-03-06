import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SessionType, WorkoutSession, HealthEvent } from '@/types/workout';
import GoalsSection from '@/components/GoalsSection';
import StatistikkContent from '@/components/StatistikkContent';
import RecordsSection from '@/components/RecordsSection';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';
import { allSessionTypes } from '@/utils/workoutUtils';
import SessionCard from '@/components/SessionCard';
import WorkoutDetailDrawer from '@/components/WorkoutDetailDrawer';
import TypeFilter from '@/components/TypeFilter';
import WorkoutDialog from '@/components/WorkoutDialog';
import HealthEventDialog from '@/components/HealthEventDialog';
import { Period } from '@/components/PeriodSelector';
import { ChartMetric } from '@/components/MetricSelector';
import TrainingSubTabs from '@/components/TrainingSubTabs';
import { TrainingSubTab } from '@/components/BottomNav';
import { ChevronRight, Download, Upload, Replace, MoreVertical, Ambulance, Cross, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

interface TrainingPageProps {
  initialStatPeriod?: 'month' | 'year';
}

// Month names are now provided via translation

const TrainingPage = ({ initialStatPeriod }: TrainingPageProps) => {
  const [subTab, setSubTab] = useState<TrainingSubTab>('statistikk');
  const { t } = useTranslation();
  const monthNames = Array.from({ length: 12 }, (_, i) => t(`month.${i}`));
  const appData = useAppDataContext();

  // Listen for navigation to goals tab from home page
  useEffect(() => {
    const handler = () => setSubTab('mål');
    window.addEventListener('navigate-to-goals', handler);
    return () => window.removeEventListener('navigate-to-goals', handler);
  }, []);

  useEffect(() => {
    const pending = (window as any).__navigateToGoals;
    if (pending) {
      setSubTab('mål');
      delete (window as any).__navigateToGoals;
    }
  }, []);

  // Listen for navigation to history tab
  useEffect(() => {
    const handler = () => setSubTab('historikk');
    window.addEventListener('navigate-to-history', handler);
    return () => window.removeEventListener('navigate-to-history', handler);
  }, []);

  useEffect(() => {
    const pending = (window as any).__navigateToHistory;
    if (pending) {
      setSubTab('historikk');
      delete (window as any).__navigateToHistory;
    }
  }, []);

  const [filterType, setFilterType] = useState<SessionType | 'all'>('all');
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [healthFilter, setHealthFilter] = useState<'all' | 'sickness' | 'injury'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [editHealthEvent, setEditHealthEvent] = useState<HealthEvent | undefined>();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const now = new Date();
  const [period, setPeriod] = useState<Period>(initialStatPeriod || 'month');
  const [statMonth, setStatMonth] = useState(now.getMonth());
  const [statYear, setStatYear] = useState(now.getFullYear());
  const [selectedTypes, setSelectedTypes] = useState<SessionType[]>([...allSessionTypes]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [historyYear, setHistoryYear] = useState<string>(String(now.getFullYear()));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([`${now.getFullYear()}-${now.getMonth()}`]));

  const allSessions = appData.sessions;
  const healthEvents = appData.healthEvents;
  const filtered = filterType === 'all' ? allSessions : allSessions.filter(s => s.type === filterType);

  const currentPrimaryGoal = appData.currentPrimaryGoal;

  // Available years from sessions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allSessions.forEach(s => years.add(new Date(s.date).getFullYear()));
    const sorted = Array.from(years).sort((a, b) => b - a);
    if (sorted.length === 0) sorted.push(now.getFullYear());
    return sorted;
  }, [allSessions]);

  // Filter history by year and group by month
  const historyByMonth = useMemo(() => {
    const yearNum = parseInt(historyYear);
    const yearSessions = filtered.filter(s => new Date(s.date).getFullYear() === yearNum);
    const groups = new Map<number, WorkoutSession[]>();
    yearSessions.forEach(s => {
      const m = new Date(s.date).getMonth();
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m)!.push(s);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a)
      .map(([month, sessions]) => ({
        month,
        label: monthNames[month],
        sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }));
  }, [filtered, historyYear]);

  // Health events for selected year
  const yearHealthEvents = useMemo(() => {
    const yearNum = parseInt(historyYear);
    return healthEvents
      .filter(he => new Date(he.dateFrom).getFullYear() === yearNum)
      .filter(he => healthFilter === 'all' || he.type === healthFilter)
      .sort((a, b) => new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime());
  }, [healthEvents, historyYear, healthFilter]);

  const toggleMonth = useCallback((monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  // Progress wheel data driven by versioned goal periods
  const allPeriods = appData.primaryGoals;

  const monthData = useMemo(() =>
    computeMonthWheelData(allPeriods, allSessions, statMonth, statYear, now, t('metric.sessions')),
    [allPeriods, allSessions, statMonth, statYear]
  );

  const yearData = useMemo(() =>
    computeYearWheelData(allPeriods, allSessions, statYear, now, t('metric.sessions')),
    [allPeriods, allSessions, statYear]
  );

  const statSessions = useMemo(() => {
    let sessions = allSessions.filter(s => selectedTypes.includes(s.type));
    if (period === 'month') {
      sessions = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === statMonth && d.getFullYear() === statYear;
      });
    } else if (period === 'year') {
      sessions = sessions.filter(s => new Date(s.date).getFullYear() === statYear);
    }
    return sessions;
  }, [allSessions, selectedTypes, period, statMonth, statYear]);

  const handleToggleType = useCallback((type: SessionType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await appData.deleteSession(id);
  }, [appData]);

  const handleEdit = useCallback((session: WorkoutSession) => {
    setEditSession(session);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) {
      await appData.updateSession(editSession.id, data);
    } else {
      await appData.addSession(data);
    }
    setEditSession(undefined);
  }, [editSession, appData]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(allSessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treningslogg-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('training.exportSuccess'));
  }, [allSessions]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) throw new Error('Invalid format');

        if (importMode === 'replace') {
          // Delete all existing sessions first
          const existingSessions = appData.sessions;
          for (const s of existingSessions) {
            await appData.deleteSession(s.id);
          }
        }

        let added = 0;
        if (importMode === 'merge') {
          const existingIds = new Set(appData.sessions.map(s => s.id));
          for (const session of data) {
            const { id, ...rest } = session;
            if (!existingIds.has(id)) {
              await appData.addSession(rest);
              added++;
            }
          }
          toast.success(t('training.importSuccess', { n: added }));
        } else {
          for (const session of data) {
            const { id, ...rest } = session;
            await appData.addSession(rest);
          }
          toast.success(t('training.importReplaceSuccess', { n: data.length }));
        }
      } catch {
        toast.error(t('training.importError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importMode, appData]);

  const handleImportMerge = useCallback(() => {
    setImportMode('merge');
    setTimeout(() => importFileRef.current?.click(), 0);
  }, []);

  const handleImportReplace = useCallback(() => {
    if (confirm(t('training.importReplaceConfirm'))) {
      setImportMode('replace');
      setTimeout(() => importFileRef.current?.click(), 0);
    }
  }, []);

  return (
    <div className="space-y-4">
      <TrainingSubTabs active={subTab} onChange={(tab) => { setSubTab(tab); window.scrollTo({ top: 0 }); }} />

      {subTab === 'statistikk' && (
        <StatistikkContent
          period={period} setPeriod={setPeriod}
          statMonth={statMonth} setStatMonth={setStatMonth}
          statYear={statYear} setStatYear={setStatYear}
          statSessions={statSessions}
          selectedTypes={selectedTypes} handleToggleType={handleToggleType}
          chartMetric={chartMetric} setChartMetric={setChartMetric}
          monthData={monthData} yearData={yearData}
          monthNames={monthNames} primaryGoal={currentPrimaryGoal}
          onGoToGoals={() => setSubTab('mål')}
        />
      )}

      {subTab === 'historikk' && (
        <div className="space-y-4">
          <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          {/* Mobile: year + menu on their own row */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-end gap-1 md:order-2">
              <Select value={historyYear} onValueChange={setHistoryYear}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" /> {t('training.exportAll')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportMerge}>
                    <Upload className="w-4 h-4 mr-2" /> {t('training.importAdd')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportReplace} className="text-destructive focus:text-destructive">
                    <Replace className="w-4 h-4 mr-2" /> {t('training.importReplace')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="md:order-1">
              <TypeFilter selected={filterType} onSelect={setFilterType} />
            </div>
          </div>

          <div className="space-y-2">
            {historyByMonth.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">{t('training.noSessionsFound')} {historyYear}.</p>
            ) : (
              historyByMonth.map(group => {
                const monthKey = `${historyYear}-${group.month}`;
                const isCollapsed = !expandedMonths.has(monthKey);
                return (
                  <div key={monthKey} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
                        <span className="font-display font-semibold text-sm">{group.label}</span>
                        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          {group.sessions.length} {group.sessions.length === 1 ? t('training.session') : t('training.sessions')}
                        </span>
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-2">
                        {group.sessions.map(s => (
                          <SessionCard key={s.id} session={s} onClick={setDetailSession} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Health events history */}
          {healthEvents.filter(he => new Date(he.dateFrom).getFullYear() === parseInt(historyYear)).length > 0 && (
            <div className="space-y-2 mt-6">
              <h3 className="font-display font-semibold text-base text-foreground">
                {t('training.healthEvents')}
              </h3>
              <div className="flex gap-2">
                {(['all', 'sickness', 'injury'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHealthFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      healthFilter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? (
                      t('training.filterAll')
                    ) : f === 'sickness' ? (
                      <><Ambulance className="w-3.5 h-3.5" /> {t('training.filterSickness')}</>
                    ) : (
                      <><Cross className="w-3.5 h-3.5" /> {t('training.filterInjury')}</>
                    )}
                  </button>
                ))}
              </div>
              {yearHealthEvents.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">{t('training.noEventsFound')}</p>
              ) : yearHealthEvents.map(he => (
                <div key={he.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    {he.type === 'sickness' ? (
                      <Ambulance className="w-4 h-4 text-destructive" />
                    ) : (
                      <Cross className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {he.type === 'sickness' ? t('health.sickness') : t('health.injury')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(he.dateFrom).toLocaleDateString(t('date.locale'), { day: 'numeric', month: 'short' })}
                      {he.dateTo && ` – ${new Date(he.dateTo).toLocaleDateString(t('date.locale'), { day: 'numeric', month: 'short' })}`}
                    </p>
                    {he.notes && <p className="text-xs text-muted-foreground mt-0.5">{he.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditHealthEvent(he); setHealthDialogOpen(true); }}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={async () => {
                      if (confirm(t('training.deleteEventConfirm'))) {
                          await appData.deleteHealthEvent(he.id);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'mål' && <GoalsSection />}

      {subTab === 'rekorder' && <RecordsSection />}

      <WorkoutDetailDrawer
        session={detailSession}
        open={!!detailSession}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />

      <HealthEventDialog
        open={healthDialogOpen}
        onClose={() => { setHealthDialogOpen(false); setEditHealthEvent(undefined); }}
        onSave={async (data) => {
          if (editHealthEvent) {
            await appData.updateHealthEvent(editHealthEvent.id, data);
          }
        }}
        event={editHealthEvent}
      />
    </div>
  );
};

export default TrainingPage;
