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

// ── Icon Bank 2 (current SVGs – single icon per tier) ──
import tierLow from '@/assets/icons/peak-tier-low.svg';
import tierMedium from '@/assets/icons/peak-tier-medium.svg';
import tierHigh from '@/assets/icons/peak-tier-high.svg';
import tierVeryHigh from '@/assets/icons/peak-tier-veryhigh.svg';

// ── Icon Bank 3 (new colored PNG icons with baked-in circle) ──
import lvl1Unchecked from '@/assets/icons/peak-lvl1-unchecked.png';
import lvl1Checked from '@/assets/icons/peak-lvl1-checked.png';
import lvl2Unchecked from '@/assets/icons/peak-lvl2-unchecked.png';
import lvl2Checked from '@/assets/icons/peak-lvl2-checked.png';
import lvl3Unchecked from '@/assets/icons/peak-lvl3-unchecked.png';
import lvl3Checked from '@/assets/icons/peak-lvl3-checked.png';
import lvl4Unchecked from '@/assets/icons/peak-lvl4-unchecked.png';
import lvl4Checked from '@/assets/icons/peak-lvl4-checked.png';

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

// ── Icon Bank 2 (SVG tiers – kept for backward compat) ──
export function getPeakIcon(elevationMoh: number, _seed: string = ''): string {
  if (elevationMoh >= 1000) return tierVeryHigh;
  if (elevationMoh >= 650) return tierHigh;
  if (elevationMoh >= 300) return tierMedium;
  return tierLow;
}

// ── Icon Bank 3 (colored PNG with circle – checked/unchecked) ──
export function getPeakIconColored(elevationMoh: number, checked: boolean): string {
  if (elevationMoh >= 1000) return checked ? lvl4Checked : lvl4Unchecked;
  if (elevationMoh >= 650) return checked ? lvl3Checked : lvl3Unchecked;
  if (elevationMoh >= 300) return checked ? lvl2Checked : lvl2Unchecked;
  return checked ? lvl1Checked : lvl1Unchecked;
}

// Representative icons for each tier (for tutorials, legends, etc.)
export const peakIconTiers = {
  low: tierLow,
  medium: tierMedium,
  high: tierHigh,
  veryHigh: tierVeryHigh,
};

// Colored icon tiers for legends
export const peakIconColoredTiers = {
  low: { unchecked: lvl1Unchecked, checked: lvl1Checked },
  medium: { unchecked: lvl2Unchecked, checked: lvl2Checked },
  high: { unchecked: lvl3Unchecked, checked: lvl3Checked },
  veryHigh: { unchecked: lvl4Unchecked, checked: lvl4Checked },
};
