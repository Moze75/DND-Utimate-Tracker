import React, { useState } from 'react';
import {
  Moon,
  Star,
  Dice1 as DiceD20,
  Brain,
  Shield,
  Plus,
  Minus,
  User,
  Sword,
  Sparkles,
  Menu,
} from 'lucide-react';
import { Player, PlayerStats } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Avatar } from './Avatar';
import { CONDITIONS } from './ConditionsSection';
import { PlayerProfileSettingsModal } from './PlayerProfileSettingsModal';
import { SwipeNavigator } from './SwipeNavigator'; // <-- pour le geste en bord d'écran

/* ============================ Helpers ============================ */

export interface PlayerProfileProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

export function PlayerProfile({ player, onUpdate }: PlayerProfileProps) {
  const [editing, setEditing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<'ac' | 'speed' | 'initiative' | 'proficiency' | null>(null);

  // Dérive les stats pour l’affichage (fallbacks sûrs)
  const stats: PlayerStats = player.stats || {
    armor_class: 10,
    initiative: 0,
    speed: 30,
    proficiency_bonus: 2,
    inspirations: player.stats?.inspirations || 0,
  };

  /* ============================ Repos court / long ============================ */

  const handleShortRest = async () => {
    if (!player.hit_dice || player.hit_dice.total - player.hit_dice.used <= 0) {
      toast.error('Aucun dé de vie disponible');
      return;
    }
    try {
      const hitDieSize = (() => {
        switch (player.class) {
          case 'Barbare': return 12;
          case 'Guerrier':
          case 'Paladin':
          case 'Rôdeur': return 10;
          case 'Barde':
          case 'Clerc':
          case 'Druide':
          case 'Moine':
          case 'Roublard':
          case 'Occultiste':
            return 8;
          case 'Magicien':
          case 'Ensorceleur': return 6;
          default: return 8;
        }
      })();

      const roll = Math.floor(Math.random() * hitDieSize) + 1;
      const constitutionMod = player.abilities?.find(a => a.name === 'Constitution')?.modifier || 0;
      const healing = Math.max(1, roll + constitutionMod);

      // Restaure 1 Conduit divin au Paladin (si utilisé)
      const nextCR: any = { ...(player.class_resources || {}) };
      let recoveredLabel = '';
      if (player.class === 'Paladin' && typeof nextCR.used_channel_divinity === 'number') {
        const before = nextCR.used_channel_divinity || 0;
        nextCR.used_channel_divinity = Math.max(0, before - 1);
        if (before > 0) recoveredLabel = ' (+1 Conduit divin récupéré)';
      }

      const { error } = await supabase
        .from('players')
        .update({
          current_hp: Math.min(player.max_hp, player.current_hp + healing),
          hit_dice: {
            ...player.hit_dice,
            used: player.hit_dice.used + 1
          },
          class_resources: nextCR
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        current_hp: Math.min(player.max_hp, player.current_hp + healing),
        hit_dice: {
          ...player.hit_dice,
          used: player.hit_dice.used + 1
        },
        class_resources: nextCR
      });

      toast.success(`Repos court : +${healing} PV${recoveredLabel}`);
    } catch (error) {
      console.error('Erreur lors du repos court:', error);
      toast.error('Erreur lors du repos');
    }
  };

  const handleLongRest = async () => {
    try {
      const nextCR: any = { ...(player.class_resources || {}) };
      nextCR.used_rage = 0;
      nextCR.used_bardic_inspiration = 0;
      nextCR.used_channel_divinity = 0; // Clerc & Paladin
      nextCR.used_wild_shape = 0;
      nextCR.used_sorcery_points = 0;
      nextCR.used_action_surge = 0;
      nextCR.used_arcane_recovery = false;
      nextCR.used_credo_points = 0;
      nextCR.used_ki_points = 0;
      nextCR.used_lay_on_hands = 0;
      nextCR.used_favored_foe = 0;
      nextCR.used_innate_sorcery = 0;              // Ensorceleur — Sorcellerie innée
      nextCR.used_supernatural_metabolism = 0;     // Moine — Métabolisme surnaturel

      const { error } = await supabase
        .from('players')
        .update({
          current_hp: player.max_hp,
          temporary_hp: 0,
          hit_dice: {
            total: player.level,
            used: Math.max(0, player.hit_dice?.used - Math.floor(player.level / 2) || 0)
          },
          class_resources: nextCR,
          spell_slots: {
            ...player.spell_slots,
            used1: 0, used2: 0, used3: 0, used4: 0,
            used5: 0, used6: 0, used7: 0, used8: 0, used9: 0
          },
          is_concentrating: false,
          concentration_spell: null
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        current_hp: player.max_hp,
        temporary_hp: 0,
        hit_dice: {
          total: player.level,
          used: Math.max(0, player.hit_dice?.used - Math.floor(player.level / 2) || 0)
        },
        class_resources: nextCR,
        spell_slots: {
          ...player.spell_slots,
          used1: 0, used2: 0, used3: 0, used4: 0,
          used5: 0, used6: 0, used7: 0, used8: 0, used9: 0
        },
        is_concentrating: false,
        concentration_spell: null
      });

      toast.success('Repos long effectué (toutes les ressources restaurées)');
    } catch (error) {
      console.error('Erreur lors du repos long:', error);
      toast.error('Erreur lors du repos');
    }
  };

  /* ============================ Icône de classe (optionnel) ============================ */

  const getClassIcon = (playerClass: string | null | undefined) => {
    switch (playerClass) {
      case 'Guerrier':
      case 'Paladin':
        return <Sword className="w-5 h-5 text-red-500" />;
      case 'Magicien':
      case 'Ensorceleur':
      case 'Occultiste':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'Clerc':
      case 'Druide':
        return <Shield className="w-5 h-5 text-yellow-500" />;
      default:
        return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  /* ============================ Rendu ============================ */

  return (
    <>
            {/* Zone de capture du swipe gauche->droite (bord d'écran) */}
      {/* Masquée sur desktop pour éviter les conflits, active surtout sur mobile */}
      <div className="fixed inset-y-0 left-0 w-4 sm:w-6 z-40 md:hidden">
        <SwipeNavigator
          threshold={45}
          onSwipeRight={() => setEditing(true)}
        >
          <div className="w-full h-full" aria-hidden />
        </SwipeNavigator>
      </div>
      <div className="stat-card">
        <div className="stat-header flex items-start justify-between">
          <div className="flex flex-col gap-4 w-full">
            {/* États actifs */}
            {player.active_conditions && player.active_conditions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {player.active_conditions
                  .map(conditionId => CONDITIONS.find(c => c.id === conditionId))
                  .filter(Boolean)
                  .map(condition => (
                    <div
                      key={condition!.id}
                      className="inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-sm font-medium"
                    >
                      {condition!.name}
                    </div>
                  ))}
              </div>
            )}

            {/* Carte avatar + actions */}
    <div
      className="grid items-start gap-3 sm:gap-4"
      style={{ gridTemplateColumns: 'minmax(0,1fr) 8rem' }}
    >
      <div className="relative w-full min-w-0 aspect-[7/10] sm:aspect-[2/3] rounded-lg overflow-hidden bg-gray-800/50 flex items-center justify-center">
        {/* Bouton paramètres en haut-gauche (icône hamburger) */}
        <button
          onClick={() => setEditing(true)}
          className="absolute top-2 left-2 w-9 h-9 rounded-full bg-gray-900/40 backdrop-blur-sm text-white hover:bg-gray-800/50 hover:text-white flex items-center justify-center z-10 transition-colors"
          title="Profil et caractéristiques"
        >
          <Menu className="w-5 h-5" />
        </button>

    <Avatar
      url={player.avatar_url || ''}
      playerId={player.id}
      size="lg"
      editable={false}
      onAvatarUpdate={() => {}}
    />

    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pointer-events-none">
      <div className="text-white">
        <h3 className="text-lg font-bold text-white drop-shadow-lg">
          {player.adventurer_name || player.name}
        </h3>
        {player.class && (
          <p className="text-sm text-gray-200 drop-shadow-md">
            {player.class} niveau {player.level}
          </p>
        )}
      </div>
    </div>
  </div>

              {/* Colonne boutons (repos / inspirations / concentration) */}
              <div className="flex flex-col gap-3 sm:gap-4 items-stretch w-32 justify-start">
                {/* Inspirations */}
                <div className="w-32 rounded text-sm bg-gray-800/50 flex flex-col">
                  <div className="text-gray-400 text-sm text-center h-8 flex items-center justify-center gap-1">
                    <span className="ml-3">Inspiration</span>
                    <Star className="w-4 h-4 ml-2" />
                  </div>
                  <div className="flex items-center justify-center gap-2 h-8">
                    <button
                      onClick={async () => {
                        try {
                          const newValue = Math.max(0, (player.stats?.inspirations || 0) - 1);
                          const newStats = { ...(player.stats || {}), inspirations: newValue } as PlayerStats;
                          const { error } = await supabase.from('players').update({ stats: newStats }).eq('id', player.id);
                          if (error) throw error;
                          onUpdate({ ...player, stats: newStats });
                          toast.success('Inspiration retirée');
                        } catch (error) {
                          console.error('Erreur maj inspiration:', error);
                          toast.error('Erreur lors de la mise à jour');
                        }
                      }}
                      className={`w-6 h-6 flex items-center justify-center rounded ${
                        (player.stats?.inspirations || 0) > 0
                          ? 'text-yellow-500 hover:bg-yellow-500/20'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={(player.stats?.inspirations || 0) <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`font-medium w-4 text-center ${(player.stats?.inspirations || 0) > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {player.stats?.inspirations || 0}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const newValue = Math.min(3, (player.stats?.inspirations || 0) + 1);
                          const newStats = { ...(player.stats || {}), inspirations: newValue } as PlayerStats;
                          const { error } = await supabase.from('players').update({ stats: newStats }).eq('id', player.id);
                          if (error) throw error;
                          onUpdate({ ...player, stats: newStats });
                          toast.success('Inspiration ajoutée');
                        } catch (error) {
                          console.error('Erreur maj inspiration:', error);
                          toast.error('Erreur lors de la mise à jour');
                        }
                      }}
                      className={`w-6 h-6 flex items-center justify-center rounded ${
                        (player.stats?.inspirations || 0) < 3
                          ? 'text-yellow-500 hover:bg-yellow-500/20'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={(player.stats?.inspirations || 0) >= 3}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Repos */}
                <button
                  onClick={handleLongRest}
                  className="w-32 h-9 rounded text-sm bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 flex items-center justify-between px-3"
                >
                  <span className="ml-1.5 flex-1 text-left">Repos long</span>
                  <Moon className="w-4 h-4" />
                </button>

                <button
                  onClick={handleShortRest}
                  className="w-32 h-9 rounded text-sm bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 flex items-center justify-between px-3"
                >
                  <span className="ml-1.5 flex-1 text-left">Repos court</span>
                  <DiceD20 className="w-4 h-4" />
                </button>

                {/* Dés de vie */}
                {player.hit_dice && (
                  <div className="w-32 px-2 py-1 text-sm bg-gray-800/30 rounded flex flex-col items-center">
                    <span className="text-gray-400 mb-0.5">Dés de vie</span>
                    <span className="text-gray-300 font-medium text-center">
                      {player.hit_dice.total - player.hit_dice.used} / {player.hit_dice.total}
                    </span>
                  </div>
                )}

                {/* Concentration toggle */}
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('players')
                        .update({
                          is_concentrating: !player.is_concentrating,
                          concentration_spell: !player.is_concentrating ? 'Sort actif' : null
                        })
                        .eq('id', player.id);
                      if (error) throw error;

                      onUpdate({
                        ...player,
                        is_concentrating: !player.is_concentrating,
                        concentration_spell: !player.is_concentrating ? 'Sort actif' : null
                      });

                      toast.success(player.is_concentrating ? 'Concentration interrompue' : 'Concentration activée');
                    } catch (error) {
                      console.error('Erreur concentration:', error);
                      toast.error('Erreur lors de la modification de la concentration');
                    }
                  }}
                  className={`w-32 h-9 rounded text-sm flex items-center px-3 transition-all duration-200 ${
                    player.is_concentrating 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse' 
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="ml-auto inline-flex items-center gap-1">
                    <span>Concentration</span>
                    <Brain className={`w-4 h-4 ${player.is_concentrating ? 'text-purple-400' : 'text-gray-400'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div></div>
        </div>

        {/* Mini-grille des stats */}
        <div className="grid grid-cols-4 gap-4 mt-2 bg-gray-800/50 rounded-lg py-1">
          {/* CA */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'ac' ? null : 'ac')}
            >
              <Shield className="absolute inset-0 w-full h-full text-gray-400 stroke-[1.5] scale-125" />
              <div className="absolute inset-0 flex items-center justify-center -translate-y-1 text-lg font-bold text-gray-100 z-10">
                {stats.armor_class}
              </div>
              {activeTooltip === 'ac' && (
                <>
                  <div className="fixed inset-0" onClick={() => setActiveTooltip(null)} />
                  <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[90vw] shadow-lg border border-white/10">
                    <h4 className="font-semibold text-gray-100 mb-1">Classe d'Armure</h4>
                    <p className="mb-2">Détermine la difficulté pour vous toucher en combat.</p>
                    <p className="text-gray-400">Calcul de base :</p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      <li>10 + modificateur de Dextérité</li>
                      <li>+ bonus d'armure (si équipée)</li>
                      <li>+ bonus de bouclier (si équipé)</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1" />
          </div>

          {/* Vitesse */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-12 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'speed' ? null : 'speed')}
            >
              <div className="text-lg font-bold text-gray-100">
                {stats.speed} m
              </div>
              {activeTooltip === 'speed' && (
                <>
                  <div className="fixed inset-0" onClick={() => setActiveTooltip(null)} />
                  <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[90vw] shadow-lg border border-white/10">
                    <h4 className="font-semibold text-gray-100 mb-1">Vitesse</h4>
                    <p className="mb-2">Distance que vous pouvez parcourir en un tour.</p>
                    <div className="text-gray-400">
                      <p>Équivalences :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{stats.speed} mètres = {Math.floor((stats.speed || 0) / 1.5)} cases</li>
                        <li>Course : × 2 ({(stats.speed || 0) * 2} mètres)</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">VIT</div>
          </div>

          {/* Initiative */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'initiative' ? null : 'initiative')}
            >
              <div className="text-lg font-bold text-gray-100">
                {stats.initiative >= 0 ? '+' : ''}{stats.initiative}
              </div>
              {activeTooltip === 'initiative' && (
                <>
                  <div className="fixed inset-0" onClick={() => setActiveTooltip(null)} />
                  <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[90vw] shadow-lg border border-white/10">
                    <h4 className="font-semibold text-gray-100 mb-1">Initiative</h4>
                    <p className="mb-2">Détermine l'ordre d'action en combat.</p>
                    <div className="text-gray-400">
                      <p>Calcul :</p>
                      <ul className="list-disc list-inside">
                        <li>1d20 + modificateur de Dextérité</li>
                        <li>+ bonus spéciaux éventuels</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">INIT</div>
          </div>

          {/* Maîtrise */}
        <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'proficiency' ? null : 'proficiency')}
            >
              <div className="text-lg font-bold text-gray-100">
                +{stats.proficiency_bonus}
              </div>
              {activeTooltip === 'proficiency' && (
                <>
                  <div className="fixed inset-0" onClick={() => setActiveTooltip(null)} />
                  <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[90vw] shadow-lg border border-white/10">
                    <h4 className="font-semibold text-gray-100 mb-1">Bonus de Maîtrise</h4>
                    <p>Représente votre expertise générale.</p>
                    <div className="text-gray-400">
                      <p>S'applique à :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Jets d'attaque avec armes maîtrisées</li>
                        <li>DD des sorts</li>
                        <li>Compétences maîtrisées</li>
                        <li>Jets de sauvegarde maîtrisés</li>
                      </ul>
                      <p className="mt-2">Note : Ne s'applique pas aux dégâts !</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">MAÎT</div>
          </div>
        </div>
      </div>

      <PlayerProfileSettingsModal
        open={editing}
        onClose={() => setEditing(false)}
        player={player}
        onUpdate={onUpdate}
      />
    </>
  );
}