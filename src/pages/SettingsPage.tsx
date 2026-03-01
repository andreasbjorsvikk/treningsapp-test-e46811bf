import { useState } from 'react';
import { useSettings, AppColorTheme, AccentColor } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';
import { Moon, Globe } from 'lucide-react';
import { getActivityColors, activityColorMap, ActivityColorSet } from '@/utils/activityColors';

// Predefined color options for activity types
const COLOR_PRESETS = [
  { labelKey: 'color.green', light: { bg: 'rgb(212,242,184)', text: 'rgb(47,107,69)', badge: 'rgb(225,248,206)' }, dark: { bg: 'rgb(105,162,85)', text: '#ffffff', badge: '#1f3a2a' } },
  { labelKey: 'color.blue', light: { bg: 'rgb(210,229,255)', text: 'rgb(42,93,168)', badge: 'rgb(228,240,255)' }, dark: { bg: 'rgb(77,120,179)', text: '#ffffff', badge: '#1c2f4a' } },
  { labelKey: 'color.red', light: { bg: 'rgb(255,212,214)', text: 'rgb(122,15,15)', badge: 'rgb(255,230,231)' }, dark: { bg: 'rgb(176,78,83)', text: '#ffffff', badge: '#7a0f0f' } },
  { labelKey: 'color.yellow', light: { bg: 'rgb(249,230,183)', text: '#734402', badge: 'rgb(255,238,190)' }, dark: { bg: 'rgb(191,144,66)', text: '#ffffff', badge: '#492d12' } },
  { labelKey: 'color.purple', light: { bg: 'rgb(241,217,252)', text: 'rgb(121,11,150)', badge: 'rgb(245,230,255)' }, dark: { bg: 'rgb(141,105,149)', text: '#ffffff', badge: '#3e0f50' } },
  { labelKey: 'color.brown', light: { bg: 'rgb(232,212,195)', text: 'rgb(75,46,31)', badge: 'rgb(242,228,217)' }, dark: { bg: 'rgb(149,115,86)', text: '#ffffff', badge: '#423122' } },
  { labelKey: 'color.cyan', light: { bg: 'rgb(229,247,255)', text: '#3f6fa8', badge: 'rgb(240,251,255)' }, dark: { bg: 'rgb(105,172,203)', text: '#ffffff', badge: '#345260' } },
  { labelKey: 'color.grey', light: { bg: 'rgb(212,212,216)', text: '#000000', badge: 'rgb(228,228,232)' }, dark: { bg: 'rgb(98,100,104)', text: '#ffffff', badge: '#313030' } },
  { labelKey: 'color.dustyPink', light: { bg: 'rgb(245,218,225)', text: 'rgb(130,45,70)', badge: 'rgb(250,230,236)' }, dark: { bg: 'rgb(155,95,115)', text: '#ffffff', badge: '#4a1a2e' } },
  { labelKey: 'color.orange', light: { bg: 'rgb(255,218,185)', text: 'rgb(140,55,10)', badge: 'rgb(255,232,208)' }, dark: { bg: 'rgb(190,110,55)', text: '#ffffff', badge: '#5a2a0d' } },
  { labelKey: 'color.sun', light: { bg: 'rgb(255,240,180)', text: 'rgb(120,85,5)', badge: 'rgb(255,245,200)' }, dark: { bg: 'rgb(185,155,55)', text: '#ffffff', badge: '#4a3a10' } },
  { labelKey: 'color.mint', light: { bg: 'rgb(210,240,230)', text: 'rgb(35,95,75)', badge: 'rgb(225,248,240)' }, dark: { bg: 'rgb(80,145,120)', text: '#ffffff', badge: '#1a3a2e' } },
];

