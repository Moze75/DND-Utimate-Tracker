import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
};

export default function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`relative rounded-xl ${className}`} {...rest}>
      {/* Liseré animé quand sélectionné */}
      {selected && (
        <>
          {/* Anneau: on affiche uniquement la bordure via mask, avec un "arc" lumineux qui tourne */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl will-change-transform"
            style={{
              // épaisseur du liseré
              padding: '2px',

              // Wedge (arc) lumineux: segment étroit de 20° qui ressort
              // On met le reste transparent pour que seul l'arc soit visible
              background:
                'conic-gradient(from 0deg, rgba(0,0,0,0) 0deg, rgba(0,0,0,0) 340deg, rgba(239,68,68,0.95) 350deg, rgba(190,18,60,0.9) 356deg, rgba(127,29,29,0.95) 360deg)',

              // Masque: on garde uniquement le "ring" (bordure), pas le centre
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor' as any,
              maskComposite: 'exclude' as any,

              // Mouvement horaire: on fait tourner le calque entier
              animation: 'card-sweep-rotate 3.2s linear infinite',

              // Légère lueur externe
              boxShadow:
                '0 0 10px rgba(127,29,29,0.25), 0 0 22px rgba(127,29,29,0.22)',
              borderRadius: '0.75rem',
              transformOrigin: '50% 50%',
            }}
          />

          {/* Halo intérieur subtil pour renforcer l’effet sans envahir le contenu */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow:
                'inset 0 0 26px rgba(239,68,68,0.12), inset 0 0 60px rgba(127,29,29,0.10)',
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

      {/* Keyframes une seule fois (le navigateur dé-duplique) */}
      <style>{`
        @keyframes card-sweep-rotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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