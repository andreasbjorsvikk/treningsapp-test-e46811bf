

## Plan

### 1. Fix SVG icons not showing on iPhone (svømming, løping, gå)
**Root cause:** Filenames with Norwegian special characters (ø, å) break `mask-image: url(...)` on iOS Safari. Tennis works because its filename has no special chars.

**Fix:** Rename the 3 problematic SVG files to ASCII-only names:
- `svømming.svg` → `svomming.svg`
- `løping.svg` → `loping.svg`
- `gå.svg` → `ga.svg`

Update imports in `src/components/ActivityIcon.tsx` accordingly.

### 2. Progress wheel: bigger titles, centered between top and wheel
In `src/components/ProgressWheel.tsx`:
- Change title from `text-base` to `text-lg` or `text-xl`
- Add more bottom margin (`mb-3`) to push it midway between card top and wheel

### 3. Styrke SVG: shift slightly up and right
Adjust `viewBox` in `src/assets/icons/styrke.svg` from `"15 30 190 55"` to approximately `"13 32 190 55"` (decrease minX → content shifts right, increase minY → content shifts up).

### 4. Bigger SVG icons in SessionCard, Settings, and history badges
- **SessionCard:** Increase icon from `w-4 h-4` to `w-5 h-5` (badge stays same size)
- **Settings (økt-farger):** Increase icon from `w-5 h-5` to `w-6 h-6` in the badge buttons
- **Settings color picker popover icons:** Already `w-6 h-6`, keep as-is

### 5. Calendar: more subtle current month marker
Replace the current `bg-primary/10 border border-primary/30` with a softer approach — e.g., a subtle left border accent or a gentle gradient background instead of a full border. Something like a `border-l-4 border-primary/40` on the month header with no full outline.

### Files to create/modify:
- **Create:** `src/assets/icons/svomming.svg`, `src/assets/icons/loping.svg`, `src/assets/icons/ga.svg` (renamed copies)
- **Delete/replace:** Remove old Norwegian-named imports
- **Modify:** `ActivityIcon.tsx`, `ProgressWheel.tsx`, `styrke.svg`, `SessionCard.tsx`, `SettingsPage.tsx`, `CalendarPage.tsx`

