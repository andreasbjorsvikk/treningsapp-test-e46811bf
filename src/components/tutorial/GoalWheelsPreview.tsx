import ProgressWheel from '@/components/ProgressWheel';

const GoalWheelsPreview = () => {
  return (
    <div className="grid grid-cols-2 gap-2 py-1">
      <ProgressWheel
        compact
        title="Mars"
        percent={(11 / 15) * 100}
        current={11}
        target={15}
        unit="økter"
        hasGoal
        expectedFraction={0.6}
        paceDiff={2}
        showPaceLabel
        disableAchievement
      />
      <ProgressWheel
        compact
        title="2026"
        percent={(38 / 180) * 100}
        current={38}
        target={180}
        unit="økter"
        hasGoal
        expectedFraction={0.2}
        paceDiff={2}
        showPaceLabel
        disableAchievement
      />
    </div>
  );
};

export default GoalWheelsPreview;
