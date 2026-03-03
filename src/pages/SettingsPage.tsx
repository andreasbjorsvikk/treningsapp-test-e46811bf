import { useState, useEffect, useRef } from 'react';
import { useSettings, AppColorTheme, AccentColor } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';
import { Moon, Globe, LogOut, LogIn, User, ChevronRight, ChevronLeft, Palette, Settings2, Shield, Camera, Trash2, RefreshCw, Loader2, Check, Pencil, Dumbbell, Lock } from 'lucide-react';
import { getActivityColors, activityColorMap } from '@/utils/activityColors';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AvatarCropper from '@/components/AvatarCropper';
import { stravaService } from '@/services/stravaService';
import { toast } from 'sonner';

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

type SettingsView = 'main' | 'appearance' | 'preferences' | 'training' | 'data' | 'account' | 'sync' | 'privacy';

const SettingsPage = () => {
  const { settings, updateSettings, appThemes, accentPresets, getTypeColor } = useSettings();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<SettingsView>('main');
  const [editingType, setEditingType] = useState<SessionType | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  // Check Strava connection on mount & after callback
  useEffect(() => {
    if (!user) return;
    if (searchParams.get('strava') === 'connected') {
      toast.success(t('settings.stravaConnected'));
      setView('sync');
    }
    stravaService.getStatus().then(s => setStravaConnected(s.connected)).catch(() => {});
  }, [user]);
  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  const handleSaveUsername = async () => {
    if (!user) return;
    setUsernameLoading(true);
    await supabase.from('profiles').update({ username }).eq('id', user.id);
    setUsernameLoading(false);
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 2000);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCropFile(file);
    setShowCropper(true);
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setShowCropper(false);
    setCropFile(null);
    setCropUrl(null);
    setUploading(true);
    const path = `${user.id}/avatar.png`;
    const file = new File([blob], 'avatar.png', { type: 'image/png' });
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
    }
    setUploading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleClearData = () => {
    if (confirm(t('settings.deleteAllDataConfirm'))) {
      localStorage.removeItem('treningslogg_sessions');
      localStorage.removeItem('treningslogg_goals');
      window.location.reload();
    }
  };

  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, extra?: React.ReactNode) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {extra || <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
    </button>
  );

  const sectionHeader = (title: string) => (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-1">{title}</h3>
  );

  const backButton = (title: string) => (
    <button
      onClick={() => setView('main')}
      className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="font-medium">{title}</span>
    </button>
  );

  // ========== APPEARANCE VIEW ==========
  if (view === 'appearance') {
    return (
      <div className="space-y-4">
        {backButton(t('settings.appearance'))}

        {/* Color theme */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold">{t('settings.colorTheme')}</Label>
          <div className="flex gap-3 flex-wrap">
            {(Object.entries(appThemes) as [AppColorTheme, typeof appThemes[AppColorTheme]][]).map(
              ([key, theme]) => {
                const previewColor = settings.darkMode ? theme.swatchDark : theme.swatch;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ colorTheme: key })}
                    className={`
                      w-10 h-10 rounded-full transition-all border-2
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
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t('settings.accentColor')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors">
                  <div
                    className="w-6 h-6 rounded-full shadow-sm ring-2 ring-foreground/20"
                    style={{ backgroundColor: accentPresets[settings.accentColor]?.swatch }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">{t(`accent.${settings.accentColor}`)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(accentPresets) as [AccentColor, typeof accentPresets[AccentColor]][]).map(
                    ([key, preset]) => {
                      const isActive = settings.accentColor === key;
                      return (
                        <button
                          key={key}
                          onClick={() => updateSettings({ accentColor: key })}
                          className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-foreground/5 transition-all"
                          title={t(`accent.${key}`)}
                        >
                          <div
                            className={`w-7 h-7 rounded-full shadow-sm transition-transform ${isActive ? 'scale-110 ring-2 ring-foreground/40' : ''}`}
                            style={{ backgroundColor: preset.swatch }}
                          />
                          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{t(`accent.${key}`)}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Session type colors */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold">{t('settings.sessionColors')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.tapToChange')}</p>
          <div className="grid grid-cols-2 gap-2">
            {allSessionTypes.map((type) => {
              const colors = getActivityColors(type, settings.darkMode);
              return (
                <Popover key={type} open={editingType === type} onOpenChange={(open) => setEditingType(open ? type : null)}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-foreground/5 transition-all"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <ActivityIcon type={type} className="w-5 h-5" colorOverride={!settings.darkMode ? colors.text : undefined} />
                      </div>
                      <span className="text-sm truncate">{t(`activity.${type}`)}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" side="bottom" align="center" collisionPadding={16}>
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
                                sessionTypeColors: { ...settings.sessionTypeColors, [type]: preset.light.bg },
                              });
                              setEditingType(null);
                            }}
                            className="w-12 h-12 rounded-lg flex items-center justify-center hover:scale-110 transition-transform border border-border/50"
                            style={{ backgroundColor: previewColors.bg }}
                            title={t(preset.labelKey)}
                          >
                            <ActivityIcon type={type} className="w-6 h-6" colorOverride={!settings.darkMode ? previewColors.text : undefined} />
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== PREFERENCES VIEW ==========
  if (view === 'preferences') {
    return (
      <div className="space-y-4">
        {backButton(t('settings.preferences'))}

        <div className="glass-card rounded-xl p-4 space-y-5">
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
      </div>
    );
  }

  // ========== TRAINING VIEW ==========
  if (view === 'training') {
    const disabledTypes = settings.disabledSessionTypes || [];
    return (
      <div className="space-y-4">
        {backButton(t('settings.training'))}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold">{t('settings.activeSessionTypes')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.activeSessionTypesDesc')}</p>
          <div className="space-y-1">
            {allSessionTypes.filter(tp => tp !== 'annet').map(tp => {
              const colors = getActivityColors(tp, settings.darkMode);
              const isActive = !disabledTypes.includes(tp);
              return (
                <div key={tp} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colors.bg, opacity: isActive ? 1 : 0.4 }}
                  >
                    <ActivityIcon type={tp} className="w-5 h-5" colorOverride={!settings.darkMode ? colors.text : undefined} />
                  </div>
                  <span className={`flex-1 text-sm font-medium ${!isActive ? 'text-muted-foreground' : ''}`}>{t(`activity.${tp}`)}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      const current = [...(settings.disabledSessionTypes || [])];
                      if (checked) {
                        updateSettings({ disabledSessionTypes: current.filter(x => x !== tp) });
                      } else {
                        updateSettings({ disabledSessionTypes: [...current, tp] });
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== PRIVACY VIEW ==========
  if (view === 'privacy') {
    const privacyOptions = [
      { key: 'privacyWorkouts' as const, label: 'Treningsøkter', desc: 'Hvem kan se øktene dine i profilen din?' },
      { key: 'privacyStats' as const, label: 'Statistikk', desc: 'Hvem kan se statistikken din?' },
      { key: 'privacyGoals' as const, label: 'Mål og progresjon', desc: 'Hvem kan se måned- og årsmålet ditt?' },
    ];
    return (
      <div className="space-y-4">
        {backButton('Personvern')}

        <div className="glass-card rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground mb-3">E-postadressen din er alltid skjult for andre.</p>
          {privacyOptions.map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div className="min-w-0 flex-1 pr-4">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Select
                value={settings[opt.key]}
                onValueChange={(v) => updateSettings({ [opt.key]: v })}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Bare meg</SelectItem>
                  <SelectItem value="friends">Venner</SelectItem>
                  <SelectItem value="selected">Valgte venner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== DATA VIEW ==========
  if (view === 'data') {
    return (
      <div className="space-y-4">
        {backButton(t('settings.dangerZone'))}

        <div className="glass-card rounded-xl p-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t('settings.deleteAllDataDesc')}</p>
          <Button variant="destructive" onClick={handleClearData} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('settings.deleteAllData')}
          </Button>
        </div>
      </div>
    );
  }

  // ========== SYNC VIEW ==========
  if (view === 'sync') {
    const handleStravaConnect = async () => {
      setStravaLoading(true);
      try {
        const url = await stravaService.getAuthUrl();
        window.location.href = url;
      } catch (err) {
        toast.error('Kunne ikke koble til Strava');
        setStravaLoading(false);
      }
    };

    const handleStravaDisconnect = async () => {
      setStravaLoading(true);
      try {
        await stravaService.disconnect();
        setStravaConnected(false);
        toast.success(t('settings.stravaNotConnected'));
      } catch {
        toast.error('Kunne ikke koble fra Strava');
      }
      setStravaLoading(false);
    };

    const handleStravaSync = async () => {
      setStravaSyncing(true);
      try {
        const result = await stravaService.sync();
        const parts: string[] = [];
        if (result.synced > 0) parts.push(`${result.synced} nye`);
        if ((result as any).updated > 0) parts.push(`${(result as any).updated} oppdatert`);
        if (parts.length > 0) {
          toast.success(`${parts.join(', ')} økter fra Strava!`);
        } else {
          toast.info('Alt er allerede oppdatert.');
        }
      } catch {
        toast.error('Synkronisering feilet');
      }
      setStravaSyncing(false);
    };


    const handleStravaSyncAll = async () => {
      setSyncAllLoading(true);
      try {
        const result = await stravaService.syncAll();
        const parts: string[] = [];
        if (result.synced > 0) parts.push(`${result.synced} nye`);
        if ((result as any).updated > 0) parts.push(`${(result as any).updated} oppdatert`);
        if (parts.length > 0) {
          toast.success(`${parts.join(', ')} økter fra Strava!`);
        } else {
          toast.info('Alt er allerede oppdatert.');
        }
      } catch {
        toast.error('Full synkronisering feilet');
      }
      setSyncAllLoading(false);
    };

    const handleStravaDeleteAll = async () => {
      if (!confirm('Er du sikker på at du vil slette alle økter importert fra Strava? Dette kan ikke angres.')) return;
      try {
        const headers: Record<string, string> = {};
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/strava?action=delete-all`, {
          method: 'POST', headers,
        });
        if (!res.ok) throw new Error();
        const result = await res.json();
        toast.success(`${result.deleted} Strava-økter slettet.`);
      } catch {
        toast.error('Sletting feilet');
      }
    };

    return (
      <div className="space-y-4">
        {backButton(t('settings.sync'))}

        <div className="glass-card rounded-xl p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t('settings.syncDesc')}</p>

          {/* Strava */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
            <div className="w-10 h-10 rounded-lg bg-[#FC4C02] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Strava</p>
              <p className="text-xs text-muted-foreground">{t('settings.stravaDesc')}</p>
              {stravaConnected && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('settings.stravaConnected')}
                </p>
              )}
            </div>
            {!stravaConnected ? (
              <Button variant="outline" size="sm" onClick={handleStravaConnect} disabled={stravaLoading || !user} className="shrink-0">
                {stravaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.stravaConnect')}
              </Button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleStravaSync} disabled={stravaSyncing || syncAllLoading}>
                  {stravaSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleStravaDisconnect} disabled={stravaLoading} className="text-destructive hover:text-destructive">
                  {t('settings.stravaDisconnect')}
                </Button>
              </div>
            )}
          </div>

          {/* Sync all history button */}
          {stravaConnected && (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleStravaSyncAll}
                disabled={syncAllLoading || stravaSyncing}
              >
                {syncAllLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Synkroniserer all historikk...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Synkroniser alle tidligere økter fra Strava</>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleStravaDeleteAll}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Slett alle økter importert fra Strava
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== ACCOUNT VIEW ==========
  if (view === 'account' && user) {
    return (
      <div className="space-y-4">
        {backButton(t('settings.account'))}

        <div className="glass-card rounded-xl p-4 space-y-5">
          {/* Avatar & name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : null}
                <AvatarFallback className="text-lg font-bold">
                  {(username || user.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              {avatarUrl && (
                <button
                  onClick={() => { setCropFile(null); setCropUrl(avatarUrl); setShowCropper(true); }}
                  disabled={uploading}
                  className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <AvatarCropper
                open={showCropper}
                imageFile={cropFile}
                imageUrl={cropUrl}
                onConfirm={handleCroppedUpload}
                onCancel={() => { setShowCropper(false); setCropFile(null); setCropUrl(null); }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{username || user.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('settings.username')}</Label>
            <div className="flex gap-2">
              <Input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameSaved(false); }}
                placeholder={t('settings.usernamePlaceholder')}
                className="flex-1"
              />
              <Button size="sm" variant={usernameSaved ? 'ghost' : 'default'} onClick={handleSaveUsername} disabled={usernameLoading || usernameSaved}>
                {usernameSaved ? t('settings.saved') : t('settings.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN MENU ==========
  return (
    <div className="space-y-2">
      {/* Profile header */}
      {user ? (
        <button
          onClick={() => setView('account')}
          className="glass-card rounded-xl p-4 mb-4 w-full text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
              <AvatarFallback className="text-base font-bold">
                {(username || user.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{username || user.email?.split('@')[0]}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          </div>
        </button>
      ) : (
        <div className="glass-card rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{t('settings.notLoggedIn')}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-3" onClick={() => navigate('/login')}>
            <LogIn className="w-4 h-4 mr-2" />
            {t('settings.signIn')}
          </Button>
        </div>
      )}

      {/* Quick toggles */}
      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Moon className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="dark-mode-main" className="flex-1 text-sm font-medium">{t('settings.darkMode')}</Label>
          <Switch
            id="dark-mode-main"
            checked={settings.darkMode}
            onCheckedChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Label className="flex-1 text-sm font-medium">{t('settings.language')}</Label>
          <Select
            value={settings.language}
            onValueChange={(v) => updateSettings({ language: v as 'no' | 'en' })}
          >
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">{t('settings.languageNo')}</SelectItem>
              <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Menu items */}
      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border">
        {menuItem(t('settings.appearance'), <Palette className="w-4 h-4" />, () => setView('appearance'))}
        {menuItem(t('settings.preferences'), <Settings2 className="w-4 h-4" />, () => setView('preferences'))}
        {menuItem(t('settings.training'), <Dumbbell className="w-4 h-4" />, () => setView('training'))}
        {menuItem('Personvern', <Lock className="w-4 h-4" />, () => setView('privacy'))}
        {menuItem(t('settings.sync'), <RefreshCw className="w-4 h-4" />, () => setView('sync'))}
        {menuItem(t('settings.dangerZone'), <Shield className="w-4 h-4" />, () => setView('data'))}
      </div>

      {/* Sign out */}
      {user && (
        <div className="pt-4">
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('settings.signOut')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
