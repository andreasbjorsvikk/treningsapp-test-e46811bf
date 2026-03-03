import { Bell } from 'lucide-react';

interface NotificationBellProps {
  onClick: () => void;
  count?: number;
}

const NotificationBell = ({ onClick, count = 0 }: NotificationBellProps) => {
  return (
    <button onClick={onClick} className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors">
      <Bell className="w-5 h-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
