import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
};

export default function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`relative rounded-xl ${className}`} {...rest}>
      {selected && (
        <>
          {/* Liseré rouge statique + pulse doux (bord extérieur) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl will-change-transform"
            style={{
              padding: '2px', // épaisseur du liseré
              background:
                // dégradé 360° pour un rendu "magique", mais sans rotation
                'conic-gradient(from 0deg, rgba(239,68,68,0.95), rgba(190,18,60,0.9), rgba(127,29,29,0.95), rgba(239,68,68,0.95))',

              // Masque pour ne garder que la bordure (ring)
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor' as any,
              maskComposite: 'exclude' as any,

              // Pulse sur opacité + luminosité (pas de déplacement)
              animation: 'card-border-pulse 2.2s ease-in-out infinite',
              borderRadius: '0.75rem',
            }}
          />

          {/* Halo intérieur qui pulse en synchronisation (discret) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow:
                'inset 0 0 26px rgba(239,68,68,0.10), inset 0 0 60px rgba(127,29,29,0.10)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '0.75rem',
              animation: 'card-inner-glow 2.2s ease-in-out infinite',
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

      {/* Keyframes (une seule fois, le navigateur dé-duplique) */}
      <style>{`
        @keyframes card-border-pulse {
          0%   { opacity: 0.70; filter: brightness(1) saturate(1); box-shadow: 0 0 12px rgba(239,68,68,0.18), 0 0 28px rgba(127,29,29,0.14); }
          50%  { opacity: 1.00; filter: brightness(1.15) saturate(1.08); box-shadow: 0 0 18px rgba(239,68,68,0.28), 0 0 42px rgba(127,29,29,0.22); }
          100% { opacity: 0.70; filter: brightness(1) saturate(1); box-shadow: 0 0 12px rgba(239,68,68,0.18), 0 0 28px rgba(127,29,29,0.14); }
        }
        @keyframes card-inner-glow {
          0%   { box-shadow: inset 0 0 22px rgba(239,68,68,0.10), inset 0 0 48px rgba(127,29,29,0.08); }
          50%  { box-shadow: inset 0 0 30px rgba(239,68,68,0.16), inset 0 0 66px rgba(127,29,29,0.12); }
          100% { box-shadow: inset 0 0 22px rgba(239,68,68,0.10), inset 0 0 48px rgba(127,29,29,0.08); }
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