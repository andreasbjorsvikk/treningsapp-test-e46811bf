import GoalProgressVisual from '@/components/GoalProgressVisual';

const GoalWheelsPreview = () => {
  return (
    <div className="grid grid-cols-2 gap-3 py-1">
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Måned</p>
        <div className="w-16 h-16">
          <GoalProgressVisual metric="sessions" activityType="løping" percent={60} current={9} target={15} />
        </div>
        <p className="text-[11px] font-medium text-foreground">9 av 15 økter</p>
        <p className="text-[10px] font-medium text-success">Litt foran skjema</p>
      </div>

      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">År</p>
        <div className="w-16 h-16">
          <GoalProgressVisual metric="sessions" activityType="løping" percent={25} current={45} target={180} />
        </div>
        <p className="text-[11px] font-medium text-foreground">45 av 180 økter</p>
        <p className="text-[10px] font-medium text-success">Litt foran skjema</p>
      </div>
    </div>
  );
};

export default GoalWheelsPreview;
