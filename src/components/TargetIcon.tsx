/**
 * Custom target/bullseye icon with alternating white/black outer rings
 * and a red center (bullseye).
 */
const TargetIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Outer ring - black */}
    <circle cx="12" cy="12" r="11" fill="hsl(var(--foreground))" />
    {/* Ring 2 - white */}
    <circle cx="12" cy="12" r="9" fill="hsl(var(--background))" />
    {/* Ring 3 - black */}
    <circle cx="12" cy="12" r="7" fill="hsl(var(--foreground))" />
    {/* Ring 4 - white */}
    <circle cx="12" cy="12" r="5" fill="hsl(var(--background))" />
    {/* Bullseye - red */}
    <circle cx="12" cy="12" r="3" fill="hsl(0, 70%, 50%)" />
  </svg>
);

export default TargetIcon;
