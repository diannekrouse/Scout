/**
 * Theme registry. Each substrate picks a theme via dossier-config.json.
 * Scout ships with one theme ("savanna") and a registry pattern so you
 * can drop additional themes in alongside it.
 *
 * Adding a theme: drop a new file in this directory exporting a Theme
 * object, then list its key in THEMES in ./index.ts.
 */

export type ThemeKey = "savanna";

export interface ThemePalette {
  /** Page background base. Cards rest on top of this. */
  cream: string;
  cream2: string;
  /** Pure white card surface. */
  paper: string;
  /** Strong text color (titles, brand). */
  bright: string;
  /** Default body text. */
  body: string;
  /** Secondary text. */
  muted: string;
  /** Tertiary text and small mono labels. */
  dim: string;
  /** Default border/divider color. */
  line: string;
  line2: string;
  /** Five accent colors used across the app. Most pages pick one. */
  accent1: string; // primary
  accent2: string; // success
  accent3: string; // info
  accent4: string; // category
  accent5: string; // warning
}

export interface Theme {
  key: ThemeKey;
  /** Short label shown in admin contexts. Not user-facing UI. */
  label: string;
  palette: ThemePalette;
  /** Which hero illustration the right-hand band renders. */
  hero: "cheetah-lookout";
  /** PageHeader decor variant set used by the theme. */
  pageHeader: "savanna";
}
