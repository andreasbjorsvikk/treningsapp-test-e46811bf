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
import tredemolleIcon from '@/assets/icons/tredemølle.svg';

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

const ActivityIcon = ({ type, className = 'w-4 h-4', colorOverride, style: styleProp }: ActivityIconProps) => {
  const isSykling = type === 'sykling';
  const isStyrke = type === 'styrke';
  const style = { ...styleProp, ...(isSykling ? { marginTop: '2px' } : {}), ...(isStyrke ? { marginTop: '-2px' } : {}) };
  const src = iconMap[type];
  if (!src) {
    return <CircleDot className={className} style={{ color: colorOverride || '#fff', ...style }} />;
  }

  if (colorOverride) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: colorOverride,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          ...style,
        }}
        aria-label={type}
      />
    );
  }

  return (
    <img
      src={src}
      alt={type}
      className={className}
      style={{ filter: 'brightness(0) invert(1)', ...style }}
      draggable={false}
    />
  );
};

export default ActivityIcon;
