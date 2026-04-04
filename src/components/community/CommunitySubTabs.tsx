import { hapticsService } from '@/services/hapticsService';

interface CommunitySubTabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

const CommunitySubTabs = ({ tabs, active, onChange }: CommunitySubTabsProps) => (
  <div className="relative flex rounded-lg bg-muted p-1 mb-4">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
          active === tab.id
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default CommunitySubTabs;
