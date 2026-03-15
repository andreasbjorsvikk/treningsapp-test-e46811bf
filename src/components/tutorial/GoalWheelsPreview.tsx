import GoalProgressVisual from '@/components/GoalProgressVisual';

const GoalWheelsPreview = () => {
  return (
    <div className="grid grid-cols-2 gap-2 py-1">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-3">
        <p className="text-base font-display font-bold text-foreground">Mars</p>
        <div className="h-[88px] w-[88px]">
          <GoalProgressVisual metric="sessions" activityType="løping" percent={59} current={10} target={17} />
        </div>
        <p className="text-[11px] font-semibold text-foreground">10 / 17 økter</p>
        <p className="text-[11px] font-medium text-success">2 økter foran skjema</p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-3">
        <p className="text-base font-display font-bold text-foreground">2026</p>
        <div className="h-[88px] w-[88px]">
          <GoalProgressVisual metric="sessions" activityType="løping" percent={24} current={23} target={186} />
        </div>
        <p className="text-[11px] font-semibold text-foreground">23 / 186 økter</p>
        <p className="text-[11px] font-medium text-success">2 økter foran skjema</p>
      </div>
    </div>
  );
};

export default GoalWheelsPreview;
