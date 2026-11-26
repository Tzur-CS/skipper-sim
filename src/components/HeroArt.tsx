/** Decorative home-page illustration: a sloop close-hauled on a calm sea (pure SVG, no assets). */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 230" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMinYMax slice">
      <defs>
        <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc4ff" />
          <stop offset="1" stopColor="#d9efff" />
        </linearGradient>
        <linearGradient id="hsea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f6fb2" />
          <stop offset="1" stopColor="#0b2f52" />
        </linearGradient>
        <linearGradient id="hsail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e9ef" />
        </linearGradient>
      </defs>
      <rect width="800" height="230" fill="url(#hsky)" />
      <circle cx="330" cy="52" r="20" fill="#fff4c2" />
      <circle cx="330" cy="52" r="32" fill="#fff4c2" opacity="0.25" />
      <path d="M40 46 q14 -10 28 0 q10 -8 20 0" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M210 30 q10 -7 20 0 q8 -6 16 0" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <rect y="150" width="800" height="80" fill="url(#hsea)" />
      {/* boat, heeled a little */}
      <g transform="translate(150 152) rotate(-8) scale(0.92)">
        <path d="M-6 -4 L-6 -118" stroke="#2b3340" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M-2 -114 C 26 -80 44 -40 52 -10 L-2 -10 Z" fill="url(#hsail)" stroke="#c9d1d9" strokeWidth="1" />
        <path d="M-10 -110 C -34 -76 -54 -40 -64 -8 L-10 -8 Z" fill="url(#hsail)" stroke="#c9d1d9" strokeWidth="1" />
        <path d="M-2 -10 L 50 -10" stroke="#2b3340" strokeWidth="3" strokeLinecap="round" />
        <path d="M-80 -4 L 70 -4 C 60 10 40 16 -2 16 C -46 16 -70 10 -80 -4 Z" fill="#f3f5f7" stroke="#9aa4ad" strokeWidth="1.2" />
        <path d="M-74 2 L 64 2" stroke="#1f6feb" strokeWidth="3" />
      </g>
      <path d="M0 170 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#9fd3ff" strokeWidth="2" opacity="0.5" />
      <path d="M-20 192 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#9fd3ff" strokeWidth="2" opacity="0.35" />
      <path d="M0 214 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#9fd3ff" strokeWidth="2" opacity="0.25" />
      <path d="M80 174 q40 6 90 -2" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}
