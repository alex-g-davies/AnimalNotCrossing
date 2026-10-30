// Advanced mode: the owner's private joke. When the toggle is on, every
// animal icon is replaced by this little fellow, drawn in the same kawaii
// style as the portraits (round shapes, glossy eyes, blush) and given a
// gentle wobble by CSS (see .wobble in style.css; still under reduced motion).

const OUTLINE = '#a8604a';
const SKIN = '#f6c1aa';
const SKIN_DARK = '#f2b39b';
const HEAD = '#ec9a93';
const INK = '#2b2622';

export const ADVANCED_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true" class="adv">
  <g class="wobble">
    <ellipse cx="32" cy="57" rx="19" ry="3.5" fill="rgba(0,0,0,0.14)"/>
    <circle cx="21" cy="47" r="11" fill="${SKIN_DARK}" stroke="${OUTLINE}" stroke-width="2.4"/>
    <circle cx="43" cy="47" r="11" fill="${SKIN_DARK}" stroke="${OUTLINE}" stroke-width="2.4"/>
    <rect x="21.5" y="12" width="21" height="40" rx="10.5" fill="${SKIN}" stroke="${OUTLINE}" stroke-width="2.4"/>
    <ellipse cx="32" cy="15" rx="13.5" ry="11.5" fill="${HEAD}" stroke="${OUTLINE}" stroke-width="2.4"/>
    <path d="M22.5 20 Q32 25 41.5 20" fill="none" stroke="${OUTLINE}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="25.5" cy="10" rx="3.6" ry="2" fill="#ffffff" opacity="0.6"/>
    <circle cx="26.5" cy="31" r="3.4" fill="${INK}"/>
    <circle cx="37.5" cy="31" r="3.4" fill="${INK}"/>
    <circle cx="27.6" cy="29.8" r="1.2" fill="#ffffff"/>
    <circle cx="38.6" cy="29.8" r="1.2" fill="#ffffff"/>
    <ellipse cx="23" cy="36" rx="3" ry="1.7" fill="#f08a8a" opacity="0.65"/>
    <ellipse cx="41" cy="36" rx="3" ry="1.7" fill="#f08a8a" opacity="0.65"/>
    <path d="M29 37.5 Q32 40.5 35 37.5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;
