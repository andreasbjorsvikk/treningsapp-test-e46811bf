import { useState, useEffect, useRef } from 'react';
import SettingsTutorialDialog, { SETTINGS_TUTORIAL_KEY } from '@/components/SettingsTutorialDialog';
import { useSettings, AppColorTheme, AccentColor, PrivacyLevel } from '@/contexts/SettingsContext';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';
import { Moon, Globe, LogOut, LogIn, User, ChevronRight, ChevronLeft, Palette, Settings2, Shield, Camera, Trash2, RefreshCw, Loader2, Check, Pencil, Dumbbell, Lock, HelpCircle, Target, BarChart3, Calendar, Users, Zap, ShieldCheck, Download, Mountain } from 'lucide-react';
import { getActivityColors, activityColorMap, saveActivityColors } from '@/utils/activityColors';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AvatarCropper from '@/components/AvatarCropper';
import ChildProfilesSection from '@/components/ChildProfilesSection';
import { stravaService } from '@/services/stravaService';
import { toast } from 'sonner';
import { getFriends, Friend } from '@/services/communityService';
import { useAdmin } from '@/hooks/useAdmin';

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
  { labelKey: 'color.indigo', light: { bg: 'rgb(200,205,245)', text: 'rgb(50,40,140)', badge: 'rgb(218,222,252)' }, dark: { bg: 'rgb(85,80,165)', text: '#ffffff', badge: '#251e55' } },
  { labelKey: 'color.coral', light: { bg: 'rgb(255,205,195)', text: 'rgb(160,50,30)', badge: 'rgb(255,222,215)' }, dark: { bg: 'rgb(195,95,70)', text: '#ffffff', badge: '#5a1a10' } },
  { labelKey: 'color.teal', light: { bg: 'rgb(190,235,235)', text: 'rgb(15,95,100)', badge: 'rgb(210,245,245)' }, dark: { bg: 'rgb(35,140,145)', text: '#ffffff', badge: '#0a3538' } },
  { labelKey: 'color.lavender', light: { bg: 'rgb(220,215,250)', text: 'rgb(75,55,145)', badge: 'rgb(232,228,255)' }, dark: { bg: 'rgb(110,95,175)', text: '#ffffff', badge: '#2a1f55' } },
];

type SettingsView = 'main' | 'appearance' | 'preferences' | 'training' | 'data' | 'account' | 'sync' | 'privacy' | 'profile' | 'help';

