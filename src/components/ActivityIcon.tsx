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

interface ActivityIconProps {
  type: SessionType;
  className?: string;
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

  // Always use <img> — more reliable cross-browser than mask-image
  // White icon: brightness(0) makes black, invert(1) flips to white
  // Dark icon: brightness(0) makes black
  const isWhiteish = !colorOverride || isLightColor(colorOverride);
  const filter = isWhiteish
    ? 'brightness(0) invert(1)'
    : 'brightness(0)';

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

/** Quick check if a color string is "light" (should render white icon on it) */
function isLightColor(color: string): boolean {
  // For common cases: white, light colors
  if (!color) return true;
  const c = color.toLowerCase().trim();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  // rgb/rgba - check average brightness
  const rgbMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    return (r + g + b) / 3 > 180;
  }
  // hex
  const hexMatch = c.match(/^#([0-9a-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r + g + b) / 3 > 180;
  }
  return true; // default to white icon
}

export default ActivityIcon;
