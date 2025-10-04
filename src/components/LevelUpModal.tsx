import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Heart, Dices, BookOpen } from 'lucide-react';
import { Player, DndClass } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getSpellSlotsByLevel, getSpellKnowledgeInfo } from '../utils/spellSlots2024';

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
    case 'Rodeur': return 10;
    case 'Barde':
    case 'Clerc':
    case 'Druide':
    case 'Moine':
    case 'Roublard':
    case 'Occultiste': return 8; 
    case 'Magicien':
    case 'Ensorceleur': return 6;
    default: return 8;
  }
};

const getAverageHpGain = (hitDieSize: number): number => {
  return Math.floor((hitDieSize / 2) + 1);
};

// Modificateurs de caractéristiques depuis StatsTab (player.abilities) — robustes
const extractAbilityMod = (player: Player, keys: string[]) => {
  const abilities: any = (player as any)?.abilities;
  if (Array.isArray(abilities)) {
    const found = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return keys.some(k => n === k);
    });
    if (found) {
      if (typeof found.modifier === 'number' && Number.isFinite(found.modifier)) return found.modifier;
      if (typeof found.score === 'number' && Number.isFinite(found.score)) return Math.floor((found.score - 10) / 2);
      if (typeof found.modifier === 'string') {
        const n = Number(found.modifier.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return n;
      }
      if (typeof found.score === 'string') {
        const n = Number(found.score.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return Math.floor((n - 10) / 2);
      }
    }
  }
  return 0;
};

const getChaModFromPlayer = (player: Player): number =>
  extractAbilityMod(player, ['charisme', 'charisma', 'cha', 'car']);

/* ============================ Sous-classes (helpers) ============================ */

// Canonicalisation minimale pour RPC (même logique que PlayerProfileSettingsModal)
function mapClassForRpc(pClass: DndClass | null | undefined): string | null | undefined {
  if (pClass === 'Occultiste') return 'Occultiste';
  return pClass;
}


/* ============================ Composant ============================ */

