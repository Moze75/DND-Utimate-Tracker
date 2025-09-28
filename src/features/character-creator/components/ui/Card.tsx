import React, { useState, useRef, useEffect } from 'react';

// Composant pour les particules flottantes
const FloatingParticles = ({ isActive, color = 'red' }) => {
  const particlesRef = useRef([]);
  
  useEffect(() => {
    if (isActive) {
      particlesRef.current = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: i * 0.3,
        duration: 2 + Math.random() * 2,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      }));
    }
  }, [isActive]);

  if (!isActive) return null;

  const colorMap = {
    red: 'rgba(239,68,68,0.7)',
    violet: 'rgba(139,92,246,0.7)',
    amber: 'rgba(245,158,11,0.7)',
    emerald: 'rgba(16,185,129,0.7)'
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {particlesRef.current.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: colorMap[color] || colorMap.red,
            animation: `float-particle-${particle.id} ${particle.duration}s ease-in-out infinite ${particle.delay}s, particle-glow 1.5s ease-in-out infinite`,
            boxShadow: `0 0 8px ${colorMap[color] || colorMap.red}`,
          }}
        />
      ))}
      <style>{`
        ${particlesRef.current.map(p => `
          @keyframes float-particle-${p.id} {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
            33% { transform: translateY(-15px) rotate(120deg); opacity: 1; }
            66% { transform: translateY(-8px) rotate(240deg); opacity: 0.8; }
          }
        `).join('')}
        @keyframes particle-glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
      `}</style>
    </div>
  );
};

// Composant pour l'effet de scan/rayon
const ScanEffect = ({ isActive }) => {
  if (!isActive) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(239,68,68,0.3) 50%, transparent 70%)',
          animation: 'scan-sweep 3s ease-in-out infinite',
          transform: 'translateX(-100%)',
        }}
      />
      <style>{`
        @keyframes scan-sweep {
          0% { transform: translateX(-100%) rotate(45deg); }
          50% { transform: translateX(100%) rotate(45deg); }
          100% { transform: translateX(-100%) rotate(45deg); }
        }
      `}</style>
    </div>
  );
};

// Composant pour l'effet de corruption/glitch
const GlitchEffect = ({ isActive }) => {
  if (!isActive) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(239,68,68,0.1) 2px,
              rgba(239,68,68,0.1) 4px
            )
          `,
          animation: 'glitch-lines 0.1s steps(2) infinite',
        }}
      />
      <style>{`
        @keyframes glitch-lines {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
  variant?: 'default' | 'epic' | 'legendary' | 'mythic';
  glowIntensity?: 'subtle' | 'normal' | 'intense';
  effectType?: 'pulse' | 'scan' | 'particles' | 'glitch' | 'all';
};