const SettingsPage = () => {
  const { settings, updateSettings, appThemes, accentPresets, getTypeColor } = useSettings();
  const { t } = useTranslation();
  const [editingType, setEditingType] = useState<SessionType | null>(null);

  const handleClearData = () => {
    if (confirm(t('settings.deleteAllDataConfirm'))) {
      localStorage.removeItem('treningslogg_sessions');
      localStorage.removeItem('treningslogg_goals');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {t('settings.title')}
      </h2>

      {/* Theme section */}
      <div className="glass-card rounded-lg p-4 space-y-5">
        <h3 className="font-display font-semibold text-sm">{t('settings.appearance')}</h3>

        {/* Dark mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="dark-mode" className="text-sm">
              {t('settings.darkMode')}
            </Label>
          </div>
          <Switch
            id="dark-mode"
            checked={settings.darkMode}
            onCheckedChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>

        {/* Language */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">{t('settings.language')}</Label>
          </div>
          <Select
            value={settings.language}
            onValueChange={(v) => updateSettings({ language: v as 'no' | 'en' })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">{t('settings.languageNo')}</SelectItem>
              <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color theme */}
        <div className="space-y-2">
          <Label className="text-sm">{t('settings.colorTheme')}</Label>
          <div className="flex gap-3 flex-wrap">
            {(Object.entries(appThemes) as [AppColorTheme, typeof appThemes[AppColorTheme]][]).map(
              ([key, theme]) => {
                const previewColor = settings.darkMode ? theme.swatchDark : theme.swatch;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ colorTheme: key })}
                    className={`
                      w-9 h-9 rounded-full transition-all border-2
                      ${settings.colorTheme === key ? 'border-foreground scale-110 shadow-lg' : 'border-border hover:scale-105'}
                    `}
                    style={{ backgroundColor: previewColor }}
                    title={t(`theme.${key}`)}
                  />
                );
              }
            )}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-3">
          <Label className="text-sm">{t('settings.accentColor')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(accentPresets) as [AccentColor, typeof accentPresets[AccentColor]][]).map(
              ([key, preset]) => {
                const isActive = settings.accentColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ accentColor: key })}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left
                      ${isActive
                        ? 'bg-foreground/10 ring-2 ring-foreground/30 shadow-sm'
                        : 'hover:bg-foreground/5'}
                    `}
                  >
                    <div
                      className={`w-5 h-5 rounded-full shrink-0 shadow-sm transition-transform ${isActive ? 'scale-110' : ''}`}
                      style={{ backgroundColor: preset.swatch }}
                    />
                    <span className="text-xs font-medium text-foreground/80 truncate">{t(`accent.${key}`)}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Session type colors */}
      <div className="glass-card rounded-lg p-4 space-y-4">
        <h3 className="font-display font-semibold text-sm">{t('settings.sessionColors')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.tapToChange')}</p>
        <div className="space-y-3">
          {allSessionTypes.map((type) => {
            const colors = getActivityColors(type, settings.darkMode);
            return (
              <div key={type} className="flex items-center gap-3">
                <Popover open={editingType === type} onOpenChange={(open) => setEditingType(open ? type : null)}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <ActivityIcon
                        type={type}
                        className="w-6 h-6"
                        colorOverride={!settings.darkMode ? colors.text : undefined}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" side="right" align="start">
                    <p className="text-xs font-semibold mb-2">{t(`activity.${type}`)} – {t('settings.chooseColor')}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PRESETS.map((preset, idx) => {
                        const previewColors = settings.darkMode ? preset.dark : preset.light;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              (activityColorMap as any)[type] = { light: preset.light, dark: preset.dark };
                              updateSettings({
                                sessionTypeColors: {
                                  ...settings.sessionTypeColors,
                                  [type]: preset.light.bg,
                                },
                              });
                              setEditingType(null);
                            }}
                            className="w-12 h-12 rounded-lg flex items-center justify-center hover:scale-110 transition-transform border border-border/50"
                            style={{ backgroundColor: previewColors.bg }}
                            title={t(preset.labelKey)}
                          >
                            <ActivityIcon
                              type={type}
                              className="w-6 h-6"
                              colorOverride={!settings.darkMode ? previewColors.text : undefined}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <Label className="text-sm">{t(`activity.${type}`)}</Label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences section */}
      <div className="glass-card rounded-lg p-4 space-y-5">
        <h3 className="font-display font-semibold text-sm">{t('settings.preferences')}</h3>

        {/* First day of week */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t('settings.firstDayOfWeek')}</Label>
          <Select
            value={settings.firstDayOfWeek}
            onValueChange={(v) => updateSettings({ firstDayOfWeek: v as 'monday' | 'sunday' })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">{t('settings.monday')}</SelectItem>
              <SelectItem value="sunday">{t('settings.sunday')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Units */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t('settings.units')}</Label>
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
          <Label className="text-sm">{t('settings.defaultSessionType')}</Label>
          <Select
            value={settings.defaultSessionType}
            onValueChange={(v) => updateSettings({ defaultSessionType: v as any })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allSessionTypes.map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {t(`activity.${tp}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card rounded-lg p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-destructive">{t('settings.dangerZone')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.deleteAllDataDesc')}</p>
        <button
          onClick={handleClearData}
          className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
        >
          {t('settings.deleteAllData')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
