import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Heart, Dices } from 'lucide-react';
import { Player, DndClass } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
}

/* ============================ Helpers ============================ */

const getHitDieSize = (playerClass: DndClass | null | undefined): number => {
  switch (playerClass) {
    case 'Barbare': return 12;
    case 'Guerrier':
    case 'Paladin':
    case 'Rôdeur': return 10;
    case 'Barde':
    case 'Clerc':
    case 'Druide':
    case 'Moine':
    case 'Roublard':
    case 'Sorcier': return 8;
    case 'Magicien':
    case 'Ensorceleur': return 6;
    default: return 8;
  }
};

const getAverageHpGain = (hitDieSize: number): number => {
  return Math.floor((hitDieSize / 2) + 1);
};

// Modificateur de Charisme depuis StatsTab (player.abilities) — robuste
const getChaModFromPlayer = (player: Player): number => {
  const abilities: any = (player as any)?.abilities;
  if (Array.isArray(abilities)) {
    const cha = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return n === 'charisme' || n === 'charisma' || n === 'cha' || n === 'car';
    });
    if (cha) {
      if (typeof cha.modifier === 'number' && Number.isFinite(cha.modifier)) return cha.modifier;
      if (typeof cha.score === 'number' && Number.isFinite(cha.score)) return Math.floor((cha.score - 10) / 2);
      if (typeof cha.modifier === 'string') {
        const n = Number(cha.modifier.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return n;
      }
      if (typeof cha.score === 'string') {
        const n = Number(cha.score.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return Math.floor((n - 10) / 2);
      }
    }
  }
  return 0;
};

// Résout le total d'inspiration bardique: override manuel (si défini et valide) sinon auto = mod CHA
const resolveBardicTotal = (player: Player, currentResources: any): { cap: number; hasManual: boolean; manualNum?: number } => {
  const raw = currentResources?.bardic_inspiration;
  if (typeof raw === 'string' && raw.trim() === '') {
    // suppression côté paramètres => auto CHA
    return { cap: getChaModFromPlayer(player), hasManual: false };
  }
  const n = typeof raw === 'string' ? Number(raw) : raw;
  const hasManual = typeof n === 'number' && Number.isFinite(n);
  return {
    cap: hasManual ? (n as number) : getChaModFromPlayer(player),
    hasManual,
    manualNum: hasManual ? (n as number) : undefined
  };
};

/* ============================ Composant ============================ */

