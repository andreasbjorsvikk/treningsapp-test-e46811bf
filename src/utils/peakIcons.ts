// ── New peak icons (PNG, checked/unchecked per tier) ──
import peak1Unchecked from '@/assets/icons/peak-1-unchecked.png';
import peak1Checked from '@/assets/icons/peak-1-checked.png';
import peak2Unchecked from '@/assets/icons/peak-2-unchecked.png';
import peak2Checked from '@/assets/icons/peak-2-checked.png';
import peak3Unchecked from '@/assets/icons/peak-3-unchecked.png';
import peak3Checked from '@/assets/icons/peak-3-checked.png';
import peak4Unchecked from '@/assets/icons/peak-4-unchecked.png';
import peak4Checked from '@/assets/icons/peak-4-checked.png';

// ── Legacy imports (kept for Bank 1 compatibility) ──
import peak0199 from '@/assets/icons/peak-0-199.png';
import peak200399a from '@/assets/icons/peak-200-399.png';
import peak200399b from '@/assets/icons/peak-200-399-b.png';
import peak400699a from '@/assets/icons/peak-400-699.png';
import peak400699b from '@/assets/icons/peak-400-699-b.png';
import peak700999a from '@/assets/icons/peak-700-999.png';
import peak700999b from '@/assets/icons/peak-700-999-b.png';
import peak1000a from '@/assets/icons/peak-1000.png';
import peak1000b from '@/assets/icons/peak-1000-b.png';

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

// ── Main icon function (with checked/unchecked state) ──
export function getPeakIcon(elevationMoh: number, _seed: string = '', checkedIn: boolean = false): string {
  if (elevationMoh >= 1000) return checkedIn ? peak4Checked : peak4Unchecked;
  if (elevationMoh >= 650) return checkedIn ? peak3Checked : peak3Unchecked;
  if (elevationMoh >= 300) return checkedIn ? peak2Checked : peak2Unchecked;
  return checkedIn ? peak1Checked : peak1Unchecked;
}

// Representative icons for each tier (for tutorials, legends, etc.)
export const peakIconTiers = {
  low: peak1Unchecked,
  medium: peak2Unchecked,
  high: peak3Unchecked,
  veryHigh: peak4Unchecked,
};
