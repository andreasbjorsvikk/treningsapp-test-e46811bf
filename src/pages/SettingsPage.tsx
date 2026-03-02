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
import { Moon, Globe, LogOut, LogIn, User, ChevronRight, ChevronLeft, Palette, Settings2, Shield, Camera, Trash2 } from 'lucide-react';
import { getActivityColors, activityColorMap } from '@/utils/activityColors';
import { useNavigate } from 'react-router-dom';

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

type SettingsView = 'main' | 'appearance' | 'preferences' | 'data' | 'account';

const SettingsPage = () => {
  const { settings, updateSettings, appThemes, accentPresets, getTypeColor } = useSettings();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<SettingsView>('main');
  const [editingType, setEditingType] = useState<SessionType | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
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
          <Label className="text-sm font-semibold">{t('settings.accentColor')}</Label>
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

        {/* Session type colors */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold">{t('settings.sessionColors')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.tapToChange')}</p>
          <div className="space-y-2">
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
                        <ActivityIcon type={type} className="w-6 h-6" colorOverride={!settings.darkMode ? colors.text : undefined} />
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
                  <Label className="text-sm">{t(`activity.${type}`)}</Label>
                </div>
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