export default function Card({ 
  selected = false, 
  className = '', 
  children, 
  variant = 'default',
  glowIntensity = 'normal',
  effectType = 'all',
  ...rest 
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const cardRef = useRef(null);

  // Animation de sélection
  useEffect(() => {
    if (selected) {
      setJustSelected(true);
      const timer = setTimeout(() => setJustSelected(false), 800);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  // Configurations par variant
  const variantConfig = {
    default: {
      colors: {
        primary: 'rgba(239,68,68,0.95)',
        secondary: 'rgba(190,18,60,0.9)',
        tertiary: 'rgba(127,29,29,0.95)',
      },
      particleColor: 'red'
    },
    epic: {
      colors: {
        primary: 'rgba(139,92,246,0.95)',
        secondary: 'rgba(124,58,237,0.9)',
        tertiary: 'rgba(88,28,135,0.95)',
      },
      particleColor: 'violet'
    },
    legendary: {
      colors: {
        primary: 'rgba(245,158,11,0.95)',
        secondary: 'rgba(217,119,6,0.9)',
        tertiary: 'rgba(180,83,9,0.95)',
      },
      particleColor: 'amber'
    },
    mythic: {
      colors: {
        primary: 'rgba(16,185,129,0.95)',
        secondary: 'rgba(5,150,105,0.9)',
        tertiary: 'rgba(6,120,95,0.95)',
      },
      particleColor: 'emerald'
    }
  };

  const config = variantConfig[variant];
  const intensity = {
    subtle: 0.7,
    normal: 1,
    intense: 1.3
  }[glowIntensity];

  return (
    <div 
      ref={cardRef}
      className={`relative rounded-xl cursor-pointer transition-transform duration-200 ${
        isHovered ? 'transform scale-[1.02]' : ''
      } ${className}`} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...rest}
    >
      {selected && (
        <>
          {/* Liseré principal avec rotation magique */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl will-change-transform"
            style={{
              padding: '2px',
              background: `conic-gradient(from 0deg, ${config.colors.primary}, ${config.colors.secondary}, ${config.colors.tertiary}, ${config.colors.primary})`,
              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor' as any,
              maskComposite: 'exclude' as any,
              animation: `card-border-rotation 4s linear infinite, card-border-pulse 2.2s ease-in-out infinite`,
              borderRadius: '0.75rem',
              filter: `brightness(${1 + (intensity - 1) * 0.3}) saturate(${1 + (intensity - 1) * 0.2})`,
            }}
          />

          {/* Halo extérieur intense */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow: `
                0 0 ${20 * intensity}px ${config.colors.primary}40,
                0 0 ${40 * intensity}px ${config.colors.secondary}30,
                0 0 ${80 * intensity}px ${config.colors.tertiary}20
              `,
              animation: 'outer-glow-pulse 2s ease-in-out infinite',
              borderRadius: '0.75rem',
            }}
          />

          {/* Halo intérieur avec ondulation */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow: `
                inset 0 0 ${30 * intensity}px ${config.colors.primary}20,
                inset 0 0 ${60 * intensity}px ${config.colors.secondary}15
              `,
              border: `1px solid ${config.colors.primary}60`,
              borderRadius: '0.75rem',
              animation: 'card-inner-ripple 3s ease-in-out infinite',
            }}
          />

          {/* Animation de sélection explosive */}
          {justSelected && (
            <div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background: `radial-gradient(circle, ${config.colors.primary}40 0%, transparent 70%)`,
                animation: 'selection-burst 0.8s ease-out forwards',
              }}
            />
          )}

          {/* Effets spéciaux selon le type */}
          {(effectType === 'particles' || effectType === 'all') && (
            <FloatingParticles isActive={selected} color={config.particleColor} />
          )}
          
          {(effectType === 'scan' || effectType === 'all') && isHovered && (
            <ScanEffect isActive={selected} />
          )}
          
          {(effectType === 'glitch' || effectType === 'all') && variant === 'mythic' && (
            <GlitchEffect isActive={selected} />
          )}
        </>
      )}

      {/* Contenu de la carte avec effet de profondeur */}
      <div
        className={`relative z-10 rounded-xl border transition-all duration-300 ${
          selected
            ? `border-${config.particleColor}-700/60 bg-gray-900/80 backdrop-blur-sm`
            : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600/70 hover:bg-gray-900/60'
        } ${isHovered && !selected ? 'transform translate-y-[-1px] shadow-lg' : ''}`}
        style={{
          backdropFilter: selected ? 'blur(8px) saturate(1.2)' : undefined,
        }}
      >
        {children}
      </div>

      {/* Keyframes CSS intégrés */}
      <style>{`
        @keyframes card-border-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes card-border-pulse {
          0%   { 
            opacity: 0.70; 
            filter: brightness(1) saturate(1); 
            box-shadow: 
              0 0 12px ${config.colors.primary}30,
              0 0 28px ${config.colors.secondary}25;
          }
          50%  { 
            opacity: 1.00; 
            filter: brightness(1.2) saturate(1.1); 
            box-shadow: 
              0 0 20px ${config.colors.primary}40,
              0 0 45px ${config.colors.secondary}35;
          }
          100% { 
            opacity: 0.70; 
            filter: brightness(1) saturate(1); 
            box-shadow: 
              0 0 12px ${config.colors.primary}30,
              0 0 28px ${config.colors.secondary}25;
          }
        }
        
        @keyframes card-inner-ripple {
          0%   { 
            box-shadow: 
              inset 0 0 ${25 * intensity}px ${config.colors.primary}15,
              inset 0 0 ${50 * intensity}px ${config.colors.secondary}10;
          }
          33%  { 
            box-shadow: 
              inset 0 0 ${35 * intensity}px ${config.colors.primary}25,
              inset 0 0 ${70 * intensity}px ${config.colors.secondary}18;
          }
          66%  { 
            box-shadow: 
              inset 0 0 ${30 * intensity}px ${config.colors.primary}20,
              inset 0 0 ${60 * intensity}px ${config.colors.secondary}15;
          }
          100% { 
            box-shadow: 
              inset 0 0 ${25 * intensity}px ${config.colors.primary}15,
              inset 0 0 ${50 * intensity}px ${config.colors.secondary}10;
          }
        }
        
        @keyframes outer-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        @keyframes selection-burst {
          0% { 
            transform: scale(0.8); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.1); 
            opacity: 0.7; 
          }
          100% { 
            transform: scale(1.3); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>
  );
}

// Composants helper inchangés mais avec support des nouveaux effets
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

// Exemple d'utilisation avec démonstration
export function CardDemo() {
  const [selectedCards, setSelectedCards] = useState(new Set([0]));

  const cards = [
    { variant: 'default', title: 'Guerrier', effect: 'all' },
    { variant: 'epic', title: 'Mage Élémentaire', effect: 'particles' },
    { variant: 'legendary', title: 'Paladin Solaire', effect: 'scan' },
    { variant: 'mythic', title: 'Assassin Dimensionnel', effect: 'glitch' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Sélection de Classe - Gaming UI
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <Card
              key={index}
              selected={selectedCards.has(index)}
              variant={card.variant}
              effectType={card.effect}
              glowIntensity="normal"
              onClick={() => {
                const newSelected = new Set(selectedCards);
                if (newSelected.has(index)) {
                  newSelected.delete(index);
                } else {
                  newSelected.add(index);
                }
                setSelectedCards(newSelected);
              }}
            >
              <CardHeader>
                <h3 className="text-xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="text-gray-400 capitalize">
                  Rareté: {card.variant}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Une classe {card.variant} avec des effets {card.effect === 'all' ? 'complets' : card.effect}.
                  Cliquez pour sélectionner et voir les animations en action !
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Fonctionnalités Gaming :</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Bordures rotatives avec dégradé magique</li>
            <li>• Particules flottantes animées</li>
            <li>• Effets de scan et de glitch</li>
            <li>• Animation explosive lors de la sélection</li>
            <li>• Variants de rareté (default, epic, legendary, mythic)</li>
            <li>• Intensité réglable des effets</li>
            <li>• Hover effects avec transformation 3D</li>
            <li>• Backdrop blur et effets de profondeur</li>
          </ul>
        </div>
      </div>
    </div>
  );
}