/**
 * The mobile app's design tokens.
 *
 * Before this file existed the app had 908 hardcoded hex literals across 32
 * StyleSheet blocks — consistent values, but no system, so every visual change
 * meant editing 21 screens by hand and dark mode was out of reach.
 *
 * It was built in two steps, deliberately. First the literals were extracted
 * unchanged — a pure refactor, proved value-for-value against a snapshot, so a
 * visual difference at that point would have been a bug rather than a choice.
 * Only then were the values changed, here, in one file. That ordering is what
 * made a 21-screen restyle a single diff you can read.
 *
 * Two layers, on purpose:
 *
 *   palette — raw values with no meaning attached. Named after the Tailwind
 *             ramp they came from, because they are that ramp (#6b7280 is
 *             gray-500, #10b981 is emerald-500, and so on), plus the two
 *             custom brand values.
 *
 *   colors  — what a thing is *for*. Screens should use these. Reach into
 *             `palette` only for a genuine one-off with no semantic role, and
 *             expect to be asked why.
 *
 * Changing the look means editing `colors`, `radius` and `elevation` here.
 * That is the whole point of the file.
 *
 * Kept in step with the web app's palette by hand — see
 * `.claude/rules/00-shared-contract.md` (Shared Color System). The brand blue
 * and the status colours must match across both clients.
 */

// ─── Raw values ────────────────────────────────────────────────────────────

export const palette = {
  white: '#fff',
  whiteFull: '#ffffff',
  black: '#000',

  /** Warm off-white the app used as its page ground before the bone ramp. */
  bone: '#fdfcfb',
  boneAlt: '#f6f7f8',
  boneCool: '#f1f2f4',
  boneCooler: '#f0f1f7',

  /**
   * The bone ramp, shared with the web client's Service Counter system.
   * Warmer than a grey ramp on purpose: the use scene is a phone held at
   * arm's length in a workshop, often in daylight, and a cool near-white
   * reads as a washed-out screen there where a warm one reads as paper.
   *
   * bone200 is a *divider*; bone400 is a *control edge*. They are not
   * interchangeable — bone200 sits at roughly 1.2:1 on bone50, which is a
   * border nobody can see, and WCAG asks 3:1 for anything operable.
   */
  bone50: '#faf8f4',
  bone100: '#f2eee6',
  bone200: '#e4ded1',
  bone300: '#cfc5b2',
  bone400: '#8a8375',

  /** Ink — the standing dark ground, shared with web. */
  ink900: '#0b0f1a',
  ink800: '#141a28',
  ink700: '#1e2637',

  // Neutral ramp (Tailwind gray)
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  grayBorderSoft: '#c7cbd4',

  // Brand — not from Tailwind; shared with web as primary-500.
  brand: '#3b5ff8',
  brandTint: '#eff2ff',
  brandTintAlt: '#eef2ff',

  // Indigo / violet — secondary accents and the ambient card shadow.
  indigo500: '#6366f1',
  indigo300: '#a5b4fc',
  indigo200: '#c7d2fe',
  indigo700: '#4338ca',
  violet500: '#8b5cf6',
  violet600: '#7c3aed',
  violet50: '#f5f3ff',

  // Status — success
  emerald500: '#10b981',
  /** Success at ~9% alpha — an 8-digit hex RN accepts. One wash on HomeScreen. */
  successWash: '#10b98118',
  emerald600: '#16a34a',
  emerald700: '#166534',
  emerald50: '#ecfdf5',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  teal700: '#0f766e',
  teal50: '#f0fdfa',

  // Status — danger
  red500: '#ef4444',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  redTintSoft: '#fff5f5',

  // Status — warning
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',
  amber900: '#a16207',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  yellow50: '#fefce8',

  // Status — info
  blue500: '#3b82f6',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue700: '#1e40af',
  blue900: '#1e3a8a',
  blue50: '#eff6ff',
  sky500: '#0ea5e9',
  sky700: '#0369a1',
  sky100: '#bae6fd',
  sky50: '#f0f9ff',
  cyan500: '#06b6d4',
  cyan50: '#ecfeff',

  // Accents used for category tinting
  orange500: '#f97316',
  orange200: '#fed7aa',
  orange50: '#fff7ed',
  orange800: '#9a3412',
  pink500: '#ec4899',
  pink50: '#fdf2f8',
} as const;