export function LevelUpModal({ isOpen, onClose, player, onUpdate }: LevelUpModalProps) {
  const [hpGain, setHpGain] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const hitDieSize = getHitDieSize(player.class);
  const averageHpGain = getAverageHpGain(hitDieSize);
  const constitutionModifier = player.abilities?.find(a => (a.name || a.abbr)?.toString().toLowerCase() === 'constitution')?.modifier || 0;
  const theoreticalHpGain = averageHpGain + constitutionModifier;
  const newLevel = player.level + 1;

  const handleLevelUpWithAutoSave = async () => {
    const hpGainValue = parseInt(hpGain) || 0;
    
    if (hpGainValue < 1) {
      toast.error('Les PV supplémentaires doivent être d\'au moins 1');
      return;
    }

    if (hpGainValue > (hitDieSize + constitutionModifier)) {
      toast.error(`Les PV supplémentaires ne peuvent pas dépasser ${hitDieSize + constitutionModifier}`);
      return;
    }

    setIsProcessing(true);

    try {
      const newMaxHp = player.max_hp + hpGainValue;
      const newCurrentHp = player.current_hp + hpGainValue;
      const newHitDice = {
        total: newLevel,
        used: player.hit_dice?.used || 0
      };

      // Calculer les nouveaux emplacements de sorts selon la classe et le niveau
      const getSpellSlotsByLevel = (playerClass: string | null | undefined, level: number) => {
        const slots: any = {};
        
        // Les moines n'ont pas d'emplacements de sorts
        if (playerClass === 'Moine') {
          return player.spell_slots || {};
        }
        
        // Classes avec sorts complets (Magicien, Ensorceleur, Barde, Clerc, Druide)
        const fullCasters = ['Magicien', 'Ensorceleur', 'Barde', 'Clerc', 'Druide'];
        // Classes avec demi-sorts (Paladin, Rôdeur)
        const halfCasters = ['Paladin', 'Rôdeur'];
        // Classes avec tiers de sorts (Guerrier Eldritch, Roublard Arcanique)
        // const thirdCasters = ['Guerrier', 'Roublard']; // non utilisé ici
        
        if (fullCasters.includes(playerClass || '')) {
          // Progression complète des sorts
          if (level >= 1) {
            slots.level1 = level === 1 ? 2 : level === 2 ? 3 : 4;
            slots.used1 = player.spell_slots?.used1 || 0;
          }
          if (level >= 3) {
            slots.level2 = level === 3 ? 2 : 3;
            slots.used2 = player.spell_slots?.used2 || 0;
          }
          if (level >= 5) {
            slots.level3 = level === 5 ? 2 : 3;
            slots.used3 = player.spell_slots?.used3 || 0;
          }
          if (level >= 7) {
            slots.level4 = level === 7 ? 1 : level === 8 ? 2 : 3;
            slots.used4 = player.spell_slots?.used4 || 0;
          }
          if (level >= 9) {
            slots.level5 = level === 9 ? 1 : level >= 10 ? 2 : 1;
            slots.used5 = player.spell_slots?.used5 || 0;
          }
          if (level >= 11) {
            slots.level6 = 1;
            slots.used6 = player.spell_slots?.used6 || 0;
          }
          if (level >= 13) {
            slots.level7 = 1;
            slots.used7 = player.spell_slots?.used7 || 0;
          }
          if (level >= 15) {
            slots.level8 = 1;
            slots.used8 = player.spell_slots?.used8 || 0;
          }
          if (level >= 17) {
            slots.level9 = 1;
            slots.used9 = player.spell_slots?.used9 || 0;
          }
        } else if (halfCasters.includes(playerClass || '')) {
          // Progression demi-lanceur (Paladin, Rôdeur)
          if (level >= 2) {
            slots.level1 = level === 2 ? 2 : level <= 4 ? 3 : 4;
            slots.used1 = player.spell_slots?.used1 || 0;
          }
          if (level >= 5) {
            slots.level2 = level <= 6 ? 2 : 3;
            slots.used2 = player.spell_slots?.used2 || 0;
          }
          if (level >= 9) {
            slots.level3 = level <= 10 ? 2 : 3;
            slots.used3 = player.spell_slots?.used3 || 0;
          }
          if (level >= 13) {
            slots.level4 = level <= 14 ? 1 : level <= 16 ? 2 : 3;
            slots.used4 = player.spell_slots?.used4 || 0;
          }
          if (level >= 17) {
            slots.level5 = level <= 18 ? 1 : 2;
            slots.used5 = player.spell_slots?.used5 || 0;
          }
        }
        
        return { ...player.spell_slots, ...slots };
      };

      // Calculer les nouvelles ressources de classe selon la classe et le niveau
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            // Ne pas forcer une valeur basée sur le niveau.
            // Si une valeur manuelle existe (numérique), la conserver.
            // Sinon, laisser vide et calculer automatiquement depuis le modificateur CHA côté UI.
            const { cap, hasManual, manualNum } = resolveBardicTotal(player, resources);
            if (hasManual) {
              resources.bardic_inspiration = manualNum!;
            } else {
              // si une chaîne vide traîne, on nettoie
              if (typeof resources.bardic_inspiration === 'string' && resources.bardic_inspiration.trim() === '') {
                delete resources.bardic_inspiration;
              }
            }
            // Toujours borner le "used" sur la capacité (manuel ou auto)
            const upper = Math.max(0, cap);
            resources.used_bardic_inspiration = Math.min(resources.used_bardic_inspiration || 0, upper);
            break;
          }
          case 'Clerc':
            resources.channel_divinity = level >= 6 ? 2 : 1;
            break;
          case 'Druide':
            resources.wild_shape = 2;
            break;
          case 'Ensorceleur':
            resources.sorcery_points = level;
            break;
          case 'Guerrier':
            resources.action_surge = level >= 17 ? 2 : 1;
            break;
          case 'Magicien':
            resources.arcane_recovery = true;
            break;
          case 'Moine':
            resources.ki_points = level;
            break;
          case 'Paladin':
            resources.lay_on_hands = level * 5;
            break;
          case 'Rôdeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      console.log('Mise à jour du niveau:', {
        oldLevel: player.level,
        newLevel,
        oldMaxHp: player.max_hp,
        newMaxHp,
        hpGainValue,
        newSpellSlots,
        newClassResources
      });

      // Sauvegarder directement en base de données
      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources
        })
        .eq('id', player.id);

      if (error) throw error;

      // Mettre à jour l'état du composant parent
      onUpdate({
        ...player,
        level: newLevel,
        max_hp: newMaxHp,
        current_hp: newCurrentHp,
        hit_dice: newHitDice,
        spell_slots: newSpellSlots,
        class_resources: newClassResources
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
      // Fermer automatiquement les paramètres après le passage de niveau
      setTimeout(() => {
        if ((window as any).closeSettings) {
          (window as any).closeSettings();
        }
      }, 500);
    } catch (error) {
      console.error('Erreur lors du passage de niveau:', error);
      toast.error('Erreur lors du passage de niveau');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLevelUp = async () => {
    const hpGainValue = parseInt(hpGain) || 0;
    
    if (hpGainValue < 1) {
      toast.error('Les PV supplémentaires doivent être d\'au moins 1');
      return;
    }

    if (hpGainValue > (hitDieSize + constitutionModifier)) {
      toast.error(`Les PV supplémentaires ne peuvent pas dépasser ${hitDieSize + constitutionModifier}`);
      return;
    }

    setIsProcessing(true);

    try {
      const newMaxHp = player.max_hp + hpGainValue;
      const newCurrentHp = player.current_hp + hpGainValue;
      const newHitDice = {
        total: newLevel,
        used: player.hit_dice?.used || 0
      };

      // Calculer les nouveaux emplacements de sorts selon la classe et le niveau
      const getSpellSlotsByLevel = (playerClass: string | null | undefined, level: number) => {
        const slots: any = {};
        
        // Les moines n'ont pas d'emplacements de sorts
        if (playerClass === 'Moine') {
          return player.spell_slots || {};
        }
        
        // Classes avec sorts complets (Magicien, Ensorceleur, Barde, Clerc, Druide)
        const fullCasters = ['Magicien', 'Ensorceleur', 'Barde', 'Clerc', 'Druide'];
        // Classes avec demi-sorts (Paladin, Rôdeur)
        const halfCasters = ['Paladin', 'Rôdeur'];
        // const thirdCasters = ['Guerrier', 'Roublard']; // non utilisé ici
        
        if (fullCasters.includes(playerClass || '')) {
          // Progression complète des sorts
          if (level >= 1) {
            slots.level1 = level === 1 ? 2 : level === 2 ? 3 : 4;
            slots.used1 = player.spell_slots?.used1 || 0;
          }
          if (level >= 3) {
            slots.level2 = level === 3 ? 2 : 3;
            slots.used2 = player.spell_slots?.used2 || 0;
          }
          if (level >= 5) {
            slots.level3 = level === 5 ? 2 : 3;
            slots.used3 = player.spell_slots?.used3 || 0;
          }
          if (level >= 7) {
            slots.level4 = level === 7 ? 1 : level === 8 ? 2 : 3;
            slots.used4 = player.spell_slots?.used4 || 0;
          }
          if (level >= 9) {
            slots.level5 = level === 9 ? 1 : level >= 10 ? 2 : 1;
            slots.used5 = player.spell_slots?.used5 || 0;
          }
          if (level >= 11) {
            slots.level6 = 1;
            slots.used6 = player.spell_slots?.used6 || 0;
          }
          if (level >= 13) {
            slots.level7 = 1;
            slots.used7 = player.spell_slots?.used7 || 0;
          }
          if (level >= 15) {
            slots.level8 = 1;
            slots.used8 = player.spell_slots?.used8 || 0;
          }
          if (level >= 17) {
            slots.level9 = 1;
            slots.used9 = player.spell_slots?.used9 || 0;
          }
        } else if (halfCasters.includes(playerClass || '')) {
          // Progression demi-lanceur (Paladin, Rôdeur)
          if (level >= 2) {
            slots.level1 = level === 2 ? 2 : level <= 4 ? 3 : 4;
            slots.used1 = player.spell_slots?.used1 || 0;
          }
          if (level >= 5) {
            slots.level2 = level <= 6 ? 2 : 3;
            slots.used2 = player.spell_slots?.used2 || 0;
          }
          if (level >= 9) {
            slots.level3 = level <= 10 ? 2 : 3;
            slots.used3 = player.spell_slots?.used3 || 0;
          }
          if (level >= 13) {
            slots.level4 = level <= 14 ? 1 : level <= 16 ? 2 : 3;
            slots.used4 = player.spell_slots?.used4 || 0;
          }
          if (level >= 17) {
            slots.level5 = level <= 18 ? 1 : 2;
            slots.used5 = player.spell_slots?.used5 || 0;
          }
        }
        
        return { ...player.spell_slots, ...slots };
      };

      // Calculer les nouvelles ressources de classe selon la classe et le niveau
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            const { cap, hasManual, manualNum } = resolveBardicTotal(player, resources);
            if (hasManual) {
              resources.bardic_inspiration = manualNum!;
            } else {
              if (typeof resources.bardic_inspiration === 'string' && resources.bardic_inspiration.trim() === '') {
                delete resources.bardic_inspiration;
              }
            }
            const upper = Math.max(0, cap);
            resources.used_bardic_inspiration = Math.min(resources.used_bardic_inspiration || 0, upper);
            break;
          }
          case 'Clerc':
            resources.channel_divinity = level >= 6 ? 2 : 1;
            break;
          case 'Druide':
            resources.wild_shape = 2;
            break;
          case 'Ensorceleur':
            resources.sorcery_points = level;
            break;
          case 'Guerrier':
            resources.action_surge = level >= 17 ? 2 : 1;
            break;
          case 'Magicien':
            resources.arcane_recovery = true;
            break;
          case 'Moine':
            resources.ki_points = level;
            break;
          case 'Paladin':
            resources.lay_on_hands = level * 5;
            break;
          case 'Rôdeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      console.log('Mise à jour du niveau:', {
        oldLevel: player.level,
        newLevel,
        oldMaxHp: player.max_hp,
        newMaxHp,
        hpGainValue,
        newSpellSlots,
        newClassResources
      });

      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        level: newLevel,
        max_hp: newMaxHp,
        current_hp: newCurrentHp,
        hit_dice: newHitDice,
        spell_slots: newSpellSlots,
        class_resources: newClassResources
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
      // Fermer automatiquement les paramètres après le passage de niveau
      if ((window as any).closeSettings) {
        (window as any).closeSettings();
      }
    } catch (error) {
      console.error('Erreur lors du passage de niveau:', error);
      toast.error('Erreur lors du passage de niveau');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Passage de niveau
                </h3>
                <p className="text-sm text-gray-400">
                  Niveau {player.level} → {newLevel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Character Info */}
          <div className="text-center">
            <h4 className="text-xl font-bold text-gray-100 mb-2">
              {player.adventurer_name || player.name}
            </h4>
            <p className="text-gray-400">
              {player.class} niveau {player.level}
            </p>
          </div>

          {/* HP Calculation */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-red-500" />
              <h5 className="font-medium text-gray-200">Points de vie supplémentaires</h5>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Dices className="w-4 h-4" />
                <span>
                  Dé de vie : 1d{hitDieSize} (ou {averageHpGain}) + modificateur de Constitution ({constitutionModifier >= 0 ? '+' : ''}{constitutionModifier})
                </span>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">
                  PV théoriques : <span className="text-green-400 font-medium">{theoreticalHpGain}</span>
                </p>
                <p className="text-xs text-gray-500">
                  (Vous pouvez choisir la valeur moyenne ou lancer le dé)
                </p>
              </div>
            </div>
          </div>

          {/* HP Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PV supplémentaires à appliquer
            </label>
            <input
              type="number"
              min="1"
              max={hitDieSize + constitutionModifier}
              value={hpGain}
              onChange={(e) => setHpGain(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md text-center text-lg font-bold"
              placeholder={theoreticalHpGain.toString()}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Minimum : 1 • Maximum : {hitDieSize + constitutionModifier}
            </p>
          </div>

          {/* Current HP Display */}
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">PV actuels :</span>
              <span className="text-gray-200">{player.current_hp} / {player.max_hp}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-400">Après passage de niveau :</span>
              <span className="text-green-400 font-medium">
                {player.current_hp + (parseInt(hpGain) || 0)} / {player.max_hp + (parseInt(hpGain) || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex gap-3">
            <button
              onClick={handleLevelUpWithAutoSave}
              disabled={isProcessing || !hpGain || parseInt(hpGain) < 1}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-green-900/20 hover:shadow-green-900/40 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Passage en cours...
                </>
              ) : (
                <>
                  <TrendingUp size={18} />
                  Passer au niveau {newLevel}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}