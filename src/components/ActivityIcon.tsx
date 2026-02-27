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
}

const ActivityIcon = ({ type, className = 'w-4 h-4' }: ActivityIconProps) => {
  const src = iconMap[type];
  if (!src) {
    return <CircleDot className={className} />;
  }
  return (
    <img
      src={src}
      alt={type}
      className={className}
      style={{ filter: 'brightness(0) invert(1)' }}
      draggable={false}
    />
  );
};

export default ActivityIcon;
