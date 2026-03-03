import { useState, useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { formatDuration } from '@/utils/workoutUtils';
import { Trophy, ChevronRight, Plus, Trash2, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

// Running distance benchmarks
const RUNNING_BENCHMARKS = [
  { label: '1 km', distance: 1 },
  { label: '3 km', distance: 3 },
  { label: '5 km', distance: 5 },
  { label: '10 km', distance: 10 },
  { label: '21,1 km', distance: 21.1 },
  { label: '42,2 km', distance: 42.2 },
];

const CYCLING_BENCHMARKS = [
  { label: '10 km', distance: 10 },
  { label: '25 km', distance: 25 },
  { label: '50 km', distance: 50 },
  { label: '100 km', distance: 100 },
  { label: '160 km', distance: 160 },
];

function estimateBestTime(sessions: WorkoutSession[], benchmarkKm: number): string | null {
  // Find sessions that have distance >= benchmark
  const qualifying = sessions.filter(s => s.distance && s.distance >= benchmarkKm);
  if (qualifying.length === 0) return null;

  // Estimate time for the benchmark distance based on pace
  let bestMinutes = Infinity;
  for (const s of qualifying) {
    if (!s.distance || s.distance <= 0) continue;
    const paceMinPerKm = s.durationMinutes / s.distance;
    const estimatedMin = paceMinPerKm * benchmarkKm;
    if (estimatedMin < bestMinutes) bestMinutes = estimatedMin;
  }

  if (bestMinutes === Infinity) return null;
  return formatDuration(Math.round(bestMinutes));
}

// Hiking record types
export interface HikingRecord {
  id: string;
  name: string;
  elevation?: number; // m.o.h (meters above sea level)
  distance?: number; // km
  elevationGain?: number; // height gain in meters
  entries: HikingEntry[];
}

export interface HikingEntry {
  id: string;
  time: string;
  date: string;
}

type RecordTab = 'running' | 'cycling' | 'hiking';

const RecordsSection = () => {
  const appData = useAppDataContext();
  const [tab, setTab] = useState<RecordTab>('running');
  const [selectedHike, setSelectedHike] = useState<HikingRecord | null>(null);
  const [showAddHike, setShowAddHike] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newHikeName, setNewHikeName] = useState('');
  const [newHikeElevation, setNewHikeElevation] = useState('');
  const [newHikeDistance, setNewHikeDistance] = useState('');
  const [newHikeElevationGain, setNewHikeElevationGain] = useState('');
  const [newEntryTime, setNewEntryTime] = useState('');
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().slice(0, 10));

  // Mock hiking records (stored in localStorage for now)
  const [hikingRecords, setHikingRecords] = useState<HikingRecord[]>(() => {
    try {
      const stored = localStorage.getItem('treningslogg_hiking_records');
      return stored ? JSON.parse(stored) : [
        {
          id: 'h1',
          name: 'Galdhøpiggen',
          entries: [
            { id: 'e1', time: '3:45', date: '2025-07-15' },
            { id: 'e2', time: '4:10', date: '2025-08-22' },
            { id: 'e3', time: '3:30', date: '2026-01-05' },
          ],
        },
        {
          id: 'h2',
          name: 'Romsdalseggen',
          entries: [
            { id: 'e4', time: '5:20', date: '2025-06-10' },
            { id: 'e5', time: '4:55', date: '2025-09-01' },
          ],
        },
      ];
    } catch { return []; }
  });

  const saveHikingRecords = (records: HikingRecord[]) => {
    setHikingRecords(records);
    localStorage.setItem('treningslogg_hiking_records', JSON.stringify(records));
  };

  const runningSessions = useMemo(() =>
    appData.sessions.filter(s => s.type === 'løping'),
    [appData.sessions]
  );

  const cyclingSessions = useMemo(() =>
    appData.sessions.filter(s => s.type === 'sykling'),
    [appData.sessions]
  );

  const tabs: { id: RecordTab; label: string }[] = [
    { id: 'running', label: 'Løping' },
    { id: 'cycling', label: 'Sykling' },
    { id: 'hiking', label: 'Fjelltur' },
  ];

  const handleAddHike = () => {
    if (!newHikeName.trim()) return;
    const record: HikingRecord = {
      id: `h${Date.now()}`,
      name: newHikeName.trim(),
      elevation: newHikeElevation ? Number(newHikeElevation) : undefined,
      distance: newHikeDistance ? Number(newHikeDistance) : undefined,
      elevationGain: newHikeElevationGain ? Number(newHikeElevationGain) : undefined,
      entries: [],
    };
    saveHikingRecords([...hikingRecords, record]);
    setNewHikeName('');
    setNewHikeElevation('');
    setNewHikeDistance('');
    setNewHikeElevationGain('');
    setShowAddHike(false);
  };

  const handleAddEntry = () => {
    if (!selectedHike || !newEntryTime.trim()) return;
    const entry: HikingEntry = {
      id: `e${Date.now()}`,
      time: newEntryTime.trim(),
      date: newEntryDate,
    };
    const updated = hikingRecords.map(h =>
      h.id === selectedHike.id
        ? { ...h, entries: [...h.entries, entry] }
        : h
    );
    saveHikingRecords(updated);
    setSelectedHike(updated.find(h => h.id === selectedHike.id) || null);
    setNewEntryTime('');
    setShowAddEntry(false);
  };

  const handleDeleteHike = (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne fjellturen?')) return;
    saveHikingRecords(hikingRecords.filter(h => h.id !== id));
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedHike) return;
    const updated = hikingRecords.map(h =>
      h.id === selectedHike.id
        ? { ...h, entries: h.entries.filter(e => e.id !== entryId) }
        : h
    );
    saveHikingRecords(updated);
    setSelectedHike(updated.find(h => h.id === selectedHike.id) || null);
  };

  // Parse time string like "3:45" or "1:23:45" to minutes for sorting
  const parseTimeToMinutes = (t: string): number => {
    const parts = t.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Infinity;
  };

  const renderDistanceRecords = (sessions: WorkoutSession[], benchmarks: typeof RUNNING_BENCHMARKS) => {
    const records = benchmarks
      .map(b => ({ ...b, time: estimateBestTime(sessions, b.distance) }))
      .filter(b => b.time !== null);

    if (records.length === 0) {
      return (
        <p className="text-center py-8 text-muted-foreground text-sm">
          Ingen økter med distanse registrert ennå.
        </p>
      );
    }

    return (
      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
        <div className="px-4 py-2.5 bg-secondary/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Raskeste
          </p>
        </div>
        {records.map(r => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">{r.label}</span>
            <span className="font-display font-bold text-sm">{r.time}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="relative flex rounded-lg bg-muted p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'running' && renderDistanceRecords(runningSessions, RUNNING_BENCHMARKS)}
      {tab === 'cycling' && renderDistanceRecords(cyclingSessions, CYCLING_BENCHMARKS)}

      {tab === 'hiking' && (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddHike(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Legg til fjelltur
          </Button>

          {hikingRecords.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Ingen fjellturer lagt til ennå.
            </p>
          ) : (
            <div className="space-y-1">
              {hikingRecords.map(h => {
                const sorted = [...h.entries].sort((a, b) =>
                  parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                );
                const best = sorted[0];
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHike(h)}
                    className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Mountain className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.entries.length} {h.entries.length === 1 ? 'registrering' : 'registreringer'}
                        {best && ` · Beste: ${best.time}`}
                        {h.elevation && ` · ${h.elevation} m.o.h`}
                        {h.distance && ` · ${h.distance} km`}
                        {h.elevationGain && ` · ${h.elevationGain} hm`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Add hike dialog */}
          <Dialog open={showAddHike} onOpenChange={setShowAddHike}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny fjelltur</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={newHikeName}
                  onChange={e => setNewHikeName(e.target.value)}
                  placeholder="Navn på fjellet/turen..."
                />
                <Input
                  type="number"
                  value={newHikeElevation}
                  onChange={e => setNewHikeElevation(e.target.value)}
                  placeholder="M.o.h (valgfritt)"
                />
                <Input
                  type="number"
                  value={newHikeDistance}
                  onChange={e => setNewHikeDistance(e.target.value)}
                  placeholder="Distanse i km (valgfritt)"
                />
                <Input
                  type="number"
                  value={newHikeElevationGain}
                  onChange={e => setNewHikeElevationGain(e.target.value)}
                  placeholder="Høydemeter (valgfritt)"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleAddHike} disabled={!newHikeName.trim()}>
                  Legg til
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Hike detail drawer */}
          <Drawer open={!!selectedHike} onOpenChange={o => { if (!o) setSelectedHike(null); }}>
            <DrawerContent className="max-h-[85vh]">
              <div className="overflow-y-auto scrollbar-hide pb-6">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="flex items-center gap-2">
                    <Mountain className="w-5 h-5 text-muted-foreground" />
                    {selectedHike?.name}
                  </DrawerTitle>
                  <DrawerDescription>
                    {selectedHike?.entries.length || 0} registreringer
                  </DrawerDescription>
                </DrawerHeader>

                {/* Hike info tiles */}
                {selectedHike && (selectedHike.elevation || selectedHike.distance || selectedHike.elevationGain) && (
                  <div className="px-4 pb-3">
                    <div className="flex gap-2">
                      {selectedHike.elevation != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">M.o.h</p>
                          <p className="font-display font-bold text-sm">{selectedHike.elevation} m</p>
                        </div>
                      )}
                      {selectedHike.distance != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Distanse</p>
                          <p className="font-display font-bold text-sm">{selectedHike.distance} km</p>
                        </div>
                      )}
                      {selectedHike.elevationGain != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Høydemeter</p>
                          <p className="font-display font-bold text-sm">{selectedHike.elevationGain} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="px-4 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddEntry(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Legg til tid
                  </Button>

                  {selectedHike && (() => {
                    const sorted = [...selectedHike.entries].sort((a, b) =>
                      parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                    );
                    return sorted.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground text-sm">
                        Ingen tider registrert ennå.
                      </p>
                    ) : (
                      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
                        {sorted.map((e, i) => (
                          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                            <span className={`text-xs font-bold w-6 text-center ${
                              i === 0 ? 'text-warning' : 'text-muted-foreground'
                            }`}>
                              {i === 0 ? '🏆' : `#${i + 1}`}
                            </span>
                            <div className="flex-1">
                              <span className="font-display font-bold text-sm">{e.time}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(e.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => handleDeleteEntry(e.id)}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => { handleDeleteHike(selectedHike!.id); setSelectedHike(null); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Slett fjelltur
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Add entry dialog */}
          <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny tid – {selectedHike?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tid (t:mm eller tt:mm)</label>
                  <Input
                    value={newEntryTime}
                    onChange={e => setNewEntryTime(e.target.value)}
                    placeholder="F.eks. 3:45"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Dato</label>
                  <Input
                    type="date"
                    value={newEntryDate}
                    onChange={e => setNewEntryDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEntry} disabled={!newEntryTime.trim()}>
                  Legg til
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default RecordsSection;
