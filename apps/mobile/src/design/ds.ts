/**
 * BandFan Design System — canonical tokens
 *
 * Reference canvas: 440 × 956 px  (the design was produced at this resolution)
 * Light theme values are hardcoded here.  Dark theme and per-band overrides to follow.
 *
 * Architecture note:
 *   - `DS.color` carries the global light palette.
 *   - Future: `DS_DARK.color` for dark, `bandTheme(palette)` for per-band custom colours.
 *   - Consumers should switch on `mode` and pick the right color object; once dark tokens
 *     are finalised, a small `resolveColor(mode, key)` helper can centralise that.
 */

// ---------------------------------------------------------------------------
// Reference resolution + scaling helper
// ---------------------------------------------------------------------------

export const DS_REF_WIDTH = 440;
export const DS_REF_HEIGHT = 956;

/**
 * Scale a value that was measured on the 440-px-wide reference canvas to the
 * actual device screen width.  Use this for layout dimensions (card widths,
 * image sizes) that must feel proportional on every screen.
 * Internal spacing (padding, gap) is typically kept at fixed logical pixels.
 */
export function scaleW(refPx: number, screenWidth: number): number {
  return (refPx / DS_REF_WIDTH) * screenWidth;
}

/**
 * Scale a value measured on the 956-px-tall reference canvas to the actual
 * device screen height. Use this for vertical placement zones (for example,
 * keeping a primary CTA in the lower thumb-reach area).
 */
export function scaleH(refPx: number, screenHeight: number): number {
  return (refPx / DS_REF_HEIGHT) * screenHeight;
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

export const DS = {
  /**
   * Light-theme colour palette.
   *
   * Semantic groupings:
   *   background / surfaces  — fills for pages, cards, inputs
   *   border / shadow        — always opaque, always the same colour within each role
   *   accents                — interactive / status colours
   *   ink                    — foreground text / icon colours
   */
  color: {
    // --- Backgrounds & surfaces ---
    /** Page background, input field fill, player main background */
    background:   '#FFF9EF',
    /** Card face, progress-bar thumb, play button fill, song-table row, ENTER button label */
    cardSurface:  '#FFFFFF',
    /** Progress bar unfilled (non-progressed) area */
    progressBase: '#F5E6D3',

    // --- Borders & shadows (fully opaque, no transparency) ---
    /** All card borders, cover-art border, stroke colour everywhere */
    border:  '#222222',
    /** All block shadows — always fully opaque */
    shadow:  '#000000',

    // --- Accents ---
    /** Progress bar filled area, input placeholder text */
    progressFill: '#E7BF7B',
    /** ENTER button fill, like-button (active state) */
    enterFill:    '#EF4343',
    /** Band name, vote-active state, bottom-menu border / icons / labels */
    accent:       '#6EA06E',

    // --- Ink ---
    /** Song name in player, like/vote inactive, progress-bar border+shadow, primary text */
    ink: '#000000',
  },

  /**
   * Block shadow system.
   * Always colour `DS.color.shadow` (#000000), fully opaque.
   * x/y are the pixel offsets (right, down) for the solid offset shadow.
   */
  shadow: {
    color: '#000000' as const,
    fine:  { x: 2,  y: 2  } as const,
    thin:  { x: 6,  y: 6  } as const,
    thick: { x: 14, y: 14 } as const,
  },

  /**
   * Stroke (outline/border) system.
  * Always colour `DS.color.border` (#222222), fully opaque, square corners (radius: 0).
   */
  stroke: {
    color: '#222222' as const,
    fine:  2 as const,   // e.g. input fields
    thin:  4 as const,   // e.g. ENTER button border
    thick: 7 as const,   // e.g. logo card, form card
  },

  /**
   * Typography system — IBM Plex Mono font family.
   * Three size stops; use bold (700) or regular (400) per context.
   * All-caps is applied in JSX (toUpperCase / textTransform) where needed, not stored here.
   */
  font: {
    family: 'IBMPlexMono' as const,
    weight: {
      regular: '400' as const,
      bold:    '700' as const,
    },
    size: {
      fine:  10 as const,
      small: 13 as const,
      body:  16 as const,
      subheading: 19 as const,
      heading: 26 as const,
      hero: 39 as const,
    },
  },

  /**
   * Shared layout constants.
   * These are fixed logical-pixel values (not scaled), representing internal
   * spacing that should remain consistent regardless of screen size.
   */
  layout: {
    /** Horizontal inner padding for all cards */
    cardInsetH:     26,
    /** Gap between a field label and the field input beneath it */
    fieldLabelGap:  7,
    /** Distance from the ENTER button's bottom edge to the card's inner-bottom border */
    enterBottomGap: 32,
  },
} as const;

export type DsColorKey = keyof typeof DS.color;
export type DsShadowSize = keyof Omit<typeof DS.shadow, 'color'>;
export type DsStrokeSize = 'fine' | 'thin' | 'thick';

