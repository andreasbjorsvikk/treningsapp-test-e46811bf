import { useState } from 'react';
import { SessionType } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import AppHeader from '@/components/AppHeader';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import TypeFilter from '@/components/TypeFilter';

const Index = () => {
  const [filterType, setFilterType] = useState<SessionType | 'all'>('all');

  const stats = workoutService.getWeeklyStats();
  const allSessions = workoutService.getAll();
  const filteredSessions = filterType === 'all' 
    ? allSessions 
    : allSessions.filter(s => s.type === filterType);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-6 space-y-6">
        {/* Weekly stats */}
        <section>
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Siste 7 dager
          </h2>
          <StatsOverview stats={stats} />
        </section>

        {/* Sessions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Dine økter ({filteredSessions.length})
            </h2>
          </div>

          <TypeFilter selected={filterType} onSelect={setFilterType} />

          <div className="mt-4 space-y-3">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ingen økter funnet for denne typen.</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