// ─── Semantic roles ────────────────────────────────────────────────────────

export const colors = {
  // Grounds
  /** The page field behind everything. */
  background: palette.bone100,
  /** A card, sheet or raised panel sitting on the background. */
  surface: palette.bone50,
  /** A recessed row, chip or input well. */
  surfaceMuted: palette.bone100,
  /** A slightly deeper recess — selected rows, table headers. */
  surfaceSunken: palette.bone200,

  // Text
  textPrimary: palette.gray900,
  textStrong: palette.gray800,
  textSecondary: palette.gray700,
  textMuted: palette.gray500,
  /** Placeholders, disabled labels, decorative icons. */
  textFaint: palette.gray400,
  textOnPrimary: palette.white,

  // Lines
  /** Decorative hairline between rows. Contrast is not load-bearing here. */
  border: palette.bone200,
  /** The edge of something operable — input, outlined button, picker.
   *  Must clear 3:1 against its ground; bone200 does not. */
  borderStrong: palette.bone400,
  divider: palette.bone200,

  // Brand
  primary: palette.brand,
  /** Wash behind a selected/active item. */
  primarySoft: palette.brandTint,
  primarySoftAlt: palette.brandTintAlt,
  onPrimary: palette.white,

  // Status
  success: palette.emerald500,
  successSoft: palette.emerald50,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  danger: palette.red500,
  dangerSoft: palette.red50,
  info: palette.blue500,
  infoSoft: palette.blue50,

  /** Signal orange — the single action that completes a flow. Rationed:
   *  at most one per screen, or it stops meaning "this is the one". */
  accent: palette.orange500,

  /** The ambient tint every card shadow is drawn in. Warm, not indigo:
   *  a cool shadow on a warm ground reads as dirt rather than depth. */
  shadowAmbient: palette.bone400,
  shadowHard: palette.black,
} as const;

// ─── Shape ─────────────────────────────────────────────────────────────────

/**
 * `lg` is the default and carries 97 of ~174 uses. It came down from 16 to 10:
 * squarer than the old look, nowhere near the web client's zero. Zero radius
 * reads as deliberate on a web page and as unfinished on Android, where
 * Material's conventions are strong enough to fight — so the palette and the
 * type scale are shared with web, and the corner radius is not.
 *
 * `pill` is a deliberately absurd number rather than a computed half-height —
 * that is what the code already did, and it works at any element height.
 *
 * A tail of one-off values (1, 2, 3, 5, 13, 14, 18, 22, 24) is deliberately
 * left inline. They are mostly tiny decorative radii — progress bars, hairline
 * chips — and snapping them onto this scale would have changed the render,
 * which the extraction was not allowed to do. Fold them in when one of them
 * next needs to change.
 */
export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  xxl: 20,
  pill: 160,
} as const;

// ─── Type ──────────────────────────────────────────────────────────────────

/**
 * The system font, deliberately. A bundled display face would cost an
 * `expo-font` dependency, a TTF in the bundle and a cold-start load state for
 * a handful of headings.
 */
export const type = {
  micro: 10,
  caption: 11,
  small: 12,
  label: 13,
  body: 14,
  bodyLarge: 15,
  subtitle: 16,
  title: 18,
  heading: 20,
  display: 24,
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Depth ─────────────────────────────────────────────────────────────────

/**
 * React Native needs both: iOS reads the `shadow*` properties, Android reads
 * `elevation` and ignores the rest. Spreading one of these gives both.
 */
export const elevation = {
  /** Cards and list rows — the app's default lift. */
  card: {
    shadowColor: colors.shadowAmbient,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  /** A sheet or modal above the page. */
  raised: {
    shadowColor: colors.shadowAmbient,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  /** A primary button, tinted in its own colour by the caller. */
  action: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export default { palette, colors, radius, type, spacing, elevation };