const SettingsPage = () => {
  const { settings, updateSettings, appThemes, accentPresets, getTypeColor } = useSettings();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isAdmin, adminMode, setAdminMode } = useAdmin();
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
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [selectedPrivacyKey, setSelectedPrivacyKey] = useState<string | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [realFriends, setRealFriends] = useState<Friend[]>([]);
  const [gdprSubView, setGdprSubView] = useState<'main' | 'deleteData' | 'deleteAccount' | 'downloadData'>('main');
  const [helpOpenSections, setHelpOpenSections] = useState<Set<string>>(new Set());
  const [showSettingsTutorial, setShowSettingsTutorial] = useState(false);

  // Child privacy options
  const [hasChildren, setHasChildren] = useState(false);
  const [childPrivacyProfile, setChildPrivacyProfile] = useState('friends');
  const [childPrivacyCheckins, setChildPrivacyCheckins] = useState('friends');
  const [childrenCount, setChildrenCount] = useState(0);

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
    supabase.from('profiles').select('username, avatar_url, privacy_workouts, privacy_stats, privacy_goals, privacy_peak_checkins, privacy_workouts_friends, privacy_stats_friends, privacy_goals_friends, privacy_peak_checkins_friends').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        // Load privacy settings from DB
        const privacyPatch: Record<string, any> = {};
        if (data?.privacy_workouts) privacyPatch.privacyWorkouts = data.privacy_workouts;
        if (data?.privacy_stats) privacyPatch.privacyStats = data.privacy_stats;
        if (data?.privacy_goals) privacyPatch.privacyGoals = data.privacy_goals;
        if (data?.privacy_peak_checkins) privacyPatch.privacyPeakCheckins = data.privacy_peak_checkins;
        if (data?.privacy_workouts_friends) privacyPatch.privacyWorkoutsFriends = data.privacy_workouts_friends;
        if (data?.privacy_stats_friends) privacyPatch.privacyStatsFriends = data.privacy_stats_friends;
        if (data?.privacy_goals_friends) privacyPatch.privacyGoalsFriends = data.privacy_goals_friends;
        if (data?.privacy_peak_checkins_friends) privacyPatch.privacyPeakCheckinsFriends = data.privacy_peak_checkins_friends;
        if (Object.keys(privacyPatch).length > 0) updateSettings(privacyPatch);
      });
  }, [user]);
  
  // Load real friends for privacy settings
  useEffect(() => {
    if (!user) return;
    getFriends().then(setRealFriends).catch(() => {});
  }, [user]);

  // Listen for navigate-to-profile event
  useEffect(() => {
    const handler = () => {
      setView('profile');
      // Show tutorial on first visit
      const done = localStorage.getItem(SETTINGS_TUTORIAL_KEY);
      if (!done) {
        setTimeout(() => setShowSettingsTutorial(true), 400);
      }
    };
    window.addEventListener('navigate-to-profile', handler);
    return () => window.removeEventListener('navigate-to-profile', handler);
  }, []);

  // Load child profiles for privacy
  useEffect(() => {
    if (!user) return;
    supabase.from('child_profiles').select('id').eq('parent_user_id', user.id).then(({ data }) => {
      setHasChildren((data || []).length > 0);
      setChildrenCount((data || []).length);
    });
    supabase.from('profiles').select('privacy_child_profile, privacy_child_checkins').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setChildPrivacyProfile((data as any).privacy_child_profile || 'friends');
        setChildPrivacyCheckins((data as any).privacy_child_checkins || 'friends');
      }
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

  const handleClearData = async () => {
    if (user) {
      try {
        await Promise.all([
          supabase.from('workout_sessions').delete().eq('user_id', user.id),
          supabase.from('workout_streams').delete().eq('user_id', user.id),
          supabase.from('goals').delete().eq('user_id', user.id),
          supabase.from('primary_goal_periods').delete().eq('user_id', user.id),
          supabase.from('health_events').delete().eq('user_id', user.id),
          supabase.from('peak_checkins').delete().eq('user_id', user.id),
        ]);
        toast.success(t('gdpr.dataDeleted'));
      } catch (err) {
        console.error('Failed to delete data:', err);
        toast.error(t('gdpr.deleteFailed'));
        return;
      }
    }
    localStorage.clear();
    window.location.reload();
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
      onClick={() => { setView('main'); setGdprSubView('main'); }}
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
                              saveActivityColors();
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
      { key: 'privacyWorkouts' as const, label: t('privacy.workouts'), desc: t('privacy.workoutsDesc') },
      { key: 'privacyStats' as const, label: t('privacy.stats'), desc: t('privacy.statsDesc') },
      { key: 'privacyGoals' as const, label: t('privacy.goals'), desc: t('privacy.goalsDesc') },
      { key: 'privacyPeakCheckins' as const, label: 'Fjelltopp-innsjekkinger', desc: 'Hvem kan se dine innsjekkinger på fjelltopper' },
    ];

    const friends = realFriends;
    return (
      <div className="space-y-4">
        {backButton(t('privacy.title'))}

        <div className="glass-card rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground mb-3">{t('privacy.emailHidden')}</p>
          {privacyOptions.map(opt => {
            const selectedFriendsForKey = (settings as any)[`${opt.key}Friends`] as string[] | undefined;
            const friendNames = selectedFriendsForKey?.length
              ? friends.filter(f => selectedFriendsForKey.includes(f.id)).map(f => f.username).join(' og ')
              : null;
            return (
            <div key={opt.key} className="py-3 border-b border-border/50 last:border-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                <Select
                  value={settings[opt.key]}
                  onValueChange={(v) => {
                    updateSettings({ [opt.key]: v });
                    // Persist to DB
                    if (user) {
                      const dbCol = opt.key === 'privacyWorkouts' ? 'privacy_workouts'
                        : opt.key === 'privacyStats' ? 'privacy_stats'
                        : opt.key === 'privacyGoals' ? 'privacy_goals'
                        : 'privacy_peak_checkins';
                      supabase.from('profiles').update({ [dbCol]: v } as any).eq('id', user.id).then(() => {});
                    }
                    if (v === 'selected') {
                      setTimeout(() => {
                        setSelectedPrivacyKey(opt.key);
                        setSelectedFriendIds((settings as any)[`${opt.key}Friends`] || []);
                        setShowFriendPicker(true);
                      }, 100);
                    }
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="me">{t('privacy.onlyMe')}</SelectItem>
                     <SelectItem value="friends">{t('privacy.friends')}</SelectItem>
                     <SelectItem value="all">Alle</SelectItem>
                     <SelectItem value="selected">{t('privacy.selectedFriends')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settings[opt.key] === 'selected' && friendNames && (
                <p className="text-xs text-muted-foreground mt-1 text-right">{friendNames} {t('privacy.canSeeThis')}</p>
              )}
            </div>
            );
          })}
        </div>

        {/* Child privacy - only if user has children */}
        {hasChildren && (
          <div className="glass-card rounded-xl p-4 space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Barn</h4>
            {[
              { key: 'privacy_child_profile', label: childrenCount > 1 ? 'Mine barns profiler' : 'Mitt barns profil', value: childPrivacyProfile, setter: setChildPrivacyProfile },
              { key: 'privacy_child_checkins', label: childrenCount > 1 ? 'Mine barns fjelltopp-innsjekkinger' : 'Mitt barns fjelltopp-innsjekkinger', value: childPrivacyCheckins, setter: setChildPrivacyCheckins },
            ].map(opt => (
              <div key={opt.key} className="py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium">{opt.label}</p>
                  </div>
                  <Select
                    value={opt.value}
                    onValueChange={(v) => {
                      opt.setter(v);
                      if (user) {
                        supabase.from('profiles').update({ [opt.key]: v } as any).eq('id', user.id).then(() => {});
                      }
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">{t('privacy.onlyMe')}</SelectItem>
                      <SelectItem value="friends">{t('privacy.friends')}</SelectItem>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="selected">{t('privacy.selectedFriends')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showFriendPicker} onOpenChange={setShowFriendPicker}>
          <DialogContent className="max-w-[min(calc(100vw-2rem),22rem)]">
            <DialogHeader>
              <DialogTitle>{t('privacy.selectFriends')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {friends.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selectedFriendIds.includes(u.id)}
                    onCheckedChange={(checked) => {
                      setSelectedFriendIds(prev =>
                        checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                      );
                    }}
                  />
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium">{(u.username || '?')[0]}</span>
                  </div>
                  <span className="text-sm font-medium">{u.username || t('common.unknown')}</span>
                </label>
              ))}
            </div>
            <Button onClick={() => {
              if (selectedPrivacyKey) {
                updateSettings({ [`${selectedPrivacyKey}Friends`]: selectedFriendIds } as any);
                // Persist selected friends to DB
                if (user) {
                  const dbCol = selectedPrivacyKey === 'privacyWorkouts' ? 'privacy_workouts_friends'
                    : selectedPrivacyKey === 'privacyStats' ? 'privacy_stats_friends'
                    : selectedPrivacyKey === 'privacyGoals' ? 'privacy_goals_friends'
                    : 'privacy_peak_checkins_friends';
                  supabase.from('profiles').update({ [dbCol]: selectedFriendIds } as any).eq('id', user.id).then(() => {});
                }
              }
              setShowFriendPicker(false);
               toast.success(t('privacy.friendsUpdated'));
             }} className="w-full">
               {t('common.done')}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ========== GDPR VIEW ==========
  if (view === 'data') {
    
    const handleDeleteAccount = async () => {
      if (!user) return;
      try {
        // Delete all user data first
        await Promise.all([
          supabase.from('workout_sessions').delete().eq('user_id', user.id),
          supabase.from('workout_streams').delete().eq('user_id', user.id),
          supabase.from('goals').delete().eq('user_id', user.id),
          supabase.from('primary_goal_periods').delete().eq('user_id', user.id),
          supabase.from('health_events').delete().eq('user_id', user.id),
          supabase.from('peak_checkins').delete().eq('user_id', user.id),
          supabase.from('challenge_participants').delete().eq('user_id', user.id),
          supabase.from('community_notifications').delete().eq('user_id', user.id),
          supabase.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
          supabase.from('strava_connections').delete().eq('user_id', user.id),
          supabase.from('user_roles').delete().eq('user_id', user.id),
          supabase.from('profiles').delete().eq('id', user.id),
        ]);
        localStorage.clear();
        await signOut();
        navigate('/login');
        toast.success(t('gdpr.accountDeleted'));
      } catch (err) {
        console.error('Failed to delete account:', err);
        toast.error(t('gdpr.deleteFailed'));
      }
    };

    const handleDownloadData = async () => {
      if (!user) return;
      try {
        const [sessions, goals, primaryGoals, healthEvents, peakCheckins] = await Promise.all([
          supabase.from('workout_sessions').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
          supabase.from('primary_goal_periods').select('*').eq('user_id', user.id),
          supabase.from('health_events').select('*').eq('user_id', user.id),
          supabase.from('peak_checkins').select('*').eq('user_id', user.id),
        ]);
        const data = {
          exported_at: new Date().toISOString(),
          user_id: user.id,
          email: user.email,
          workout_sessions: sessions.data || [],
          goals: goals.data || [],
          primary_goal_periods: primaryGoals.data || [],
          health_events: healthEvents.data || [],
          peak_checkins: peakCheckins.data || [],
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `treningslogg-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('gdpr.downloadStarted'));
      } catch (err) {
        console.error('Failed to download data:', err);
        toast.error(t('gdpr.downloadFailed'));
      }
    };

    if (gdprSubView === 'deleteData') {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setGdprSubView('main')}
            className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">{t('gdpr.deleteData')}</span>
          </button>
          <div className="glass-card rounded-xl p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{t('gdpr.deleteDataDesc')}</p>
            <Button variant="destructive" className="w-full" onClick={() => {
              if (confirm(t('gdpr.deleteDataConfirm'))) {
                handleClearData();
              }
            }}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('gdpr.deleteAllData')}
            </Button>
          </div>
        </div>
      );
    }

    if (gdprSubView === 'deleteAccount') {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setGdprSubView('main')}
            className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">{t('gdpr.deleteAccount')}</span>
          </button>
          <div className="glass-card rounded-xl p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{t('gdpr.deleteAccountDesc')}</p>
            <Button variant="destructive" className="w-full" onClick={() => {
              if (confirm(t('gdpr.deleteAccountConfirm'))) {
                handleDeleteAccount();
              }
            }}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('gdpr.deleteMyAccount')}
            </Button>
          </div>
        </div>
      );
    }

    if (gdprSubView === 'downloadData') {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setGdprSubView('main')}
            className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">{t('gdpr.requestData')}</span>
          </button>
          <div className="glass-card rounded-xl p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{t('gdpr.requestDataDesc')}</p>
            <Button variant="outline" className="w-full" onClick={handleDownloadData}>
              <Download className="w-4 h-4 mr-2" />
              {t('gdpr.download')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {backButton(t('settings.gdpr'))}
        <div className="glass-card rounded-xl overflow-hidden divide-y divide-border">
          {menuItem(t('gdpr.deleteData'), <Trash2 className="w-4 h-4" />, () => setGdprSubView('deleteData'))}
          {menuItem(t('gdpr.deleteAccount'), <Trash2 className="w-4 h-4" />, () => setGdprSubView('deleteAccount'))}
          {menuItem(t('gdpr.requestData'), <Download className="w-4 h-4" />, () => setGdprSubView('downloadData'))}
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
        toast.error(t('sync.connectFailed'));
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
        toast.error(t('sync.disconnectFailed'));
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
           toast.success(`${parts.join(', ')} ${t('home.sessions')} Strava!`);
         } else {
           toast.info(t('sync.allUpToDate'));
        }
      } catch {
        toast.error(t('sync.failed'));
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
           toast.success(`${parts.join(', ')} ${t('home.sessions')} Strava!`);
         } else {
           toast.info(t('sync.allUpToDate'));
        }
      } catch {
        toast.error(t('sync.fullSyncFailed'));
      }
      setSyncAllLoading(false);
    };

    const handleStravaDeleteAll = async () => {
      if (!confirm(t('sync.deleteConfirm'))) return;
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
         toast.success(t('sync.deletedCount', { n: result.deleted }));
       } catch {
         toast.error(t('sync.deleteFailed'));
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('sync.syncingAll')}</>
                 ) : (
                   <><RefreshCw className="w-4 h-4 mr-2" /> {t('sync.syncAllPrevious')}</>
                 )}
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleStravaDeleteAll}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t('sync.deleteAllStrava')}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== ACCOUNT VIEW (redirect to profile) ==========
  if (view === 'account' && user) {
    setView('profile');
    return null;
  }

  // ========== PROFILE VIEW ==========
  if (view === 'profile' && user) {
    return (
      <div className="space-y-4">
        {backButton(t('profile.title'))}
        <SettingsTutorialDialog open={showSettingsTutorial} onClose={() => setShowSettingsTutorial(false)} />

        <div className="glass-card rounded-xl p-4 space-y-5">
          {/* Avatar & name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
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

        {/* Child profiles */}
        <ChildProfilesSection />

        {/* Change password */}
        <div className="glass-card rounded-xl p-4 space-y-3">
           <Label className="text-sm font-semibold">{t('profile.changePassword')}</Label>
           <p className="text-xs text-muted-foreground">{t('profile.changePasswordDesc')}</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              if (!user?.email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
               if (error) toast.error(t('profile.emailSendFailed'));
               else toast.success(t('profile.passwordEmailSent'));
            }}
          >
            <Lock className="w-4 h-4 mr-2" /> {t('profile.sendPasswordLink')}
          </Button>
        </div>
      </div>
    );
  }

  // ========== HELP VIEW ==========
  if (view === 'help') {
    const toggleSection = (key: string) => {
      setHelpOpenSections(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    const helpSection = (key: string, icon: React.ReactNode, iconBg: string, title: string, children: React.ReactNode) => (
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
          <span className="flex-1 text-left font-display font-semibold text-sm">{title}</span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${helpOpenSections.has(key) ? 'rotate-90' : ''}`} />
        </button>
        {helpOpenSections.has(key) && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
            {children}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-3">
        {backButton(t('help.title'))}

        {/* Better intro */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">{t('help.welcome')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Trykk på en kategori for å lese mer</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('help.welcomeDesc')}</p>
        </div>

        {/* Treningsmål */}
        {helpSection('goals', <Target className="w-5 h-5 text-[hsl(var(--success))]" />, 'bg-success/10', t('help.trainingGoals'), (
          <>
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-full relative flex items-center justify-center shrink-0">
                  <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" opacity="0.2" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(142, 50%, 48%)" strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28 * 0.75} ${2 * Math.PI * 28 * 0.25}`}
                      transform="rotate(-90 32 32)" />
                  </svg>
                  <span className="text-xs font-bold text-[hsl(var(--success))] relative z-10">75%</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>{t('help.monthYearWheel')}</strong> {t('help.wheelDesc')}</p>
                  <p>{t('help.wheelColors')}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p dangerouslySetInnerHTML={{ __html: t('help.trainingGoalsP1') }} />
              <p dangerouslySetInnerHTML={{ __html: t('help.trainingGoalsP2') }} />
              <p dangerouslySetInnerHTML={{ __html: t('help.trainingGoalsP3') }} />
              <p dangerouslySetInnerHTML={{ __html: t('help.trainingGoalsP4') }} />
            </div>
          </>
        ))}

        {/* Registrere økter */}
        {helpSection('sessions', <Dumbbell className="w-5 h-5 text-accent" />, 'bg-accent/10', t('help.registerSessions'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.registerSessionsP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.registerSessionsP2') }} />
          </div>
        ))}

        {/* Strava */}
        {helpSection('strava', <Zap className="w-5 h-5 text-[hsl(var(--warning))]" />, 'bg-warning/10', t('help.stravaSync'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.stravaSyncP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.stravaSyncP2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.stravaSyncP3') }} />
          </div>
        ))}

        {/* Statistikk */}
        {helpSection('stats', <BarChart3 className="w-5 h-5 text-accent" />, 'bg-accent/10', t('help.statsAndRecords'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.statsAndRecordsP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.statsAndRecordsP2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.statsAndRecordsP3') }} />
          </div>
        ))}

        {/* Kalender */}
        {helpSection('calendar', <Calendar className="w-5 h-5 text-[hsl(var(--success))]" />, 'bg-success/10', t('help.calendar'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.calendarP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.calendarP2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.calendarP3') }} />
          </div>
        ))}

        {/* Fjelltopp-kart */}
        {helpSection('map', <Mountain className="w-5 h-5 text-[hsl(var(--success))]" />, 'bg-success/10', 'Fjelltopp-kart', (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Sjekk inn på fjelltopper du bestiger. Du kan sjekke inn flere ganger på hver topp for å øke scoren din.</p>
            <p>Bytt mellom <strong>2D og 3D-visning</strong>, og ulike kartvisninger som standard, terreng, topografisk og satellitt.</p>
            <p>For å <strong>foreslå en ny topp</strong>, trykk og hold inne på kartet der toppen befinner seg. Om du er i nærheten vil du bli sjekket inn automatisk når toppen godkjennes.</p>
            <p>Under <strong>Topper</strong>-fanen finner du alle tilgjengelige topper, og under <strong>Feed</strong> ser du de siste innsjekkingene.</p>
          </div>
        ))}

        {/* Fellesskap */}
        {helpSection('community', <Users className="w-5 h-5 text-accent" />, 'bg-accent/10', t('help.community'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.communityP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.communityP2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.communityP3') }} />
          </div>
        ))}

        {/* Tilpasning */}
        {helpSection('customization', <Palette className="w-5 h-5 text-[hsl(var(--warning))]" />, 'bg-warning/10', t('help.customization'), (
          <div className="text-sm text-muted-foreground space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('help.customizationP1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.customizationP2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.customizationP3') }} />
            <p dangerouslySetInnerHTML={{ __html: t('help.customizationP4') }} />
          </div>
        ))}
      </div>
    );
  }

  // ========== MAIN MENU ==========
  return (
    <div className="space-y-2">
      {/* Profile header */}
      {user ? (
        <button
          onClick={() => setView('profile')}
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

      {/* Admin section - only for users with admin rights */}
      {isAdmin && (
        <div className="glass-card rounded-xl overflow-hidden divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="admin-mode" className="flex-1 text-sm font-medium">Adminmodus</Label>
            <Switch
              id="admin-mode"
              checked={adminMode}
              onCheckedChange={setAdminMode}
            />
          </div>
          <button
            onClick={() => {
              // Mark as seen
              localStorage.setItem('treningslogg_admin_suggestions_seen', Date.now().toString());
              window.dispatchEvent(new CustomEvent('admin-suggestions-seen'));
              // Navigate to map and open suggestions
              setAdminMode(true);
              window.dispatchEvent(new CustomEvent('navigate-to-map-suggestions'));
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Mountain className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">Fjelltopp-forslag til godkjenning</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border">
        {menuItem(t('settings.appearance'), <Palette className="w-4 h-4" />, () => setView('appearance'))}
        {menuItem(t('settings.preferences'), <Settings2 className="w-4 h-4" />, () => setView('preferences'))}
        {menuItem(t('settings.training'), <Dumbbell className="w-4 h-4" />, () => setView('training'))}
         {menuItem(t('privacy.title'), <Lock className="w-4 h-4" />, () => setView('privacy'))}
         {menuItem(t('settings.sync'), <RefreshCw className="w-4 h-4" />, () => setView('sync'))}
         {menuItem(t('help.title'), <HelpCircle className="w-4 h-4" />, () => setView('help'))}
        {menuItem(t('settings.gdpr'), <Shield className="w-4 h-4" />, () => setView('data'))}
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
