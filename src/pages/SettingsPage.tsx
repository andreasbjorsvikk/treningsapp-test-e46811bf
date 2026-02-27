import { useSettings, AccentColor } from '@/contexts/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';
import { Moon, Sun } from 'lucide-react';
import { getActivityColors } from '@/utils/activityColors';

const SettingsPage = () => {
  const { settings, updateSettings, accentColors, getTypeColor } = useSettings();

  const handleClearData = () => {
    if (confirm('Er du sikker på at du vil slette all data? Dette kan ikke angres.')) {
      localStorage.removeItem('treningslogg_sessions');
      localStorage.removeItem('treningslogg_goals');
      window.location.reload();
    }
  };

  const handleTypeColorChange = (type: SessionType, color: string) => {
    updateSettings({
      sessionTypeColors: {
        ...settings.sessionTypeColors,
        [type]: color,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Innstillinger
      </h2>

      {/* Theme section */}
      <div className="glass-card rounded-lg p-4 space-y-5">
        <h3 className="font-display font-semibold text-sm">Utseende</h3>

        {/* Dark mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            <Label htmlFor="dark-mode" className="text-sm">
              {settings.darkMode ? 'Mørk modus' : 'Lys modus'}
            </Label>
          </div>
          <Switch
            id="dark-mode"
            checked={settings.darkMode}
            onCheckedChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <Label className="text-sm">Aksentfarge</Label>
          <div className="flex gap-3 flex-wrap">
            {(Object.entries(accentColors) as [AccentColor, { label: string; swatch: string }][]).map(
              ([key, { label, swatch }]) => (
                <button
                  key={key}
                  onClick={() => updateSettings({ accentColor: key })}
                  className={`
                    w-9 h-9 rounded-full transition-all border-2
                    ${settings.accentColor === key ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'}
                  `}
                  style={{ backgroundColor: swatch }}
                  title={label}
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Session type colors */}
      <div className="glass-card rounded-lg p-4 space-y-4">
        <h3 className="font-display font-semibold text-sm">Økt-farger</h3>
        <p className="text-xs text-muted-foreground">Fargeprofil for hver aktivitetstype.</p>
        <div className="space-y-3">
          {allSessionTypes.map((type) => {
            const cfg = sessionTypeConfig[type];
            const colors = getActivityColors(type, settings.darkMode);
            return (
              <div key={type} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: colors.bg }}
                >
                  <ActivityIcon
                    type={type}
                    className="w-5 h-5"
                    colorOverride={!settings.darkMode ? colors.text : undefined}
                  />
                </div>
                <Label className="text-sm">{cfg.label}</Label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences section */}
      <div className="glass-card rounded-lg p-4 space-y-5">
        <h3 className="font-display font-semibold text-sm">Preferanser</h3>

        {/* First day of week */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Første dag i uken</Label>
          <Select
            value={settings.firstDayOfWeek}
            onValueChange={(v) => updateSettings({ firstDayOfWeek: v as 'monday' | 'sunday' })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Mandag</SelectItem>
              <SelectItem value="sunday">Søndag</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Units */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enheter</Label>
          <Select
            value={settings.unitSystem}
            onValueChange={(v) => updateSettings({ unitSystem: v as 'metric' | 'imperial' })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">km / meter</SelectItem>
              <SelectItem value="imperial">mi / feet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default session type */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Standard økt-type</Label>
          <Select
            value={settings.defaultSessionType}
            onValueChange={(v) => updateSettings({ defaultSessionType: v as any })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allSessionTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {sessionTypeConfig[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card rounded-lg p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-destructive">Faresone</h3>
        <p className="text-xs text-muted-foreground">Slett all treningsdata og mål fra denne enheten.</p>
        <button
          onClick={handleClearData}
          className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
        >
          Slett all data
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
