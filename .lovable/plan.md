

## Plan: Wire up real Capacitor Haptics in hapticsService

### Will this affect the web version?

**Nei, dette er trygt.** The entire approach uses dynamic `import('@capacitor/haptics')` which only resolves when running inside a Capacitor native shell. The `isNativePlatform()` guard already returns `false` on web, so web users will never hit the Capacitor code paths. Even if the import were reached on web, it would fail gracefully in a try/catch. Zero impact on the web app.

### What's wrong today

The haptics service has the actual Capacitor calls **commented out** (lines 23-24, 32-33, 42). On native iOS it detects the platform correctly but then just logs to console — no real vibration.

Also, `@capacitor/haptics` is **not installed** as a dependency (not in package.json).

### Changes

**1. Install `@capacitor/haptics`** — add to package.json dependencies.

**2. Update `src/services/hapticsService.ts`** — uncomment and activate the real Capacitor Haptics calls:

```
import { isNativePlatform } from '@/utils/capacitor';

const styleMap = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const notifMap = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' };

export const hapticsService = {
  async impact(style = 'medium') {
    if (!isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle[styleMap[style]] });
    } catch (e) { console.warn('[haptics] impact error', e); }
  },
  async notification(type = 'success') {
    if (!isNativePlatform()) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType[notifMap[type]] });
    } catch (e) { console.warn('[haptics] notification error', e); }
  },
  async selectionChanged() {
    if (!isNativePlatform()) return;
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
    } catch (e) { console.warn('[haptics] selectionChanged error', e); }
  },
};
```

Key points:
- Dynamic `import()` so the module is only loaded at runtime on native
- `try/catch` around every call for safety
- Temporary `console.warn` on errors for debugging (user requested debug logs)
- Web remains a complete no-op via `isNativePlatform()` guard
- No UI changes, no layout changes

**3. No other files change.** All existing haptic trigger points (`BottomNav`, `DurationPicker`, `PeriodSelector`, etc.) already call `hapticsService` — they just need the service to actually do something on native.

**After deploying:** user must `git pull`, `npm install`, `npx cap sync`, rebuild in Xcode.