export function LevelUpModal({ isOpen, onClose, player, onUpdate }: LevelUpModalProps) {
  const [hpGain, setHpGain] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sous-classes (comme dans PlayerProfileSettingsModal)
  const [availableSubclasses, setAvailableSubclasses] = useState<string[]>([]);
  const [selectedSubclass, setSelectedSubclass] = useState<string>(player.subclass || '');

  useEffect(() => {
    if (!isOpen) return;
    // Init valeur choisie depuis le joueur
    setSelectedSubclass(player.subclass || '');
  }, [isOpen, player.subclass]);

  useEffect(() => {
    if (!isOpen) return;
    const loadSubclasses = async () => {
      const cls = mapClassForRpc(player.class);
      if (!cls) {
        setAvailableSubclasses([]);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_subclasses_by_class', {
          p_class: cls,
        });
        if (error) throw error;
        setAvailableSubclasses((data as any) || []);
      } catch (error) {
        console.error('Erreur lors du chargement des sous-classes:', error);
        setAvailableSubclasses([]);
      }
    };
    loadSubclasses();
  }, [isOpen, player.class]);

  if (!isOpen) return null;

  const hitDieSize = getHitDieSize(player.class);
  const averageHpGain = getAverageHpGain(hitDieSize);
  const constitutionModifier = player.abilities?.find(a => (a.name || a.abbr)?.toString().toLowerCase() === 'constitution')?.modifier || 0;
  const theoreticalHpGain = averageHpGain + constitutionModifier;
  const newLevel = player.level + 1;

  const requiresSubclassSelection = newLevel === 3 && !player.subclass && availableSubclasses.length > 0;

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

    // Sous-classe obligatoire à l'arrivée au niveau 3 (si non encore choisie et options dispo)
    if (requiresSubclassSelection && !selectedSubclass) {
      toast.error('Veuillez sélectionner une sous-classe pour le niveau 3.');
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

      // Ressources de classe — inclut Paladin Conduits divins (N3+)
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            const raw = resources?.bardic_inspiration;
            if (typeof raw === 'string' && raw.trim() === '') {
              delete resources.bardic_inspiration;
            }
            const upper = Math.max(0, getChaModFromPlayer(player));
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
          case 'Paladin': {
            resources.lay_on_hands = level * 5;
            if (level >= 3) {
              const cap = level >= 11 ? 3 : 2;
              resources.channel_divinity = cap;
              const used = resources.used_channel_divinity || 0;
              resources.used_channel_divinity = Math.min(used, cap);
            } else {
              delete resources.channel_divinity;
              delete resources.used_channel_divinity;
            }
            break;
          }
          case 'Rodeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel, player.spell_slots);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      const nextSubclass =
        newLevel === 3
          ? (selectedSubclass || player.subclass || null)
          : (player.subclass || null);

      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources,
          subclass: nextSubclass,
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
        class_resources: newClassResources,
        subclass: nextSubclass || undefined,
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
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

    if (requiresSubclassSelection && !selectedSubclass) {
      toast.error('Veuillez sélectionner une sous-classe pour le niveau 3.');
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

      // Ressources de classe — inclut Paladin Conduits divins (N3+)
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            const raw = resources?.bardic_inspiration;
            if (typeof raw === 'string' && raw.trim() === '') {
              delete resources.bardic_inspiration;
            }
            const upper = Math.max(0, getChaModFromPlayer(player));
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
          case 'Paladin': {
            resources.lay_on_hands = level * 5;
            if (level >= 3) {
              const cap = level >= 11 ? 3 : 2;
              resources.channel_divinity = cap;
              const used = resources.used_channel_divinity || 0;
              resources.used_channel_divinity = Math.min(used, cap);
            } else {
              delete resources.channel_divinity;
              delete resources.used_channel_divinity;
            }
            break;
          }
          case 'Rôdeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel, player.spell_slots);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      const nextSubclass =
        newLevel === 3
          ? (selectedSubclass || player.subclass || null)
          : (player.subclass || null);

      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources,
          subclass: nextSubclass,
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
        class_resources: newClassResources,
        subclass: nextSubclass || undefined,
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
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

  const spellInfo = getSpellKnowledgeInfo(player.class, newLevel);
  const isCaster = spellInfo.kind !== 'none';

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overscroll-contain">
      <div
        className="
          bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl
          max-w-md w-full border border-gray-700/50 overflow-hidden
          flex flex-col max-h-[90vh]
        "
        role="dialog"
        aria-modal="true"
      >
        {/* Header (non scrollable) */}
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-gray-700/50 p-4 shrink-0">
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

        {/* Content (scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

          {/* Sous-classe (niveau 3) */}
          {newLevel === 3 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h5 className="font-medium text-gray-200">Sous-classe</h5>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Choisissez votre sous-classe</label>
                <select
                  value={selectedSubclass}
                  onChange={(e) => setSelectedSubclass(e.target.value)}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  disabled={availableSubclasses.length === 0}
                >
                  <option value="">{availableSubclasses.length ? 'Sélectionnez une sous-classe' : 'Aucune sous-classe disponible'}</option>
                  {availableSubclasses.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>

                {!player.subclass && availableSubclasses.length > 0 && (
                  <p className="text-xs text-gray-500">
                    La sous-classe est requise au niveau 3. Vous pourrez consulter vos nouvelles aptitudes dans l’onglet Classe.
                  </p>
                )}
                {availableSubclasses.length === 0 && (
                  <p className="text-xs text-gray-500">
                    Impossible de charger les sous-classes pour {player.class}. Vous pourrez la définir plus tard dans les paramètres du personnage.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sorts à ajouter (indicatif) */}
          {isCaster && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h5 className="font-medium text-gray-200">Sorts à ajouter (indicatif)</h5>
              </div>

              {spellInfo.kind === 'prepared' && (
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300">
                    Classe: <span className="font-semibold">{spellInfo.label}</span>
                  </p>
                  {typeof spellInfo.cantrips === 'number' && spellInfo.cantrips > 0 && (
                    <p className="text-gray-300">
                      Sorts mineurs au niveau {newLevel}: <span className="font-semibold">{spellInfo.cantrips}</span>
                    </p>
                  )}
                  <p className="text-gray-300">
                    Sorts préparés au niveau {newLevel}: <span className="font-semibold">{spellInfo.prepared}</span>
                  </p>
                  {spellInfo.note && (
                    <p className="text-xs text-gray-500 mt-2">
                      {spellInfo.note}. Gérez vos sorts dans l'onglet Sorts.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons (non scrollable) */}
        <div className="p-4 border-t border-gray-700/50 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleLevelUpWithAutoSave}
              disabled={isProcessing || !hpGain || parseInt(hpGain) < 1 || (requiresSubclassSelection && !selectedSubclass)}
              className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                isProcessing || !hpGain || parseInt(hpGain) < 1 || (requiresSubclassSelection && !selectedSubclass)
                  ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
              }`}
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