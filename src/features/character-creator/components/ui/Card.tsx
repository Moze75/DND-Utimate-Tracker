import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
};

export default function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`relative rounded-xl ${className}`} {...rest}>
      {selected && (
        <>
          {/* Liseré conique animé autour de la carte */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              padding: '2px',
              background:
                'conic-gradient(from 0deg, rgba(239,68,68,0.9), rgba(190,18,60,0.85), rgba(127,29,29,0.95), rgba(239,68,68,0.9))',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor' as any,
              maskComposite: 'exclude' as any,
              animation: 'card-ring-spin 6s linear infinite',
              boxShadow:
                '0 0 10px rgba(239,68,68,0.25), 0 0 22px rgba(127,29,29,0.25)',
              borderRadius: '0.75rem',
            }}
          />
          {/* Halo intérieur doux */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow:
                'inset 0 0 30px rgba(239,68,68,0.14), inset 0 0 60px rgba(127,29,29,0.12)',
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
            ? 'border-red-600/50 bg-gray-900/60'
            : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600/70'
        }`}
      >
        {children}
      </div>

      {/* Keyframes (injectées dans le DOM; duplication sans effet néfaste) */}
      <style>{`
        @keyframes card-ring-spin {
          0%   { transform: rotate(0deg);   filter: hue-rotate(0deg); }
          100% { transform: rotate(360deg); filter: hue-rotate(360deg); }
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