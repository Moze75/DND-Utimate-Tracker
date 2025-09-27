import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
};

export default function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`relative rounded-xl ${className}`} {...rest}>
      {/* Anneau animé uniquement si sélectionné */}
      {selected && (
        <>
          {/* SVG qui dessine un "trait" discontinu tournant sur le pourtour */}
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full rounded-xl"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              {/* Dégradé rouge "magique" pour le trait */}
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(239,68,68,1)" />
                <stop offset="50%" stopColor="rgba(190,18,60,0.95)" />
                <stop offset="100%" stopColor="rgba(127,29,29,1)" />
              </linearGradient>
              {/* Blur doux pour halo sur le trait */}
              <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Trait animé: stroke-dasharray (segment visible + gap), animé via dashoffset */}
            <rect
              x="2"
              y="2"
              width="96"
              height="96"
              rx="8"
              ry="8"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              // Longueur normalisée à 100 pour simplifier l'animation
              pathLength={100}
              // Trait visible ~12% + gap ~88% (ajustable)
              strokeDasharray="12 88"
              // Mouvement horaire: offset décroît de 0 à -100 en boucle
              style={{ animation: 'card-dash-move 2.6s linear infinite' as any, filter: 'url(#ringGlow)' }}
            />

            {/* Un fin liseré rouge statique discret sous-jacent pour donner du corps au contour */}
            <rect
              x="2"
              y="2"
              width="96"
              height="96"
              rx="8"
              ry="8"
              fill="none"
              stroke="rgba(239,68,68,0.25)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Halo intérieur subtil, reste sur les bords sans gêner le contenu */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow:
                'inset 0 0 22px rgba(239,68,68,0.12), inset 0 0 48px rgba(127,29,29,0.10)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '0.75rem',
            }}
          />
        </>
      )}

      {/* Contenu de la carte */}
      <div
        className={`relative z-10 rounded-xl border transition-colors ${
          selected
            ? 'border-red-700/60 bg-gray-900/60'
            : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600/70'
        }`}
      >
        {children}
      </div>

      {/* Keyframes pour l’animation du dash qui tourne (sens horaire) */}
      <style>{`
        @keyframes card-dash-move {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = '', ...rest } = props;
  return (
    <div
      className={`p-4 border-b border-gray-700/50 ${className}`}
      {...rest}
    />
  );
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = '', ...rest } = props;
  return <div className={`p-4 ${className}`} {...rest} />;
}