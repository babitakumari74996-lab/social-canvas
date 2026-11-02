// World effect catalogue. Each entry is a colour look built from CSS filters, grouped by region.
// Effects are downloaded on the device before first use (see the Effects picker).
export type EffectRegion = "Asia" | "Europe" | "Americas" | "Africa" | "Oceania" | "Middle East";

export interface WorldEffect {
  name: string;
  region: EffectRegion;
  css: string;
}

export const EFFECT_REGIONS: EffectRegion[] = ["Asia", "Europe", "Americas", "Africa", "Oceania", "Middle East"];

const RAW: [string, EffectRegion, string][] = [
  // Asia
  ["Sakura", "Asia", "sepia(0.15) hue-rotate(-25deg) saturate(1.2) brightness(1.1)"],
  ["Tokyo Neon", "Asia", "contrast(1.3) saturate(1.7) hue-rotate(-10deg) brightness(0.95)"],
  ["Kyoto Film", "Asia", "sepia(0.25) contrast(0.9) saturate(0.85) brightness(1.05)"],
  ["Matcha", "Asia", "hue-rotate(50deg) saturate(0.7) brightness(1.05)"],
  ["Seoul Glow", "Asia", "brightness(1.12) saturate(1.1) contrast(0.95)"],
  ["K-Pop Pastel", "Asia", "saturate(0.9) brightness(1.15) hue-rotate(-15deg)"],
  ["Han River", "Asia", "contrast(1.1) saturate(0.8) hue-rotate(190deg)"],
  ["Hanbok", "Asia", "saturate(1.5) contrast(1.05) sepia(0.1)"],
  ["Holi", "Asia", "saturate(2) hue-rotate(-20deg) brightness(1.05)"],
  ["Bollywood", "Asia", "saturate(1.6) contrast(1.1) brightness(1.08)"],
  ["Taj Golden", "Asia", "sepia(0.3) saturate(1.3) brightness(1.08)"],
  ["Monsoon", "Asia", "saturate(0.9) contrast(1.1) brightness(0.95) hue-rotate(160deg)"],
  ["Diwali", "Asia", "saturate(1.8) brightness(1.1) sepia(0.1)"],
  ["Shanghai", "Asia", "contrast(1.15) saturate(1.2) hue-rotate(-8deg) brightness(0.98)"],
  ["Lantern", "Asia", "saturate(1.6) brightness(1.05) sepia(0.2)"],
  ["Hanoi", "Asia", "sepia(0.2) saturate(1.1) brightness(1.04)"],
  ["Bangkok", "Asia", "saturate(1.6) hue-rotate(-18deg) contrast(1.05)"],
  ["Bali", "Asia", "saturate(1.35) hue-rotate(-8deg) brightness(1.1)"],
  // Europe
  ["Paris Film", "Europe", "sepia(0.2) contrast(0.95) brightness(1.05) saturate(0.9)"],
  ["Montmartre", "Europe", "sepia(0.35) brightness(1.02) contrast(0.9)"],
  ["Nouvelle Vague", "Europe", "grayscale(0.7) contrast(1.2) brightness(1.02)"],
  ["Provence", "Europe", "saturate(1.3) sepia(0.15) hue-rotate(-10deg)"],
  ["Amalfi", "Europe", "saturate(1.45) brightness(1.08) hue-rotate(-5deg)"],
  ["Tuscany", "Europe", "sepia(0.3) saturate(1.2) brightness(1.04)"],
  ["Roma Vintage", "Europe", "sepia(0.4) contrast(1.05) brightness(0.98)"],
  ["Madrid Sun", "Europe", "saturate(1.35) brightness(1.1) contrast(1.05)"],
  ["Andalusia", "Europe", "sepia(0.25) saturate(1.5) hue-rotate(-12deg)"],
  ["Carnaby", "Europe", "contrast(1.15) saturate(0.9) sepia(0.1)"],
  ["Cotswold", "Europe", "sepia(0.2) saturate(0.9) brightness(1.02) contrast(1.02)"],
  ["Thames Mono", "Europe", "grayscale(1) contrast(1.15) brightness(1.02)"],
  ["Berlin Night", "Europe", "contrast(1.25) saturate(0.7) brightness(0.9) hue-rotate(200deg)"],
  ["Bavaria", "Europe", "saturate(1.2) brightness(1.06)"],
  ["Aurora", "Europe", "hue-rotate(160deg) saturate(1.4) brightness(1.05)"],
  ["Fjord", "Europe", "saturate(0.75) contrast(1.05) hue-rotate(190deg) brightness(1.03)"],
  ["Midnight Sun", "Europe", "brightness(1.2) contrast(0.9) saturate(0.9)"],
  ["Moscow Snow", "Europe", "grayscale(0.6) contrast(1.15) brightness(1.1) hue-rotate(200deg)"],
  ["Istanbul", "Europe", "sepia(0.25) saturate(1.3) hue-rotate(-12deg)"],
  // Americas
  ["Hollywood", "Americas", "contrast(1.2) saturate(1.1) sepia(0.1)"],
  ["Route 66", "Americas", "sepia(0.35) saturate(1.3) contrast(1.05)"],
  ["Miami", "Americas", "saturate(1.5) hue-rotate(-15deg) brightness(1.08)"],
  ["New York", "Americas", "grayscale(0.85) contrast(1.2)"],
  ["California", "Americas", "saturate(1.25) brightness(1.1) hue-rotate(-5deg)"],
  ["Maple", "Americas", "sepia(0.15) saturate(1.3) hue-rotate(-12deg)"],
  ["Banff", "Americas", "saturate(1.1) brightness(1.05) hue-rotate(185deg)"],
  ["Rio", "Americas", "saturate(1.8) brightness(1.1) hue-rotate(-8deg)"],
  ["Carnaval", "Americas", "saturate(2.2) contrast(1.1) hue-rotate(-18deg)"],
  ["Ipanema", "Americas", "saturate(1.2) brightness(1.1) sepia(0.12)"],
  ["Oaxaca", "Americas", "saturate(1.6) sepia(0.2) hue-rotate(-15deg)"],
  ["Frida", "Americas", "saturate(1.7) contrast(1.05) sepia(0.15)"],
  ["Buenos Aires", "Americas", "saturate(1.3) contrast(1.1) brightness(1.02)"],
  ["Machu", "Americas", "saturate(1.2) sepia(0.2) contrast(1.1)"],
  // Africa
  ["Nile Gold", "Africa", "sepia(0.45) saturate(1.2) brightness(1.08)"],
  ["Desert", "Africa", "sepia(0.3) contrast(1.1) brightness(1.1) saturate(0.9)"],
  ["Sahara", "Africa", "sepia(0.35) brightness(1.12) saturate(1.1)"],
  ["Serengeti", "Africa", "saturate(1.5) hue-rotate(-12deg) contrast(1.05)"],
  ["Lagos", "Africa", "saturate(1.7) contrast(1.1) brightness(1.04)"],
  // Oceania
  ["Outback", "Oceania", "sepia(0.4) saturate(1.5) contrast(1.05)"],
  ["Sydney Sun", "Oceania", "saturate(1.45) brightness(1.12)"],
  // Middle East
  ["Dubai Glow", "Middle East", "brightness(1.1) saturate(1.2) sepia(0.12)"],
  ["Persia", "Middle East", "sepia(0.4) hue-rotate(-10deg) saturate(1.25) contrast(1.05)"],
];

const PALETTE: [string, string][] = [
  ["#f472b6", "#a78bfa"], ["#22d3ee", "#3b82f6"], ["#fbbf24", "#f97316"], ["#34d399", "#059669"],
  ["#f87171", "#be123c"], ["#c084fc", "#7c3aed"], ["#fde68a", "#facc15"], ["#67e8f9", "#06b6d4"],
  ["#fdba74", "#ea580c"], ["#86efac", "#16a34a"], ["#93c5fd", "#1d4ed8"], ["#fca5a5", "#dc2626"],
];

export const WORLD_EFFECTS: WorldEffect[] = RAW.map(([name, region, css]) => ({ name, region, css }));

// Colour for a catalogue tile, picked from its position in the list.
export function worldEffectBg(index: number): string {
  const [a, b] = PALETTE[index % PALETTE.length];
  return `linear-gradient(${a},${b})`;
}
