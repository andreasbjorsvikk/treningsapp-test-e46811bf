import { SessionType } from '@/types/workout';
import { CircleDot } from 'lucide-react';

import styrkeIcon from '@/assets/icons/styrke.svg';
import løpingIcon from '@/assets/icons/løping.svg';
import fjellturIcon from '@/assets/icons/fjelltur.svg';
import svømmingIcon from '@/assets/icons/svømming.svg';
import syklingIcon from '@/assets/icons/sykling.svg';
import gåIcon from '@/assets/icons/gå.svg';
import tennisIcon from '@/assets/icons/tennis.svg';
import yogaIcon from '@/assets/icons/yoga.svg';

const iconMap: Record<string, string> = {
  styrke: styrkeIcon,
  løping: løpingIcon,
  fjelltur: fjellturIcon,
  svømming: svømmingIcon,
  sykling: syklingIcon,
  gå: gåIcon,
  tennis: tennisIcon,
  yoga: yogaIcon,
};

interface ActivityIconProps {
  type: SessionType;
  className?: string;
  colorOverride?: string;
  style?: React.CSSProperties;
}

const ActivityIcon = ({ type, className = 'w-4 h-4', colorOverride, style }: ActivityIconProps) => {
  const src = iconMap[type];
  if (!src) {
    return <CircleDot className={className} style={{ color: colorOverride || '#fff', ...style }} />;
  }

  if (colorOverride) {
    // Use mask-image to render SVG in any arbitrary color
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
