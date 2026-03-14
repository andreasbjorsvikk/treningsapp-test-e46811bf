import peak0199 from '@/assets/icons/peak-0-199.png';
import peak200399a from '@/assets/icons/peak-200-399.png';
import peak200399b from '@/assets/icons/peak-200-399-b.png';
import peak400699a from '@/assets/icons/peak-400-699.png';
import peak400699b from '@/assets/icons/peak-400-699-b.png';
import peak700999a from '@/assets/icons/peak-700-999.png';
import peak700999b from '@/assets/icons/peak-700-999-b.png';
import peak1000a from '@/assets/icons/peak-1000.png';
import peak1000b from '@/assets/icons/peak-1000-b.png';

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

/**
 * Returns a peak icon based on elevation. For ranges with two variants,
 * uses a hash of `seed` (peak id or name) for deterministic selection.
 */
export function getPeakIcon(elevationMoh: number, seed: string = ''): string {
  if (elevationMoh >= 1000) return pick([peak1000a, peak1000b], seed);
  if (elevationMoh >= 700) return pick([peak700999a, peak700999b], seed);
  if (elevationMoh >= 400) return pick([peak400699a, peak400699b], seed);
  if (elevationMoh >= 200) return pick([peak200399a, peak200399b], seed);
  return peak0199;
}

// Representative icons for each tier (for tutorials, legends, etc.)
export const peakIconTiers = {
  low: peak0199,
  medium: peak200399a,
  high: peak700999a,
  veryHigh: peak1000a,
};
