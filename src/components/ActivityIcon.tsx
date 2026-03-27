import { SessionType } from '@/types/workout';
import { CircleDot } from 'lucide-react';

import styrkeIcon from '@/assets/icons/styrke.svg';
import lopingIcon from '@/assets/icons/loping.svg';
import fjellturIcon from '@/assets/icons/fjelltur.svg';
import svommingIcon from '@/assets/icons/svomming.svg';
import syklingIcon from '@/assets/icons/sykling.svg';
import gaIcon from '@/assets/icons/ga.svg';
import tennisIcon from '@/assets/icons/tennis.svg';
import yogaIcon from '@/assets/icons/yoga.svg';
import fotballIcon from '@/assets/icons/fotball.svg';
import trappemaskinIcon from '@/assets/icons/trappemaskin.svg';
import roingIcon from '@/assets/icons/roing.svg';
import kajakkIcon from '@/assets/icons/kajakk.svg';
import tredemolleIcon from '@/assets/icons/tredemlle.svg';

const iconMap: Record<string, string> = {
  styrke: styrkeIcon,
  løping: lopingIcon,
  fjelltur: fjellturIcon,
  svømming: svommingIcon,
  sykling: syklingIcon,
  gå: gaIcon,
  tennis: tennisIcon,
  yoga: yogaIcon,
  fotball: fotballIcon,
  trappemaskin: trappemaskinIcon,
  roing: roingIcon,
  kajakk: kajakkIcon,
  tredemølle: tredemolleIcon,
};

// Pre-computed CSS filters for each activity type's light-mode text color.
// Generated from the activityColors text values to avoid mask-image issues on mobile Safari.
// Format: sepia + saturate + hue-rotate + brightness approximation
const colorFilterMap: Record<string, string> = {
  // fjelltur: rgb(47,107,69) — dark green
  fjelltur: 'brightness(0) saturate(100%) invert(35%) sepia(30%) saturate(600%) hue-rotate(100deg) brightness(90%)',
  // sykling: rgb(122,15,15) — dark red
  sykling: 'brightness(0) saturate(100%) invert(15%) sepia(80%) saturate(2000%) hue-rotate(350deg) brightness(80%)',
  // løping: rgb(42,93,168) — blue
  løping: 'brightness(0) saturate(100%) invert(30%) sepia(60%) saturate(800%) hue-rotate(195deg) brightness(90%)',
  // gå: rgb(75,46,31) — brown
  gå: 'brightness(0) saturate(100%) invert(20%) sepia(40%) saturate(800%) hue-rotate(10deg) brightness(80%)',
  // svømming: #3f6fa8 — steel blue
  svømming: 'brightness(0) saturate(100%) invert(35%) sepia(50%) saturate(600%) hue-rotate(190deg) brightness(85%)',
  // styrke: #000000 — black
  styrke: 'brightness(0)',
  // tennis: #734402 — dark orange
  tennis: 'brightness(0) saturate(100%) invert(25%) sepia(70%) saturate(1200%) hue-rotate(25deg) brightness(80%)',
  // yoga: rgb(121,11,150) — purple
  yoga: 'brightness(0) saturate(100%) invert(15%) sepia(80%) saturate(2000%) hue-rotate(270deg) brightness(80%)',
  // fotball: rgb(55,100,40) — green
  fotball: 'brightness(0) saturate(100%) invert(30%) sepia(40%) saturate(700%) hue-rotate(85deg) brightness(85%)',
  // trappemaskin: rgb(140,75,5) — dark amber
  trappemaskin: 'brightness(0) saturate(100%) invert(30%) sepia(70%) saturate(1000%) hue-rotate(20deg) brightness(80%)',
  // roing: rgb(10,100,160) — teal blue
  roing: 'brightness(0) saturate(100%) invert(30%) sepia(60%) saturate(900%) hue-rotate(185deg) brightness(85%)',
  // kajakk: rgb(8,100,120) — dark cyan
  kajakk: 'brightness(0) saturate(100%) invert(30%) sepia(60%) saturate(800%) hue-rotate(165deg) brightness(80%)',
  // tredemølle: rgb(90,30,170) — purple
  tredemølle: 'brightness(0) saturate(100%) invert(20%) sepia(70%) saturate(1500%) hue-rotate(255deg) brightness(80%)',
};

interface ActivityIconProps {
  type: SessionType;
  className?: string;
  /** 
   * Color mode hint: 'white' for white icons (dark bg), 'colored' for activity-colored icons (light bg).
   * If a raw color string is passed, 'white'-ish colors render white, others render colored.
   * Default: white icon.
   */
  colorOverride?: string;
  style?: React.CSSProperties;
}

/**
 * Renders activity icon as an <img> with CSS filter-based coloring.
 * Avoids CSS mask-image which is unreliable on mobile Safari with data URIs.
 */
const ActivityIcon = ({ type, className = 'w-4 h-4', colorOverride, style: styleProp }: ActivityIconProps) => {
  const isSykling = type === 'sykling';
  const isStyrke = type === 'styrke';
  const style = { ...styleProp, ...(isSykling ? { marginTop: '2px' } : {}), ...(isStyrke ? { marginTop: '-2px' } : {}) };
  const src = iconMap[type];
  if (!src) {
    return <CircleDot className={className} style={{ color: colorOverride || '#fff', ...style }} />;
  }

  // Determine filter based on colorOverride
  let filter: string;
  if (!colorOverride || colorOverride === '#ffffff' || colorOverride === '#fff' || colorOverride === 'white') {
    // White icon for dark backgrounds
    filter = 'brightness(0) invert(1)';
  } else {
    // Use pre-computed color filter for the activity type, or fall back to the generic colored approach
    filter = colorFilterMap[type] || 'brightness(0)';
  }

  return (
    <img
      src={src}
      alt={type}
      className={className}
      style={{ filter, ...style }}
      draggable={false}
    />
  );
};

export default ActivityIcon;
