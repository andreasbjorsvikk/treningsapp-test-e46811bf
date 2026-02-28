import { useState, useCallback, useMemo, useRef } from 'react';
import { SessionType, WorkoutSession } from '@/types/workout';
import GoalsSection from '@/components/GoalsSection';
import { workoutService } from '@/services/workoutService';
import { goalService } from '@/services/goalService';
import { allSessionTypes } from '@/utils/workoutUtils';
import { findGoalForPeriod, computeProgress, metricLabels } from '@/utils/goalUtils';
import SessionCard from '@/components/SessionCard';
import TypeFilter from '@/components/TypeFilter';
import WorkoutDialog from '@/components/WorkoutDialog';
import PeriodSelector, { Period } from '@/components/PeriodSelector';
import ActivityTypeFilter from '@/components/ActivityTypeFilter';
import StatsTiles from '@/components/StatsTiles';
import TrendChart from '@/components/TrendChart';
import ProgressWheel from '@/components/ProgressWheel';
import MetricSelector, { ChartMetric } from '@/components/MetricSelector';
import { TrainingSubTab } from '@/components/BottomNav';
import { ChevronDown, ChevronRight, Download, Upload, Replace, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TrainingPageProps {
  initialStatPeriod?: 'month' | 'year';
  subTab: TrainingSubTab;
}

const monthNames = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

const TrainingPage = ({ initialStatPeriod, subTab }: TrainingPageProps) => {
  const [filterType, setFilterType] = useState<SessionType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const now = new Date();
  const [period, setPeriod] = useState<Period>(initialStatPeriod || 'month');
  const [statMonth, setStatMonth] = useState(now.getMonth());
  const [statYear, setStatYear] = useState(now.getFullYear());
  const [selectedTypes, setSelectedTypes] = useState<SessionType[]>([...allSessionTypes]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [historyYear, setHistoryYear] = useState<string>(String(now.getFullYear()));
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const allSessions = workoutService.getAll();
  const allGoals = goalService.getAll();
  const filtered = filterType === 'all' ? allSessions : allSessions.filter(s => s.type === filterType);

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
    // Sort months descending
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a)
      .map(([month, sessions]) => ({
        month,
        label: monthNames[month],
        sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }));
  }, [filtered, historyYear]);

  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  // Progress wheel data
  const monthGoal = useMemo(() => findGoalForPeriod(allGoals, 'month'), [allGoals]);
  const monthData = useMemo(() => {
    if (!monthGoal) return { current: 0, target: 0, percent: 0, unit: '' };
    const sessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === statMonth && d.getFullYear() === statYear &&
        (monthGoal.activityType === 'all' || s.type === monthGoal.activityType);
    });
    const current = computeProgress(sessions, monthGoal.metric);
    const target = monthGoal.target;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current: Math.round(current * 10) / 10, target, percent, unit: metricLabels[monthGoal.metric] };
  }, [allSessions, monthGoal, statMonth, statYear]);

  const yearGoal = useMemo(() => findGoalForPeriod(allGoals, 'year'), [allGoals]);
  const yearData = useMemo(() => {
    if (!yearGoal) return { current: 0, target: 0, diff: 0, expected: 0, unit: '' };
    const sessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === statYear &&
        (yearGoal.activityType === 'all' || s.type === yearGoal.activityType);
    });
    const current = computeProgress(sessions, yearGoal.metric);
    const target = yearGoal.target;
    const startOfYear = new Date(statYear, 0, 1);
    const endOfYear = new Date(statYear + 1, 0, 1);
    const refDate = statYear === now.getFullYear() ? now : endOfYear;
    const yearFraction = (refDate.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime());
    const expected = target * yearFraction;
    const diff = current - expected;
    return { current: Math.round(current * 10) / 10, target, diff, expected, unit: metricLabels[yearGoal.metric] };
  }, [allSessions, yearGoal, statYear]);

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

  const handleDelete = useCallback((id: string) => {
    workoutService.delete(id);
    setRefresh(r => r + 1);
  }, []);

  const handleEdit = useCallback((session: WorkoutSession) => {
    setEditSession(session);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback((data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) {
      workoutService.update(editSession.id, data);
    } else {
      workoutService.add(data);
    }
    setEditSession(undefined);
    setRefresh(r => r + 1);
  }, [editSession]);

  const handleExport = useCallback(() => {
    const data = workoutService.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treningslogg-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Økter eksportert!');
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        if (importMode === 'replace') {
          workoutService.importReplace(data);
          toast.success(`Alle økter erstattet med ${data.length} økter.`);
        } else {
          const added = workoutService.importMerge(data);
          toast.success(`${added} nye økter lagt til (duplikater hoppet over).`);
        }
        setRefresh(r => r + 1);
      } catch {
        toast.error('Kunne ikke lese filen. Sjekk at det er en gyldig JSON-fil.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importMode]);

  const handleImportMerge = useCallback(() => {
    setImportMode('merge');
    setTimeout(() => importFileRef.current?.click(), 0);
  }, []);

  const handleImportReplace = useCallback(() => {
    if (confirm('⚠️ Dette vil overskrive alle økter du har i appen fra før. Er du sikker?')) {
      setImportMode('replace');
      setTimeout(() => importFileRef.current?.click(), 0);
    }
  }, []);

  return (
    <div className="space-y-4">
      {subTab === 'statistikk' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <ProgressWheel
              percent={monthData.percent}
              current={monthData.current}
              target={monthData.target}
              unit={monthData.unit}
              title={`${monthNames[statMonth]} ${statYear}`}
              hasGoal={!!monthGoal}
            />
            <ProgressWheel
              percent={0}
              current={yearData.current}
              target={yearData.target}
              unit={yearData.unit}
              title={String(statYear)}
              hasGoal={!!yearGoal}
              paceMode={{ diff: yearData.diff, expected: yearData.expected }}
            />
          </div>

          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            month={statMonth}
            year={statYear}
            onMonthChange={setStatMonth}
            onYearChange={setStatYear}
          />

          <StatsTiles sessions={statSessions} />
          <ActivityTypeFilter selected={selectedTypes} onToggle={handleToggleType} />
          <MetricSelector selected={chartMetric} onSelect={setChartMetric} />
          
          <div className="h-[280px] lg:h-[360px]">
            <TrendChart sessions={statSessions} period={period} month={statMonth} year={statYear} metric={chartMetric} />
          </div>
        </div>
      )}

      {subTab === 'historikk' && (
        <div className="space-y-4">
          <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          <div className="flex items-center justify-between gap-2">
            <TypeFilter selected={filterType} onSelect={setFilterType} />
            <div className="flex items-center gap-1">
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
                    <Download className="w-4 h-4 mr-2" /> Eksporter alle økter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportMerge}>
                    <Upload className="w-4 h-4 mr-2" /> Importer (legg til)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportReplace} className="text-destructive focus:text-destructive">
                    <Replace className="w-4 h-4 mr-2" /> Importer (erstatt alt)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2">
            {historyByMonth.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Ingen økter funnet i {historyYear}.</p>
            ) : (
              historyByMonth.map(group => {
                const monthKey = `${historyYear}-${group.month}`;
                const isCollapsed = collapsedMonths.has(monthKey);
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
                          {group.sessions.length} {group.sessions.length === 1 ? 'økt' : 'økter'}
                        </span>
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-2">
                        {group.sessions.map(s => (
                          <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {subTab === 'mål' && <GoalsSection />}

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />
    </div>
  );
};

export default TrainingPage;
