import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { peaks } from '@/data/peaks';
import { Peak } from '@/data/peaks';
import { getUserCheckins, PeakCheckin } from '@/services/peakCheckinService';
import MapSubTabs, { MapSubTab } from '@/components/map/MapSubTabs';
import MapView from '@/components/map/MapView';
import PeaksList from '@/components/map/PeaksList';
import PeakDetailDrawer from '@/components/map/PeakDetailDrawer';

const MapPage = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<MapSubTab>('kart');
  const [checkins, setCheckins] = useState<PeakCheckin[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserCheckins(user.id);
      setCheckins(data);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const handleSelectPeak = (peak: Peak) => {
    setSelectedPeak(peak);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Sub-tab bar */}
      <div className="px-4 pt-3 pb-2">
        <MapSubTabs active={subTab} onChange={setSubTab} />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {subTab === 'kart' ? (
          <MapView
            peaks={peaks}
            checkins={checkins}
            onSelectPeak={handleSelectPeak}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <PeaksList
              peaks={peaks}
              checkins={checkins}
              onSelectPeak={handleSelectPeak}
            />
          </div>
        )}
      </div>

      {/* Peak detail drawer */}
      <PeakDetailDrawer
        peak={selectedPeak}
        open={!!selectedPeak}
        onClose={() => setSelectedPeak(null)}
        checkins={checkins}
        onCheckinSuccess={() => {
          fetchCheckins();
        }}
      />
    </div>
  );
};

export default MapPage;
