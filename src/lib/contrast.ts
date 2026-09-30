// Constantes normatives WCAG 2.x (luminance relative et rapport de contraste).
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const CHANNEL_MAX = 255;
const SRGB_KNEE = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const RATIO_OFFSET = 0.05;
const HEX_RADIX = 16;
const HEX_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

const linearize = (hexChannel: string): number => {
  const value = parseInt(hexChannel, HEX_RADIX) / CHANNEL_MAX;
  return value <= SRGB_KNEE
    ? value / SRGB_LINEAR_DIVISOR
    : ((value + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
};

/** Luminance relative WCAG d'une couleur `#rrggbb`. */
const luminance = (hex: string): number => {
  const [, red, green, blue] = HEX_PATTERN.exec(hex) ?? [];
  if (!red || !green || !blue) throw new Error(`Couleur invalide : ${hex}`);
  return (
    RED_WEIGHT * linearize(red) + GREEN_WEIGHT * linearize(green) + BLUE_WEIGHT * linearize(blue)
  );
};

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
export const contrastRatio = (foreground: string, background: string): number => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + RATIO_OFFSET) / (Math.min(first, second) + RATIO_OFFSET);
};
