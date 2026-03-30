/**
 * WavyGlassSVG
 *
 * Renders a hidden SVG element containing the filter definition used by
 * `.glass-wavy::before`. Must be present in the DOM for `url(#glass-wavy-filter)`
 * references in CSS to resolve.
 *
 * Place once at the React root (App.tsx top level).
 *
 * The filter chain:
 *   feTurbulence (animated baseFrequency)
 *     → feDisplacementMap (warps the source graphic)
 *
 * feTurbulence generates organic Perlin-noise clouds. The noise pattern is
 * animated via SMIL <animate> on the baseFrequency attribute — this runs
 * entirely inside the SVG renderer without touching the JS main thread.
 *
 * feDisplacementMap uses that noise to displace each pixel of the
 * ::before pseudo-element's edge gradient, creating the cloudy-border look.
 *
 * scale=12 keeps the distortion subtle (roughly ±12px max displacement).
 * Increase for more dramatic warping.
 */
export function WavyGlassSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="glass-wavy-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/* ── Turbulence: generates the organic noise field ────────────────
           *  type="turbulence"  → Perlin noise (fractal, cloud-like)
           *  numOctaves="3"     → 3 harmonic layers = smooth but detailed
           *  seed="2"           → Starting phase; arbitrary, just avoids
           *                       the default "blob" shape at seed=0
           *  baseFrequency animates between two values over 20s:
           *    low  (0.008 0.012) → large, slow cloud rolls
           *    high (0.015 0.022) → finer, faster rippling
           *  The two-value notation sets independent x/y frequencies so
           *  the distortion is slightly asymmetric — more naturalistic.
           * ──────────────────────────────────────────────────────────────── */}
          <feTurbulence
            type="turbulence"
            baseFrequency="0.010 0.015"
            numOctaves={3}
            seed={2}
            result="noise"
          >
            {/* Animate baseFrequency to slowly morph the noise pattern */}
            <animate
              attributeName="baseFrequency"
              values="0.008 0.012; 0.015 0.022; 0.010 0.016; 0.007 0.011; 0.008 0.012"
              dur="20s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95"
            />
            {/* Also slowly evolve the seed to prevent the pattern repeating
                visibly within the 20s cycle */}
            <animate
              attributeName="seed"
              values="2; 8; 14; 5; 2"
              dur="40s"
              repeatCount="indefinite"
              calcMode="discrete"
            />
          </feTurbulence>

          {/* ── Displacement: warps the ::before gradient using the noise ───
           *  xChannelSelector / yChannelSelector pick which noise colour
           *  channel drives displacement in each axis.
           *  R → X displacement,  G → Y displacement
           *  scale="12" → max ±12px displacement (subtle on mobile)
           * ──────────────────────────────────────────────────────────────── */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={12}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          >
            {/* Breathe the displacement scale between 8 and 18 for a
                subtle intensity variation independent of the noise morph */}
            <animate
              attributeName="scale"
              values="8; 16; 10; 18; 8"
              dur="28s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
            />
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  );
}
