import React, { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const total = Math.max(1, totalSteps); // évite la division par 0 si jamais
  const percent = Math.max(0, Math.min(100, (currentStep / total) * 100));

  // === Lecture musicale (Skyrim 8-bit) ===
  const MUSIC_SRC = '/Music/Skyrim8bits.mp3';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [hasTriedAutoStart, setHasTriedAutoStart] = useState(false);

  // Détecte l'étape "Race" (français/variantes courantes)
  const raceStepIndex = steps.findIndex((s) => {
    const t = (s || '').toLowerCase();
    return (
      t.includes('race') || // ex: "Race", "Choix de la race"
      t.includes('peuple') || // parfois utilisé
      t.includes('ancestr') // "Ancestry/Ancestral" si jamais
    );
  });

  // On tente de démarrer la musique automatiquement dès l'étape "Race"
  const shouldAutoStart = raceStepIndex !== -1 && currentStep === raceStepIndex;

  useEffect(() => {
    if (!shouldAutoStart || hasTriedAutoStart) return;
    const audio = audioRef.current;
    if (!audio) return;

    setHasTriedAutoStart(true);
    audio.loop = true;
    audio.volume = 0.35; // volume modéré par défaut
    audio.play()
      .then(() => {
        setIsPlaying(true);
        setAutoPlayBlocked(false);
      })
      .catch(() => {
        // La politique d'autoplay du navigateur a probablement bloqué
        setIsPlaying(false);
        setAutoPlayBlocked(true);
      });
  }, [shouldAutoStart, hasTriedAutoStart]);

  // Nettoyage à l'unmount
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        setAutoPlayBlocked(false);
      } catch {
        setAutoPlayBlocked(true);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Bandeau pleine largeur avec image de fond - tout en haut */}
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-8">
        {/* Image de fond */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/background/ddbground.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay blanc transparent (20% d'opacité pour plus de transparence) */}
          <div className="absolute inset-0 bg-white/20"></div>
        </div>

        {/* Contenu par-dessus le fond */}
        <div className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
          {/* Titre principal */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-blue-900 mb-2 drop-shadow-lg">
              Créez votre personnage
            </h1>
            <p className="text-blue-800 drop-shadow">
              Choisissez vite mais choisissez bien
            </p>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-800/70 rounded-full h-2 mb-4" aria-hidden="true">
            <div
              className="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              role="progressbar"
            />
          </div>

          {/* Libellés d'étapes */}
          <div className="text-xs sm:text-sm text-blue-900 overflow-x-auto">
            <ol className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 sm:gap-x-6 gap-y-2 whitespace-nowrap">
              {steps.map((step, index) => {
                const isDone = index < currentStep;
                const isCurrent = index === currentStep;
                const dotClass = isDone
                  ? 'bg-red-600'
                  : isCurrent
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-blue-600';

                const textClass = isDone
                  ? 'text-red-700'
                  : isCurrent
                    ? 'text-blue-900'
                    : 'text-blue-700';

                return (
                  <li key={index} className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${dotClass} drop-shadow`}
                      aria-hidden="true"
                    />
                    <span className={`transition-colors font-medium ${textClass} drop-shadow`}>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Contrôles musique en dessous du bandeau */}
      <div className="mt-4 flex items-center justify-end max-w-6xl mx-auto px-4">
        <button
          type="button"
          onClick={togglePlayback}
          className={`text-xs sm:text-sm px-3 py-1.5 rounded-md border transition-colors
            ${isPlaying ? 'border-red-600 text-red-200 hover:bg-red-900/30' : 'border-gray-600 text-gray-300 hover:bg-gray-800/30'}
          `}
          title={autoPlayBlocked && !isPlaying ? "Cliquez pour activer la musique" : (isPlaying ? "Arrêter la musique" : "Lire la musique")}
        >
          {isPlaying ? '⏸ Arrêter la musique' : '▶️ Lire la musique'}
        </button>
        {/* Elément audio caché */}
        <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />
      </div>

      {/* Alerte discrète si l'autoplay a été bloqué */}
      {autoPlayBlocked && !isPlaying && (
        <div className="mt-2 mb-8 text-[11px] sm:text-xs text-gray-500 max-w-6xl mx-auto px-4">
          Astuce: l'autoplay a été bloqué par votre navigateur. Cliquez sur "Lire la musique" pour l'activer.
        </div>
      )}
    </div>
  );
}