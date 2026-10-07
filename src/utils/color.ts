/**
 * Color and luminance utilities for institutional brand theming
 * Complies with WCAG contrast guidelines for education portals
 */

export interface SchoolPalette {
  id: string;
  name: string;
  category: string;
  primary: string;
  accent: string;
  description: string;
}

export const INSTITUTION_COLOR_PRESETS: SchoolPalette[] = [
  {
    id: 'electric_violet',
    name: 'Electric Royal Violet',
    category: 'Digital Campus',
    primary: '#4f46e5',
    accent: '#a5b4fc',
    description: 'Vibrant digital campus violet-indigo, high-energy academic showcase color.',
  },
  {
    id: 'oxford_navy',
    name: 'Oxford Academic Navy',
    category: 'Collegiate Navy',
    primary: '#0f2b5c',
    accent: '#38bdf8',
    description: 'Traditional deep collegiate navy, standard for higher secondary academies.',
  },
  {
    id: 'classic_indigo',
    name: 'University Indigo',
    category: 'Modern University',
    primary: '#4338ca',
    accent: '#818cf8',
    description: 'Vibrant academic indigo with high contrast readability across desktop and mobile.',
  },
  {
    id: 'harvard_crimson',
    name: 'Harvard Crimson',
    category: 'Heritage Crimson',
    primary: '#881337',
    accent: '#fb7185',
    description: 'Distinguished deep crimson red conveying prestige and academic heritage.',
  },
  {
    id: 'ivy_emerald',
    name: 'Ivy Forest Emerald',
    category: 'Botanical & Science',
    primary: '#064e3b',
    accent: '#34d399',
    description: 'Deep scholastic forest green, ideal for science, mathematics, and nature curricula.',
  },
  {
    id: 'stanford_cardinal',
    name: 'Stanford Cardinal',
    category: 'Vibrant Academy',
    primary: '#991b1b',
    accent: '#f87171',
    description: 'Bold scholastic cardinal red with authoritative presence.',
  },
  {
    id: 'imperial_plum',
    name: 'Imperial Amethyst',
    category: 'Regal Arts & Humanities',
    primary: '#581c87',
    accent: '#c084fc',
    description: 'Rich academic royal purple, popular with arts, literature, and culture institutions.',
  },
  {
    id: 'cambridge_teal',
    name: 'Cambridge Scholastic Teal',
    category: 'Polytechnic & Research',
    primary: '#115e59',
    accent: '#2dd4bf',
    description: 'Refined deep teal blue, balanced for STEM, technology, and polytechnic hubs.',
  },
  {
    id: 'ocean_sapphire',
    name: 'Pacific Sapphire',
    category: 'Public Education',
    primary: '#0369a1',
    accent: '#38bdf8',
    description: 'Approachable, authoritative royal blue designed for state and public schools.',
  },
  {
    id: 'heritage_slate',
    name: 'Heritage Architectural Slate',
    category: 'Modern Minimalist',
    primary: '#1e293b',
    accent: '#94a3b8',
    description: 'Sleek dark charcoal slate, ultra clean with focus on high-density materials.',
  },
  {
    id: 'collegiate_amber',
    name: 'Collegiate Bronze & Amber',
    category: 'Warm Academy',
    primary: '#92400e',
    accent: '#fbbf24',
    description: 'Warm golden bronze, evoking leather-bound libraries and historical honors.',
  },
];

/**
 * Parses 3-digit or 6-digit hex color into [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleaned.length !== 6) {
    return [30, 58, 138]; // fallback deep navy
  }
  const r = parseInt(cleaned.substring(0, 2), 16) || 0;
  const g = parseInt(cleaned.substring(2, 4), 16) || 0;
  const b = parseInt(cleaned.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Calculates standard WCAG relative luminance
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determines whether text over this background color should be white or dark
 */
export function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.55;
}

/**
 * Returns '#ffffff' or '#0f172a' depending on background contrast
 */
export function getContrastTextColor(hex: string): string {
  return isDarkColor(hex) ? '#ffffff' : '#0f172a';
}

/**
 * Calculates WCAG contrast ratio between two colors (1 to 21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(1));
}

/**
 * Converts hex to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Adjusts brightness by percentage (-100 to 100)
 */
export function adjustBrightness(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const factor = 1 + percent / 100;
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}
