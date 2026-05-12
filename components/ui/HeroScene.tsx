/**
 * Hero scene for the right-hand band. Renders the savanna-scholar
 * illustration: a leopard cub in a tree, wearing round glasses,
 * scanning the horizon for what you wrote.
 *
 * The scene is structured behind a theme-aware switch so new themes
 * can plug in alongside without rewriting the layout that hosts it.
 */
import type { Theme } from "@/themes";

interface HeroSceneProps {
  theme: Theme;
  greeting: string;
  eyebrow: string;
}

export default function HeroScene({ greeting, eyebrow }: HeroSceneProps) {
  return <SavannaScene greeting={greeting} eyebrow={eyebrow} />;
}

/* ============================================================
   Savanna scene — uses the actual leopard-cub PNG as the hero.
   The SVG illustration is preserved below as a fallback (and a
   reference for future themes) but it's no longer rendered.
   ============================================================ */

function SavannaScene({
  greeting,
}: {
  greeting: string;
  /** Accepted for API compatibility; not rendered on the savanna scene
   *  because the eyebrow didn't read well over the landscape. */
  eyebrow?: string;
}) {
  return (
    <div
      className="relative h-[300px] overflow-hidden leopard-peek-on-hover"
      style={{
        // Soft warm fallback color in case the image is slow to load
        backgroundColor: "#A8D5E8",
      }}
    >
      {/* The hero image itself, cropped tall so the cub stays prominent and a
          slice of the distant savanna shows below. */}
      <img
        src="/leopard-cub.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
        style={{ objectPosition: "55% 45%" }}
      />

      {/* Bottom-anchored gradient so the white text in the lower-left reads
          cleanly over whatever savanna detail is in the bottom of the image. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(31, 22, 17, 0.55) 0%, rgba(31, 22, 17, 0.18) 55%, transparent 100%)",
        }}
      />

      {/* Greeting — bottom-left, white. The eyebrow was removed
          (it didn't read cleanly over the savanna landscape). The greeting
          alone carries the moment. Anchored at left:16px and width-capped
          so it stays clear of the cub's tail on the right. */}
      <div
        className="absolute bottom-5"
        style={{ left: "16px", maxWidth: "180px" }}
      >
        <h3
          className="font-display text-2xl font-extrabold leading-tight"
          style={{
            color: "#FFFFFF",
            textShadow:
              "0 2px 12px rgba(31, 22, 17, 0.65), 0 1px 2px rgba(31, 22, 17, 0.45)",
          }}
        >
          {greeting}
        </h3>
      </div>
    </div>
  );
}

/* ============================================================
   Legacy SVG illustration. Preserved as a fallback and as a
   reference for building future themes that need a hand-drawn
   hero scene without depending on an asset file. Not rendered
   in the active code path; intentionally unexported.
   ============================================================ */
