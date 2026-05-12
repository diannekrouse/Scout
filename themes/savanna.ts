import type { Theme } from "./types";

/**
 * "Savanna" — the SNET handoff theme. Inspiration: a leopard cub up in a
 * tree, round glasses, green bandana, scanning the savanna for prey-or-prose.
 * Bright, friendly, naturalist-cute. Designed to read approachable to
 * non-tech researchers and the general public alike.
 *
 * Palette pulled from the leopard-cub reference image:
 *   - Bright bandana green (the kerchief) → primary brand accent
 *   - Leopard gold (warm coat) → secondary
 *   - Sky blue (the bright noon sky behind the tree) → tertiary
 *   - Soft mauve → categories (a quiet nod at SNET's purple family)
 *   - Rosette black → max-contrast text & spots
 *
 * Leopard-specific design cues we lean on:
 *   - Tree lookouts → leopards survey their range from high branches
 *     (perfect for "look across everything you've ever written")
 *   - Round glasses + leopard-print brim hat → the Ben homage; recurring
 *     brand mark that ties humans to the place this came from
 *   - Retractable claws → paw prints have NO claw ticks (distinguishes from
 *     cheetah prints, which DO show claw marks)
 *   - Rosettes (not solid spots) → the spot pattern that says "leopard"
 *   - White ear spots & tail tip → "follow-me" signals; we keep them in the
 *     illustration
 */
export const savannaTheme: Theme = {
  key: "savanna",
  label: "Savanna (leopard cub scholar)",
  palette: {
    cream: "#FAF4E6", // parchment base
    cream2: "#F4EAD3",
    paper: "#FFFFFF",
    bright: "#1F1611", // rosette black for max contrast text
    body: "#3A2D24", // warm dark brown for body text
    muted: "#7A6B58",
    dim: "#A8987F",
    line: "#E8DDC2",
    line2: "#D9CAA9",
    accent1: "#4FA856", // bandana green — primary brand
    accent2: "#E89B5C", // leopard gold — secondary, warm
    accent3: "#5BA3D4", // sky blue — tertiary, info
    accent4: "#9B7BA8", // soft mauve — categories (quiet SNET-purple nod)
    accent5: "#1F1611", // rosette black — strong eyebrow / max-contrast
  },
  hero: "cheetah-lookout", // shape kept; rendering is leopard-in-tree now
  pageHeader: "savanna",
};
