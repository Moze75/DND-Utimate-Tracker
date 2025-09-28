import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Heart, Dices, BookOpen, Layers } from 'lucide-react';
import { Player, DndClass } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// === Ajout import pour sous-classes ===
import { getSubclassesForClass, canonicalClass } from '../utils/subclassUtils';

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

const getWisModFromPlayer = (player: Player): number =>
  extractAbilityMod(player, ['sagesse', 'wisdom', 'wis', 'sag']);

const getIntModFromPlayer = (player: Player): number =>
  extractAbilityMod(player, ['intelligence', 'intellect', 'int']);

/* ============================ Tables “sorts à ajouter” ============================ */
/*
  Règles d’après le tableau fourni par l’utilisateur.
  - Barde, Ensorceleur, (Occultiste/Sorcier): listes “connus”
  - Clerc, Druide: préparation quotidienne (Niveau + Sag), cantrips par paliers
  - Magicien: préparation (Niveau + Int), cantrips par paliers (standard 5e)
  - Paladin, Rôdeur: “sorts connus” d’après le tableau fourni (pas de cantrips)
  NB: Les tableaux ci-dessous sont indexés dès 1 (index 0 inutilisé).
*/

const clampLevel = (n: number) => Math.max(1, Math.min(20, n));

const BARD_CANTRIPS = [0, 2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
const BARD_KNOWN    = [0, 4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22];

const SORCERER_CANTRIPS = [0, 4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6];
const SORCERER_KNOWN    = [0, 2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15];

// Occultiste (Warlock) — dans le code, la classe est “Sorcier”
const WARLOCK_CANTRIPS = [0, 2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
const WARLOCK_KNOWN    = [0, 2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15];

// Paladin (table fournie)
const PALADIN_KNOWN = [0, 0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11];

// Rôdeur (table fournie)
const RANGER_KNOWN = [0, 0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11];

// Clerc — cantrips par paliers, préparation: niveau + Sagesse
const getClericCantrips = (lvl: number) => {
  if (lvl >= 10) return 5;
  if (lvl >= 4) return 4;
  return 3;
};

// Druide — cantrips par paliers, préparation: niveau + Sagesse
const getDruidCantrips = (lvl: number) => {
  if (lvl >= 8) return 4;
  if (lvl >= 4) return 3;
  return 2;
};

// Magicien — cantrips standard 5e: 3 (niv 1) / 4 (niv 4) / 5 (niv 10)
const getWizardCantrips = (lvl: number) => {
  if (lvl >= 10) return 5;
  if (lvl >= 4) return 4;
  return 3;
};

type SpellInfo =
  | { kind: 'known'; cantrips?: number; known?: number; label: string; note?: string }
  | { kind: 'prepared'; cantrips?: number; preparedCount: number; preparedFormula: string; label: string; note?: string }
  | { kind: 'none' };

const getSpellKnowledgeInfo = (player: Player, newLevel: number): SpellInfo => {
  const lvl = clampLevel(newLevel);
  const cls = (player.class || '').toString();

  switch (cls) {
    case 'Barde': {
      return {
        kind: 'known',
        cantrips: BARD_CANTRIPS[lvl],
        known: BARD_KNOWN[lvl],
        label: 'Barde',
        note: 'Valeurs totales au nouveau niveau'
      };
    }
    case 'Ensorceleur': {
      return {
        kind: 'known',
        cantrips: SORCERER_CANTRIPS[lvl],
        known: SORCERER_KNOWN[lvl],
        label: 'Ensorceleur',
        note: 'Valeurs totales au nouveau niveau'
      };
    }
    case 'Occultiste': {   // nom de classe utilisé dans le code (Warlock)
      return {
        kind: 'known',
        cantrips: WARLOCK_CANTRIPS[lvl],
        known: WARLOCK_KNOWN[lvl],
        label: 'Occultiste',
        note: 'Valeurs totales au nouveau niveau'
      };
    }
    case 'Clerc': {
      const wis = getWisModFromPlayer(player);
      const prepared = Math.max(1, lvl + wis);
      return {
        kind: 'prepared',
        cantrips: getClericCantrips(lvl),
        preparedCount: prepared,
        preparedFormula: `Niveau (${lvl}) + mod. Sagesse (${wis >= 0 ? `+${wis}` : wis})`,
        label: 'Clerc',
        note: 'Préparation quotidienne (liste complète)'
      };
    }
    case 'Druide': {
      const wis = getWisModFromPlayer(player);
      const prepared = Math.max(1, lvl + wis);
      return {
        kind: 'prepared',
        cantrips: getDruidCantrips(lvl),
        preparedCount: prepared,
        preparedFormula: `Niveau (${lvl}) + mod. Sagesse (${wis >= 0 ? `+${wis}` : wis})`,
        label: 'Druide',
        note: 'Préparation quotidienne (liste complète)'
      };
    }
    case 'Magicien': {
      const intel = getIntModFromPlayer(player);
      const prepared = Math.max(1, lvl + intel);
      return {
        kind: 'prepared',
        cantrips: getWizardCantrips(lvl),
        preparedCount: prepared,
        preparedFormula: `Niveau (${lvl}) + mod. Intelligence (${intel >= 0 ? `+${intel}` : intel})`,
        label: 'Magicien',
        note: 'Préparation quotidienne (grimoire)'
      };
    }
    case 'Paladin': {
      return {
        kind: 'known',
        known: PALADIN_KNOWN[lvl],
        label: 'Paladin',
        note: 'Valeur totale des sorts connus au nouveau niveau'
      };
    }
    case 'Rodeur': {
      return {
        kind: 'known',
        known: RANGER_KNOWN[lvl],
        label: 'Rodeur',
        note: 'Valeur totale des sorts connus au nouveau niveau'
      };
    }
    default:
      return { kind: 'none' };
  }
};

/* ============================ Composant ============================ */

export function LevelUpModal({ isOpen, onClose, player, onUpdate }: LevelUpModalProps) {
  const [hpGain, setHpGain] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

 // === AJOUT État sous-classe ===
  const [showSubclassModal, setShowSubclassModal] = useState(false);
  const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null);

  if (!isOpen) return null;

  const hitDieSize = getHitDieSize(player.class);
  const averageHpGain = getAverageHpGain(hitDieSize);
  const constitutionModifier = player.abilities?.find(a => (a.name || a.abbr)?.toString().toLowerCase() === 'constitution')?.modifier || 0;
  const theoreticalHpGain = averageHpGain + constitutionModifier;
  const newLevel = player.level + 1;

  // === AJOUT effet pour ouvrir le modal sous-classe au niveau 3 ===
  useEffect(() => {
    if (isOpen && newLevel === 3 && !player.subclass && !showSubclassModal) {
      setShowSubclassModal(true);
    }
  }, [isOpen, newLevel, player.subclass, showSubclassModal]);

  // === SOUS-CLASSES disponibles ===
  const subclasses = getSubclassesForClass(player.class);

  // === AJOUT handler pour choisir la sous-classe ===
  const handleSelectSubclass = async (subclassName: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ subclass: subclassName })
        .eq('id', player.id);

      if (error) throw error;

      setSelectedSubclass(subclassName);
      onUpdate({
        ...player,
        subclass: subclassName
      });
      setShowSubclassModal(false);
      toast.success(`Sous-classe choisie : ${subclassName}`);
    } catch (err) {
      toast.error("Erreur lors de la sélection de la sous-classe.");
    } finally {
      setIsProcessing(false);
    }
  };

  // === Blocage passage niveau si sous-classe non choisie au niveau 3 ===
  const blockLevelUp = newLevel === 3 && !player.subclass && !selectedSubclass;

  // === MODAL SOUS-CLASSE ===
  const subclassModal =
    showSubclassModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-emerald-600/20 border-b border-gray-700/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Choix de sous-classe</h3>
                  <p className="text-sm text-gray-400">Niveau 3 requis</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubclassModal(false)}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-center mb-2">
              <h4 className="text-xl font-bold text-gray-100 mb-2">{canonicalClass(player.class)}</h4>
              <p className="text-gray-400 text-sm">Sélectionnez une sous-classe pour votre personnage</p>
            </div>
            <div className="space-y-2">
              {subclasses.map(opt => (
                <button
                  key={opt.key}
                  disabled={isProcessing}
                  onClick={() => handleSelectSubclass(opt.label)}
                  className={`w-full px-4 py-3 rounded-lg border border-gray-700/50 bg-gray-800/60 hover:bg-purple-800/30 text-white font-medium transition-colors ${
                    selectedSubclass === opt.label ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-lg font-bold">{opt.label}</span>
                  </div>
                </button>
              ))}
              {subclasses.length === 0 && (
                <div className="text-center text-gray-400 text-sm">Aucune sous-classe disponible pour cette classe</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

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

      // Emplacements de sorts (inchangé)
      const getSpellSlotsByLevel = (playerClass: string | null | undefined, level: number) => {
        const slots: any = {};
        
        if (playerClass === 'Moine') {
          return player.spell_slots || {};
        }
        
        const fullCasters = ['Magicien', 'Ensorceleur', 'Barde', 'Clerc', 'Druide'];
        const halfCasters = ['Paladin', 'Rodeur'];
        
        if (fullCasters.includes(playerClass || '')) {
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
            // on garde used_channel_divinity tel quel
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

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

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

      // Emplacements de sorts (inchangé)
      const getSpellSlotsByLevel = (playerClass: string | null | undefined, level: number) => {
        const slots: any = {};
        
        if (playerClass === 'Moine') {
          return player.spell_slots || {};
        }
        
        const fullCasters = ['Magicien', 'Ensorceleur', 'Barde', 'Clerc', 'Druide'];
        const halfCasters = ['Paladin', 'Rôdeur'];
        
        if (fullCasters.includes(playerClass || '')) {
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

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

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

  const spellInfo = getSpellKnowledgeInfo(player, newLevel);
  const isCaster = spellInfo.kind !== 'none';

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

          {/* Sorts à ajouter (indicatif) */}
          {isCaster && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h5 className="font-medium text-gray-200">Sorts à ajouter (indicatif)</h5>
              </div>

              {spellInfo.kind === 'known' && (
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300">
                    Classe: <span className="font-semibold">{spellInfo.label}</span>
                  </p>
                  {typeof spellInfo.cantrips === 'number' && spellInfo.cantrips > 0 && (
                    <p className="text-gray-300">
                      Sorts mineurs connus au niveau {newLevel}: <span className="font-semibold">{spellInfo.cantrips}</span>
                    </p>
                  )}
                  {typeof spellInfo.known === 'number' && (
                    <p className="text-gray-300">
                      Sorts connus au niveau {newLevel}: <span className="font-semibold">{spellInfo.known}</span>
                    </p>
                  )}
                  {spellInfo.note && (
                    <p className="text-xs text-gray-500 mt-2">
                      {spellInfo.note}. Si vous en avez déjà appris, ajoutez simplement la différence depuis l’onglet Sorts.
                    </p>
                  )}
                </div>
              )}

              {spellInfo.kind === 'prepared' && (
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300">
                    Classe: <span className="font-semibold">{spellInfo.label}</span>
                  </p>
                  {typeof spellInfo.cantrips === 'number' && (
                    <p className="text-gray-300">
                      Sorts mineurs connus au niveau {newLevel}: <span className="font-semibold">{spellInfo.cantrips}</span>
                    </p>
                  )}
                  <p className="text-gray-300">
                    Préparation quotidienne: <span className="font-semibold">{spellInfo.preparedCount}</span> ({spellInfo.preparedFormula})
                  </p>
                  {spellInfo.note && (
                    <p className="text-xs text-gray-500 mt-2">
                      {spellInfo.note}. Gérez vos sorts dans l’onglet Sorts; ce nombre est un total au nouveau niveau.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex gap-3">
            <button
              onClick={handleLevelUpWithAutoSave}
              disabled={isProcessing || !hpGain || parseInt(hpGain) < 1}
              className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                isProcessing || !hpGain || parseInt(hpGain) < 1
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
      {/* === AJOUT affichage du modal sous-classe par-dessus === */}
      {subclassModal}
    </div>
  );

  retu