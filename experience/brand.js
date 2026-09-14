// ============================================================================
// Bee Innovations — 3D Experience
// Brand colors, copied exactly from the main site's CSS custom properties
// (assets/css/styles.css :root). Do not invent new colors here — if the
// site's palette changes, update this file to match, in that same order.
// ============================================================================

export const BRAND = {
  bg: 0xffffff,
  bgAlt: 0xfbfbfd,
  text: 0x14142b,
  textMuted: 0x4b4f5c,
  border: 0xeef0f5,
  blue: 0x3b82f6,
  blueDark: 0x2563c7,
  pink: 0xec4899,
  pinkDark: 0xd63c86,
  lime: 0xa3e635,
  limeDark: 0x4d7a0a,
  orange: 0xfb923c,
  orangeDark: 0xc2590f,
};

// One brand color per machine/word — reused for that machine's circuitry,
// LEDs, print material, or carving glow, AND its own status-light accents,
// so the object that writes a word visibly stays the same object once the
// word is finished (continuity from creation → final state).
export const WORD_COLOR = {
  arduino: BRAND.blue, // CREATE — circuit traces / electronic nodes
  microbit: BRAND.lime, // WHAT — LED matrix pixels
  printer: BRAND.orange, // YOU — printed material
  woodworking: BRAND.pink, // IMAGINE — carved highlight/glow
};
export const WORD_COLOR_DARK = {
  arduino: BRAND.blueDark,
  microbit: BRAND.limeDark,
  printer: BRAND.orangeDark,
  woodworking: BRAND.pinkDark,
};
