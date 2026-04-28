/**
 * Derive a Tailwind-style 50→900 shade palette from a single hex color.
 * Used to dynamically theme the site from a brand color set in admin.
 *
 * Returns RGB triplets (e.g. "255 107 53") so the CSS-var consumer can apply
 * arbitrary alpha through Tailwind's `<alpha-value>` slot:
 *   color: rgb(var(--brand-500) / <alpha-value>)
 */

type Rgb = [number, number, number];

export type ShadeKey = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type ShadeMap = Record<ShadeKey, string>; // value: "r g b"

/** Mix two colors. amount=0 returns a, amount=1 returns b. */
function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function hexToRgb(hex: string): Rgb {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length !== 3) return [255, 107, 53]; // fallback to brand-500
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

const SHADE_RECIPE: Record<ShadeKey, { mixWith: Rgb; amount: number }> = {
  50:  { mixWith: WHITE, amount: 0.92 },
  100: { mixWith: WHITE, amount: 0.82 },
  200: { mixWith: WHITE, amount: 0.62 },
  300: { mixWith: WHITE, amount: 0.40 },
  400: { mixWith: WHITE, amount: 0.20 },
  500: { mixWith: WHITE, amount: 0    }, // base
  600: { mixWith: BLACK, amount: 0.12 },
  700: { mixWith: BLACK, amount: 0.28 },
  800: { mixWith: BLACK, amount: 0.46 },
  900: { mixWith: BLACK, amount: 0.62 },
};

const SHADE_KEYS: ShadeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function deriveShades(hex: string): ShadeMap {
  const base = hexToRgb(hex);
  const out = {} as ShadeMap;
  for (const k of SHADE_KEYS) {
    const { mixWith, amount } = SHADE_RECIPE[k];
    const [r, g, b] = mix(base, mixWith, amount);
    out[k] = `${r} ${g} ${b}`;
  }
  return out;
}

/** Build a `:root` CSS rule string for a given namespace (e.g. "brand"). */
export function shadesToCssVars(namespace: string, shades: ShadeMap): string {
  return SHADE_KEYS
    .map((k) => `--${namespace}-${k}: ${shades[k]};`)
    .join('');
}
