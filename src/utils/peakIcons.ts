// ── Icon Bank 1 (legacy PNG variants) ──
import peak0199 from '@/assets/icons/peak-0-199.png';
import peak200399a from '@/assets/icons/peak-200-399.png';
import peak200399b from '@/assets/icons/peak-200-399-b.png';
import peak400699a from '@/assets/icons/peak-400-699.png';
import peak400699b from '@/assets/icons/peak-400-699-b.png';
import peak700999a from '@/assets/icons/peak-700-999.png';
import peak700999b from '@/assets/icons/peak-700-999-b.png';
import peak1000a from '@/assets/icons/peak-1000.png';
import peak1000b from '@/assets/icons/peak-1000-b.png';

// ── Icon Bank 2 (current PNGs – single icon per tier, unchecked) ──
import tierLow from '@/assets/icons/peak-tier-low.png';
import tierMedium from '@/assets/icons/peak-tier-medium.png';
import tierHigh from '@/assets/icons/peak-tier-high.png';
import tierVeryHigh from '@/assets/icons/peak-tier-veryhigh.png';

// ── Checked-in SVG icons (white, no fill) ──
import checkedLow from '@/assets/icons/peak-checked-low.svg';
import checkedMedium from '@/assets/icons/peak-checked-medium.svg';
import checkedHigh from '@/assets/icons/peak-checked-high.svg';
import checkedVeryHigh from '@/assets/icons/peak-checked-veryhigh.svg';

// Seeded random based on peak id/name for consistent icon per peak
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick(variants: string[], seed: string): string {
  return variants[hashStr(seed) % variants.length];
}

// ── Icon Bank 1 (legacy) ──
export function getPeakIconBank1(elevationMoh: number, seed: string = ''): string {
  if (elevationMoh >= 1000) return pick([peak1000a, peak1000b], seed);
  if (elevationMoh >= 700) return pick([peak700999a, peak700999b], seed);
  if (elevationMoh >= 400) return pick([peak400699a, peak400699b], seed);
  if (elevationMoh >= 200) return pick([peak200399a, peak200399b], seed);
  return peak0199;
}

// ── Icon Bank 2 (unchecked – colored PNGs) ──
export function getPeakIcon(elevationMoh: number, _seed: string = ''): string {
  if (elevationMoh >= 1000) return tierVeryHigh;
  if (elevationMoh >= 650) return tierHigh;
  if (elevationMoh >= 300) return tierMedium;
  return tierLow;
}

// ── Checked-in icons (white SVGs) ──
export function getCheckedPeakIcon(elevationMoh: number): string {
  if (elevationMoh >= 1000) return checkedVeryHigh;
  if (elevationMoh >= 650) return checkedHigh;
  if (elevationMoh >= 300) return checkedMedium;
  return checkedLow;
}

// Representative icons for each tier (for tutorials, legends, etc.)
export const peakIconTiers = {
  low: tierLow,
  medium: tierMedium,
  high: tierHigh,
  veryHigh: tierVeryHigh,
};