// eslint-disable-next-line no-unused-vars
function SavannaSceneSVGLegacy({
  greeting,
  eyebrow,
}: {
  greeting: string;
  eyebrow: string;
}) {
  return (
    <div
      className="relative h-[300px] overflow-hidden leopard-peek-on-hover"
      style={{
        background:
          "linear-gradient(180deg, #7DB8DC 0%, #A8D5E8 38%, #E5DA9A 70%, #C9D585 100%)",
      }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 320 300"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* === FAR DISTANT BACKDROP === purple-blue mountains, golden grass,
             a hint of a winding river. Suggests the cub's vast scanning range. */}
        {/* Distant mountain silhouettes */}
        <path
          d="M0 220 L20 200 L45 215 L70 195 L100 218 L130 205 L160 222 L200 208 L240 220 L280 200 L320 215 L320 245 L0 245 Z"
          fill="#8B95B5"
          opacity="0.45"
        />
        <path
          d="M0 232 L40 220 L80 232 L130 222 L180 235 L240 225 L320 232 L320 252 L0 252 Z"
          fill="#7A8AA8"
          opacity="0.4"
        />
        {/* Mid-distance golden savanna */}
        <path
          d="M0 252 L60 245 L120 250 L180 244 L240 252 L320 246 L320 280 L0 280 Z"
          fill="#D9C77C"
          opacity="0.7"
        />
        {/* Tiny river hint */}
        <path
          d="M50 270 Q90 263, 130 268 T 220 264"
          stroke="#5BA3D4"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Soft puffy cloud upper-left */}
        <ellipse cx="60" cy="50" rx="28" ry="9" fill="#FFFFFF" opacity="0.85" />
        <ellipse cx="80" cy="42" rx="18" ry="7" fill="#FFFFFF" opacity="0.78" />
        <ellipse cx="42" cy="56" rx="16" ry="6" fill="#FFFFFF" opacity="0.7" />

        {/* A tiny daytime "guide star". Barely visible; sits as a wink at the horizon. */}
        <circle cx="270" cy="32" r="1.2" fill="#FFFFFF" opacity="0.7" className="twinkle" style={{ animationDelay: "0.4s" }} />
        <circle cx="240" cy="48" r="0.9" fill="#FFFFFF" opacity="0.6" className="twinkle" style={{ animationDelay: "1.6s" }} />

        {/* === FOREGROUND TREE ===
             Thick trunk on left, branch reaching across mid-frame where the cub sits */}
        {/* Trunk */}
        <path
          d="M-10 305 L 0 240 L 10 200 L 30 180 L 50 175 L 60 200 L 55 240 L 65 305 Z"
          fill="#6B4F3A"
        />
        {/* Trunk shading */}
        <path
          d="M-10 305 L 0 240 L 10 200 L 30 180 L 35 200 L 32 240 L 28 305 Z"
          fill="#4F3A2A"
          opacity="0.65"
        />
        {/* Mossy lichen patches on trunk */}
        <ellipse cx="20" cy="220" rx="6" ry="3" fill="#A8B57D" opacity="0.55" />
        <ellipse cx="35" cy="195" rx="4" ry="2" fill="#A8B57D" opacity="0.55" />
        <ellipse cx="50" cy="245" rx="5" ry="2.5" fill="#A8B57D" opacity="0.45" />
        {/* Thick horizontal branch the cub sits on */}
        <path
          d="M30 180
             C 60 175, 110 178, 160 188
             C 200 195, 230 200, 250 210
             L 250 220
             C 230 212, 200 207, 160 200
             C 110 192, 60 190, 30 195
             Z"
          fill="#6B4F3A"
        />
        <path
          d="M30 180
             C 60 175, 110 178, 160 188
             C 200 195, 230 200, 250 210
             L 250 215
             C 230 207, 200 202, 160 195
             C 110 187, 60 185, 30 188
             Z"
          fill="#7E5E45"
          opacity="0.85"
        />
        {/* Tiny offshoot twig going up */}
        <path
          d="M180 188 Q 195 165 210 145"
          stroke="#6B4F3A"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* === FRAMING LEAVES === lush dappled cluster arching across the top
             and curling down both sides — frames the cub like in the reference.
             Layered greens (yellow-green over forest-green) for depth. */}
        <g>
          {/* Background dark green canopy layer (creates depth) */}
          <ellipse cx="35" cy="40" rx="55" ry="22" fill="#5C8A4F" opacity="0.55" transform="rotate(-8 35 40)" />
          <ellipse cx="160" cy="20" rx="80" ry="20" fill="#5C8A4F" opacity="0.5" />
          <ellipse cx="285" cy="40" rx="55" ry="22" fill="#5C8A4F" opacity="0.55" transform="rotate(8 285 40)" />

          {/* Mid-green leaf cluster — left side arch */}
          <ellipse cx="14" cy="55" rx="22" ry="11" fill="#7DA76B" opacity="0.92" transform="rotate(-22 14 55)" />
          <ellipse cx="32" cy="38" rx="20" ry="10" fill="#9BC07D" opacity="0.9" transform="rotate(-5 32 38)" />
          <ellipse cx="55" cy="30" rx="18" ry="9" fill="#A8C570" opacity="0.88" transform="rotate(8 55 30)" />
          <ellipse cx="78" cy="25" rx="16" ry="8" fill="#9BC07D" opacity="0.85" transform="rotate(-3 78 25)" />
          <ellipse cx="2" cy="92" rx="22" ry="11" fill="#7DA76B" opacity="0.85" transform="rotate(-30 2 92)" />
          <ellipse cx="22" cy="115" rx="18" ry="9" fill="#A8B86E" opacity="0.82" transform="rotate(-18 22 115)" />
          <ellipse cx="45" cy="100" rx="14" ry="7" fill="#9BC07D" opacity="0.78" transform="rotate(5 45 100)" />

          {/* Mid-green leaf cluster — right side arch (mirror) */}
          <ellipse cx="306" cy="55" rx="22" ry="11" fill="#7DA76B" opacity="0.92" transform="rotate(22 306 55)" />
          <ellipse cx="288" cy="38" rx="20" ry="10" fill="#9BC07D" opacity="0.9" transform="rotate(5 288 38)" />
          <ellipse cx="265" cy="30" rx="18" ry="9" fill="#A8C570" opacity="0.88" transform="rotate(-8 265 30)" />
          <ellipse cx="242" cy="25" rx="16" ry="8" fill="#9BC07D" opacity="0.85" transform="rotate(3 242 25)" />
          <ellipse cx="318" cy="92" rx="22" ry="11" fill="#7DA76B" opacity="0.85" transform="rotate(30 318 92)" />
          <ellipse cx="298" cy="115" rx="18" ry="9" fill="#A8B86E" opacity="0.82" transform="rotate(18 298 115)" />
          <ellipse cx="275" cy="100" rx="14" ry="7" fill="#9BC07D" opacity="0.78" transform="rotate(-5 275 100)" />

          {/* Top-center drooping leaves */}
          <ellipse cx="140" cy="30" rx="14" ry="6" fill="#A8C570" opacity="0.85" transform="rotate(-12 140 30)" />
          <ellipse cx="160" cy="22" rx="12" ry="5" fill="#9BC07D" opacity="0.85" />
          <ellipse cx="180" cy="28" rx="13" ry="6" fill="#A8C570" opacity="0.85" transform="rotate(10 180 28)" />
          <ellipse cx="115" cy="38" rx="10" ry="5" fill="#7DA76B" opacity="0.7" transform="rotate(-20 115 38)" />
          <ellipse cx="205" cy="38" rx="10" ry="5" fill="#7DA76B" opacity="0.7" transform="rotate(15 205 38)" />

          {/* A few small individual leaves dangling lower into the scene */}
          <ellipse cx="65" cy="68" rx="6" ry="3" fill="#9BC07D" opacity="0.7" transform="rotate(-30 65 68)" />
          <ellipse cx="248" cy="68" rx="6" ry="3" fill="#9BC07D" opacity="0.7" transform="rotate(30 248 68)" />
          <ellipse cx="92" cy="56" rx="5" ry="2.5" fill="#A8C570" opacity="0.65" transform="rotate(-15 92 56)" />
          <ellipse cx="225" cy="56" rx="5" ry="2.5" fill="#A8C570" opacity="0.65" transform="rotate(15 225 56)" />

          {/* Stem detail — small dark lines suggesting branches the leaves hang from */}
          <g stroke="#4F3A2A" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" fill="none">
            <path d="M50 22 Q 80 30 110 28" />
            <path d="M270 22 Q 240 30 210 28" />
            <path d="M30 50 Q 50 55 70 60" />
            <path d="M290 50 Q 270 55 250 60" />
          </g>
        </g>

        {/* ============================================
             === LEOPARD CUB === sitting on the branch,
             facing forward, big eyes, glasses, green bandana
             ============================================ */}
        <g className="leopard-cub" style={{ transformOrigin: "center bottom" }}>
          {/* Tail draping off the branch (curls down and forward) */}
          <path
            d="M210 195
               C 240 198, 260 220, 252 245
               C 248 258, 240 262, 232 258"
            stroke="#E89B5C"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Tail rosette spots */}
          <g fill="#1F1611">
            <circle cx="220" cy="200" r="1.4" />
            <circle cx="232" cy="208" r="1.3" />
            <circle cx="246" cy="222" r="1.4" />
            <circle cx="252" cy="238" r="1.5" />
          </g>
          {/* Tail tip — white "follow-me" signal that leopards have */}
          <circle cx="232" cy="258" r="2.8" fill="#FAF4E6" />
          <circle cx="232" cy="258" r="1.4" fill="#1F1611" opacity="0.4" />

          {/* === BODY ===
               Sitting upright on the branch, facing forward */}
          {/* Hind/back-legs as a sitting bell-shape */}
          <ellipse cx="155" cy="178" rx="32" ry="20" fill="#E89B5C" />
          {/* Lighter belly */}
          <ellipse cx="155" cy="184" rx="22" ry="14" fill="#FAEED0" />

          {/* Front paws — raised UP to hold the binoculars at face level
              (matching the reference cub pose: actively scanning the savanna) */}
          {/* Left paw (cub's right) — coming up from below-left */}
          <path
            d="M138 192
               C 134 178, 134 162, 138 152
               C 142 146, 148 145, 152 150
               L 152 158
               L 144 158
               C 142 168, 142 182, 144 192 Z"
            fill="#E89B5C"
          />
          {/* Right paw — coming up from below-right */}
          <path
            d="M172 192
               C 176 178, 176 162, 172 152
               C 168 146, 162 145, 158 150
               L 158 158
               L 166 158
               C 168 168, 168 182, 166 192 Z"
            fill="#E89B5C"
          />
          {/* Paw rosettes — tiny dots on the raised paws so they read as leopard */}
          <g fill="#1F1611">
            <Rosette cx={140} cy={170} scale={0.45} />
            <Rosette cx={170} cy={170} scale={0.45} />
            <Rosette cx={142} cy={183} scale={0.4} />
            <Rosette cx={168} cy={183} scale={0.4} />
          </g>

          {/* (Binoculars are drawn LATER in the group — see below — so they
              render on top of the head, glasses, and muzzle. That keeps the
              cub holding them up in front of its eyes, like the reference.) */}

          {/* === HEAD ===
               Round friendly cub face, forward-facing */}
          <ellipse cx="155" cy="135" rx="28" ry="26" fill="#E89B5C" />
          {/* Lighter face mask (chin / lower face) */}
          <ellipse cx="155" cy="148" rx="18" ry="13" fill="#FAEED0" />

          {/* Ears — rounded with the white "follow-me" spots on the back */}
          {/* Left ear */}
          <ellipse cx="135" cy="111" rx="8" ry="9" fill="#E89B5C" transform="rotate(-18 135 111)" />
          <ellipse cx="135" cy="113" rx="4" ry="5" fill="#1F1611" opacity="0.55" transform="rotate(-18 135 113)" />
          {/* Right ear */}
          <ellipse cx="175" cy="111" rx="8" ry="9" fill="#E89B5C" transform="rotate(18 175 111)" />
          <ellipse cx="175" cy="113" rx="4" ry="5" fill="#1F1611" opacity="0.55" transform="rotate(18 175 113)" />

          {/* === ROSETTE PATTERN === leopard rosettes (rings of spots) on body & head */}
          {/* Rosettes are clusters of small dots forming open rings — the signature
              that distinguishes leopard from cheetah's solid spots */}
          <g fill="#1F1611">
            {/* Body rosettes */}
            <Rosette cx={130} cy={170} />
            <Rosette cx={150} cy={168} />
            <Rosette cx={170} cy={172} />
            <Rosette cx={140} cy={188} scale={0.85} />
            <Rosette cx={170} cy={188} scale={0.85} />
            <Rosette cx={125} cy={183} scale={0.75} />
            <Rosette cx={185} cy={180} scale={0.8} />
            {/* Head rosettes (smaller, around the face periphery) */}
            <Rosette cx={138} cy={120} scale={0.55} />
            <Rosette cx={172} cy={120} scale={0.55} />
            <Rosette cx={130} cy={140} scale={0.5} />
            <Rosette cx={180} cy={140} scale={0.5} />
            {/* Forehead small rosette */}
            <Rosette cx={155} cy={115} scale={0.5} />
          </g>

          {/* === EYES === big cub eyes — bright, alert, behind round glasses */}
          {/* Eye whites */}
          <ellipse cx="146" cy="135" rx="4" ry="4.5" fill="#FFFFFF" />
          <ellipse cx="164" cy="135" rx="4" ry="4.5" fill="#FFFFFF" />
          {/* Iris — warm honey-brown */}
          <circle cx="146" cy="136" r="2.6" fill="#7A4A28" />
          <circle cx="164" cy="136" r="2.6" fill="#7A4A28" />
          {/* Pupil */}
          <circle cx="146" cy="136" r="1.4" fill="#1F1611" />
          <circle cx="164" cy="136" r="1.4" fill="#1F1611" />
          {/* Eye highlights — give it life */}
          <circle cx="147" cy="135" r="0.7" fill="#FFFFFF" />
          <circle cx="165" cy="135" r="0.7" fill="#FFFFFF" />

          {/* === ROUND SCHOLAR GLASSES === */}
          <circle cx="146" cy="135" r="6.5" fill="none" stroke="#1F1611" strokeWidth="1.4" />
          <circle cx="164" cy="135" r="6.5" fill="none" stroke="#1F1611" strokeWidth="1.4" />
          {/* Bridge */}
          <line x1="152.5" y1="135" x2="157.5" y2="135" stroke="#1F1611" strokeWidth="1.4" />
          {/* Tiny glint */}
          <path d="M141 132 Q 143 130 145 132" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.85" />
          <path d="M159 132 Q 161 130 163 132" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.85" />

          {/* === MUZZLE & NOSE === */}
          {/* Muzzle area (already covered by lighter mask), add nose + mouth */}
          <ellipse cx="155" cy="148" rx="2.4" ry="1.8" fill="#1F1611" />
          {/* Tiny mouth — friendly slight smile */}
          <path d="M150 154 Q 155 158 160 154" stroke="#1F1611" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* Whiskers */}
          <g stroke="#1F1611" strokeWidth="0.5" opacity="0.65">
            <line x1="148" y1="151" x2="138" y2="150" />
            <line x1="148" y1="153" x2="138" y2="154" />
            <line x1="162" y1="151" x2="172" y2="150" />
            <line x1="162" y1="153" x2="172" y2="154" />
          </g>

          {/* === GREEN BANDANA === around the neck (bandana-green primary brand color) */}
          {/* Bandana wrap */}
          <path
            d="M132 158
               Q 155 168, 178 158
               L 182 168
               Q 155 178, 128 168
               Z"
            fill="#4FA856"
          />
          {/* Bandana knot in front (small triangular fold) */}
          <path
            d="M150 168 L 155 175 L 160 168 L 158 172 L 152 172 Z"
            fill="#3D8A44"
          />
          {/* Bandana fold highlight */}
          <path
            d="M132 158 Q 155 166, 178 158 L 178 161 Q 155 169 132 161 Z"
            fill="#7DC480"
            opacity="0.7"
          />
          {/* A tiny bandana "spot" pattern hint */}
          <g fill="#FAF4E6" opacity="0.5">
            <circle cx="142" cy="164" r="0.8" />
            <circle cx="155" cy="170" r="0.8" />
            <circle cx="168" cy="164" r="0.8" />
          </g>

          {/* === BINOCULARS === rendered last so they sit on top of the face.
               Two lens barrels with leather-brown body, brass rims, and a
               glint of savanna reflected in each lens (left = green grass,
               right = sky-blue). The cub is actively scanning. */}
          <g>
            {/* Strap arcs going around the neck (peek out behind the binoculars) */}
            <path
              d="M140 142 Q 128 144 128 134"
              stroke="#3A2D24"
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
            <path
              d="M170 142 Q 182 144 182 134"
              stroke="#3A2D24"
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
            {/* Bridge between the two lens barrels */}
            <rect x="150" y="129" width="10" height="6" rx="1.5" fill="#3A2D24" />
            {/* Left lens barrel */}
            <rect x="137" y="124" width="15" height="15" rx="3" fill="#4A3625" />
            {/* Right lens barrel */}
            <rect x="158" y="124" width="15" height="15" rx="3" fill="#4A3625" />
            {/* Leather strap detail (lighter band across each barrel) */}
            <rect x="137" y="131" width="15" height="1.6" fill="#7A5C40" />
            <rect x="158" y="131" width="15" height="1.6" fill="#7A5C40" />
            {/* Lens rims — brass ring */}
            <circle cx="144.5" cy="131.5" r="5.2" fill="#B6753A" stroke="#3A2D24" strokeWidth="0.9" />
            <circle cx="165.5" cy="131.5" r="5.2" fill="#B6753A" stroke="#3A2D24" strokeWidth="0.9" />
            {/* Lens glass — left barrel reflects the green grass, right reflects sky */}
            <circle cx="144.5" cy="131.5" r="3.8" fill="#3A6B4F" />
            <circle cx="165.5" cy="131.5" r="3.8" fill="#5BA3D4" />
            {/* Tiny lens glint */}
            <circle cx="142.8" cy="129.8" r="0.9" fill="#FFFFFF" opacity="0.85" />
            <circle cx="163.8" cy="129.8" r="0.9" fill="#FFFFFF" opacity="0.85" />
          </g>
        </g>

        {/* === DAPPLED LIGHT === a few yellow-green sun rays through the leaves */}
        <g opacity="0.4">
          <ellipse cx="100" cy="160" rx="8" ry="3" fill="#FFEFB0" transform="rotate(-20 100 160)" />
          <ellipse cx="220" cy="170" rx="6" ry="2" fill="#FFEFB0" transform="rotate(-15 220 170)" />
          <ellipse cx="260" cy="195" rx="10" ry="3" fill="#FFEFB0" transform="rotate(-25 260 195)" />
        </g>

        {/* === LEOPARD PAW PRINT TRAIL === at the foreground, walking across.
             Leopard prints have NO claw marks (retractable claws stay tucked).
             Stronger opacity than before so they actually read. */}
        <g opacity="0.55" fill="#3A2D24">
          {/* Print 1 — leftmost */}
          <g transform="translate(80 280) rotate(-12) scale(0.55)">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" />
            <ellipse cx="9" cy="13" rx="2.8" ry="3.6" />
            <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="23" cy="13" rx="2.8" ry="3.6" />
          </g>
          {/* Print 2 */}
          <g transform="translate(112 285) rotate(8) scale(0.55)">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" />
            <ellipse cx="9" cy="13" rx="2.8" ry="3.6" />
            <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="23" cy="13" rx="2.8" ry="3.6" />
          </g>
          {/* Print 3 */}
          <g transform="translate(146 280) rotate(-12) scale(0.55)">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" />
            <ellipse cx="9" cy="13" rx="2.8" ry="3.6" />
            <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="23" cy="13" rx="2.8" ry="3.6" />
          </g>
          {/* Print 4 — fading toward right (leading off-frame as if continuing) */}
          <g transform="translate(180 285) rotate(8) scale(0.5)" opacity="0.7">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" />
            <ellipse cx="9" cy="13" rx="2.8" ry="3.6" />
            <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="23" cy="13" rx="2.8" ry="3.6" />
          </g>
          <g transform="translate(212 280) rotate(-12) scale(0.45)" opacity="0.45">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" />
            <ellipse cx="9" cy="13" rx="2.8" ry="3.6" />
            <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" />
            <ellipse cx="23" cy="13" rx="2.8" ry="3.6" />
          </g>
        </g>
      </svg>

      <div className="relative px-6 pt-6">
        <div className="eyebrow text-paper drop-shadow-sm">{eyebrow}</div>
        <h3 className="font-display text-2xl font-extrabold text-bright mt-1.5 leading-tight">
          {greeting}
        </h3>
      </div>
    </div>
  );
}

/**
 * One leopard rosette — a ring of small black dots arranged in an open
 * almond/oval shape. This is the visual signature of a leopard (vs. cheetah's
 * solid spots). Rendering as a group of 5–6 small circles gives the right
 * read at small sizes without going hyper-realistic.
 */
function Rosette({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 0.9 * scale;
  const ring = 4 * scale;
  return (
    <g>
      <circle cx={cx} cy={cy - ring * 0.85} r={r} />
      <circle cx={cx + ring} cy={cy - ring * 0.4} r={r} />
      <circle cx={cx + ring * 0.95} cy={cy + ring * 0.5} r={r} />
      <circle cx={cx} cy={cy + ring * 0.85} r={r} />
      <circle cx={cx - ring * 0.95} cy={cy + ring * 0.5} r={r} />
      <circle cx={cx - ring} cy={cy - ring * 0.4} r={r} />
    </g>
  );
}
