import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Plus,
  Minus,
  Settings,
  X,
  Book,
  Sparkles,
  Flame,
  Music,
  Cross,
  Leaf,
  Wand2,
  Swords,
  Footprints,
  HandHeart,
  Target,
  Skull,
  Trash2,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SpellbookModal } from './SpellbookModal';
import { KnownSpellsSection } from './KnownSpellsSection';
import { SpellSlotSelectionModal } from './SpellSlotSelectionModal';
import type { Player, SpellSlots, ClassResources, DndClass } from '../types/dnd';

/* ============================ Helpers ============================ */

const getSpellSlotsByLevel = (playerClass: DndClass | null | undefined, level: number): SpellSlots => {
  const slots: SpellSlots = {};
  if (playerClass === 'Moine') return slots;

  if (level >= 1) { slots.level1 = level === 1 ? 2 : 3; slots.used1 = 0; }
  if (level >= 3) { slots.level2 = level === 3 ? 2 : 3; slots.used2 = 0; }
  if (level >= 5) { slots.level3 = level === 5 ? 2 : 3; slots.used3 = 0; }
  if (level >= 7) { slots.level4 = level === 7 ? 1 : 3; slots.used4 = 0; }
  if (level >= 9) { slots.level5 = level === 9 ? 1 : 2; slots.used5 = 0; }
  if (level >= 11) { slots.level6 = 1; slots.used6 = 0; }
  if (level >= 13) { slots.level7 = 1; slots.used7 = 0; }
  if (level >= 15) { slots.level8 = 1; slots.used8 = 0; }
  if (level >= 17) { slots.level9 = 1; slots.used9 = 0; }

  return slots;
};

const getChaModFromPlayer = (p: Player): number => {
  const abilities: any = (p as any)?.abilities;

  const toNum = (v: any): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[^\d+-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const getFromObj = (obj: any): any | null => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    const matchKey = keys.find(k => {
      const kk = k.toLowerCase();
      return kk === 'charisme' || kk === 'charisma' || kk === 'cha' || kk === 'car';
    }) ?? keys.find(k => k.toLowerCase().includes('charis') || k.toLowerCase() === 'cha' || k.toLowerCase() === 'car');
    return matchKey ? obj[matchKey] : null;
  };

  let cha: any = null;

  if (Array.isArray(abilities)) {
    cha = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return n === 'charisme' || n === 'charisma' || n === 'cha' || n === 'car';
    });
  } else if (abilities && typeof abilities === 'object') {
    cha = getFromObj(abilities);
  }

  if (cha) {
    const mod =
      toNum(cha.modifier) ??
      toNum(cha.mod) ??
      toNum(cha.modValue) ??
      toNum(cha.value);
    if (mod != null) return mod;

    const score =
      toNum(cha.score) ??
      toNum(cha.total) ??
      toNum(cha.base);
    if (score != null) return Math.floor((score - 10) / 2);
  }

  return 0;
};

const getBardicCap = (player: Player): number => getChaModFromPlayer(player);

const getDefaultClassResources = (player: Player): ClassResources => {
  const level = Number(player.level) || 1;
  const cls = player.class as DndClass | null | undefined;
  const resources: ClassResources = { ...(player.class_resources || {}) };

  switch (cls) {
    case 'Barbare':
      resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
      resources.used_rage = 0;
      break;

    case 'Barde': {
      const cap = getBardicCap(player);
      const upper = Math.max(0, cap);
      resources.used_bardic_inspiration = Math.min(resources.used_bardic_inspiration || 0, upper);
      break;
    }

    case 'Clerc':
      resources.channel_divinity = level >= 6 ? 2 : 1;
      resources.used_channel_divinity = 0;
      break;

    case 'Druide':
      resources.wild_shape = 2;
      resources.used_wild_shape = 0;
      break;

    case 'Ensorceleur':
      resources.sorcery_points = level;
      resources.used_sorcery_points = 0;
      break;

    case 'Guerrier':
      resources.action_surge = level >= 17 ? 2 : 1;
      resources.used_action_surge = 0;
      break;

    case 'Magicien':
      resources.arcane_recovery = true;
      resources.used_arcane_recovery = false;
      break;

    case 'Moine':
      resources.ki_points = level;
      resources.used_ki_points = 0;
      break;

    case 'Paladin':
      resources.lay_on_hands = level * 5;
      resources.used_lay_on_hands = 0;
      break;

    case 'Rôdeur':
      resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
      resources.used_favored_foe = 0;
      break;

    case 'Roublard':
      resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
      break;
  }

  return resources;
};

const RESOURCE_LABELS: Record<string, string> = {
  rage: 'Rage',
  bardic_inspiration: 'Inspiration bardique',
  channel_divinity: 'Conduit divin',
  wild_shape: 'Forme sauvage',
  sorcery_points: 'Points de sorcellerie',
  action_surge: "Sursaut d'action",
  ki_points: 'Points de ki',
  lay_on_hands: 'Imposition des mains',
  favored_foe: 'Ennemi juré',
  sneak_attack: 'Attaque sournoise',
};

/* ============================ Composant principal ============================ */

type AbilitiesTabProps = {
  player: Player;
  onUpdate: (player: Player) => void;
};

export function AbilitiesTab({ player, onUpdate }: AbilitiesTabProps) {
  const [editing, setEditing] = useState(false);
  const [previousClass, setPreviousClass] = useState(player.class);
  const [previousLevel, setPreviousLevel] = useState(player.level);
  const [showSpellbook, setShowSpellbook] = useState(false);
  const [showSpellSlotModal, setShowSpellSlotModal] = useState(false);
  const [spellSlotModalData, setSpellSlotModalData] = useState<{
    type: 'attack' | 'damage';
    attackName: string;
    diceFormula: string;
    modifier: number;
  } | null>(null);

  useEffect(() => {
    if (player.class !== previousClass || player.level !== previousLevel) {
      setPreviousClass(player.class);
      setPreviousLevel(player.level);
      initializeResources();
    }
  }, [player.class, player.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bard: clamp used_bardic_inspiration if cap auto changes
  const lastClampKey = useRef<string | null>(null);
  useEffect(() => {
    if (player.class !== 'Barde' || !player?.id) return;

    const cap = getBardicCap(player);
    const upper = Math.max(0, cap);
    const used = player.class_resources?.used_bardic_inspiration || 0;
    const key = `${player.id}:${cap}:${used}`;

    if (lastClampKey.current === key) return;

    if (used > upper) {
      const next: ClassResources = {
        ...(player.class_resources || {}),
        used_bardic_inspiration: upper,
      };
      (async () => {
        try {
          const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
          if (error) throw error;
          onUpdate({ ...player, class_resources: next });
          lastClampKey.current = key;
        } catch (e) {
          console.error('[AbilitiesTab] clamp bard used error:', e);
          lastClampKey.current = null;
        }
      })();
    } else {
      lastClampKey.current = key;
    }
  }, [
    player?.id,
    player?.class,
    player?.class_resources?.used_bardic_inspiration,
    player.abilities,
  ]);

  const handleSpellSlotChange = async (level: number, used: boolean) => {
    if (!player.spell_slots) return;

    const usedKey = `used${level}` as keyof SpellSlots;
    const levelKey = `level${level}` as keyof SpellSlots;
    const currentUsed = player.spell_slots[usedKey] || 0;
    const maxSlots = player.spell_slots[levelKey] || 0;

    if (used && currentUsed >= maxSlots) return;
    if (!used && currentUsed <= 0) return;

    const newSpellSlots = {
      ...player.spell_slots,
      [usedKey]: used ? currentUsed + 1 : currentUsed - 1,
    };

    try {
      const { error } = await supabase.from('players').update({ spell_slots: newSpellSlots }).eq('id', player.id);
      if (error) throw error;

      onUpdate({ ...player, spell_slots: newSpellSlots });
      toast.success(used ? '✨ Emplacement de sort utilisé' : '🔮 Emplacement de sort récupéré');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des emplacements de sorts:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Carte Emplacements de sorts (gardée pour usage futur, mais non rendue)
  const renderSpellSlots = () => {
    const spellSlots = player.spell_slots || {};
    const hasSpellSlots = Object.keys(spellSlots).some((key) => key.startsWith('level') && !key.startsWith('used') && (spellSlots[key as keyof SpellSlots] || 0) > 0);
    if (!hasSpellSlots) return null;

    const getMaxSpellLevel = (level: number) => {
      if (level >= 17) return 9;
      if (level >= 15) return 8;
      if (level >= 13) return 7;
      if (level >= 11) return 6;
      if (level >= 9) return 5;
      if (level >= 7) return 4;
      if (level >= 5) return 3;
      if (level >= 3) return 2;
      if (level >= 1) return 1;
      return 0;
    };
    const maxLevel = editing ? 9 : getMaxSpellLevel(player.level);

    const slots = Array.from({ length: maxLevel }, (_, i) => {
      const level = i + 1;
      const levelKey = `level${level}` as keyof SpellSlots;
      const usedKey = `used${level}` as keyof SpellSlots;
      const maxSlots = spellSlots[levelKey] || 0;
      const usedSlots = spellSlots[usedKey] || 0;

      return (
        <div key={level} className="spell-slot">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-300">Niveau {level}</span>
            <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center">
              {maxSlots - usedSlots}/{maxSlots}
            </div>
          </div>
          {maxSlots > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleSpellSlotChange(level, true)}
                disabled={usedSlots >= maxSlots}
                className={`flex-1 p-2 rounded-md transition-colors ${usedSlots < maxSlots ? 'text-purple-500 hover:bg-purple-900/30' : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'}`}
                title="Utiliser un emplacement"
              >
                <Minus size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => handleSpellSlotChange(level, false)}
                disabled={usedSlots <= 0}
                className={`flex-1 p-2 rounded-md transition-colors ${usedSlots > 0 ? 'text-purple-500 hover:bg-purple-900/30' : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'}`}
                title="Récupérer un emplacement"
              >
                <Plus size={16} className="mx-auto" />
              </button>
            </div>
          )}
        </div>
      );
    });

    return (
      <div className="stats-card">
        <div className="stat-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-100">Emplacements de sorts</h3>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center"
              title="Modifier les emplacements"
            >
              <Settings size={20} />
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {editing && (
            <div className="border-b border-gray-700/50 pb-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => {
                  const levelKey = `level${level}` as keyof SpellSlots;
                  const usedKey = `used${level}` as keyof SpellSlots;
                  const maxSlots = spellSlots[levelKey] || 0;

                  return (
                    <div key={level} className="space-y-2">
                      <label className="block text-sm font-medium text-purple-300">Niveau {level}</label>
                      <input
                        type="number"
                        min="0"
                        value={maxSlots}
                        onChange={async (e) => {
                          const newValue = Math.max(0, parseInt(e.target.value) || 0);
                          const newSpellSlots = {
                            ...spellSlots,
                            [levelKey]: newValue,
                            [usedKey]: Math.min(spellSlots[usedKey] || 0, newValue),
                          };
                          try {
                            const { error } = await supabase.from('players').update({ spell_slots: newSpellSlots }).eq('id', player.id);
                            if (error) throw error;

                            onUpdate({ ...player, spell_slots: newSpellSlots });
                          } catch (error) {
                            console.error('Erreur lors de la mise à jour:', error);
                            toast.error('Erreur lors de la mise à jour');
                          }
                        }}
                        className="input-dark w-full px-3 py-2 rounded-md text-center"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setEditing(false)} className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
                  <X size={16} />
                  Fermer
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{slots}</div>
        </div>
      </div>
    );
  };

  const updateClassResource = async (resource: keyof ClassResources, value: number | boolean) => {
    let nextResources: ClassResources = { ...(player.class_resources || {}) };

    if (resource === 'used_bardic_inspiration' && typeof value === 'number') {
      const cap = getBardicCap(player);
      const upper = Math.max(0, cap);
      const clamped = Math.min(Math.max(0, value), upper);
      nextResources.used_bardic_inspiration = clamped;
    } else {
      (nextResources as any)[resource] = value;
    }

    try {
      const { error } = await supabase.from('players').update({ class_resources: nextResources }).eq('id', player.id);
      if (error) throw error;

      onUpdate({ ...player, class_resources: nextResources });

      if (typeof value === 'boolean') {
        toast.success(`Récupération arcanique ${value ? 'utilisée' : 'disponible'}`);
      } else {
        const key = String(resource);
        const displayKey = key.replace('used_', '');
        const resourceName = RESOURCE_LABELS[displayKey] || displayKey;
        const isUsed = key.startsWith('used_');
        const previous = (player.class_resources as any)?.[resource];

        const action =
          isUsed && typeof previous === 'number' && typeof value === 'number'
            ? (value as number) > (previous as number)
              ? 'utilisé'
              : 'récupéré'
            : 'mis à jour';

        if (isUsed && typeof previous === 'number' && typeof value === 'number') {
          const diff = Math.abs((value as number) - (previous as number));
          toast.success(`${diff} ${resourceName} ${action}`);
        } else {
          toast.success(`${resourceName} ${action}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des ressources:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Carte Ressources de classe (gardée pour usage futur, mais non rendue)
  const renderClassResources = () => {
    if (!player.class_resources || !player.class) return null;

    const classResources = player.class_resources;
    const items: React.ReactNode[] = [];

    switch (player.class) {
      case 'Barbare':
        if (typeof classResources.rage === 'number') {
          items.push(
            <ResourceBlock
              key="rage"
              icon={<Flame size={20} />}
              label="Rage"
              total={classResources.rage}
              used={classResources.used_rage || 0}
              onUse={() => updateClassResource('used_rage', (classResources.used_rage || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('rage', newTotal)}
              onRestore={() => updateClassResource('used_rage', Math.max(0, (classResources.used_rage || 0) - 1))}
              color="red"
            />
          );
        }
        break;

      case 'Barde': {
        const total = getBardicCap(player);
        const upper = Math.max(0, total);
        const used = Math.min(classResources.used_bardic_inspiration || 0, upper);

        items.push(
          <ResourceBlock
            key="bardic_inspiration"
            icon={<Music size={20} />}
            label="Inspiration bardique"
            total={total}
            used={used}
            onUse={() => updateClassResource('used_bardic_inspiration', used + 1)}
            onUpdateTotal={() => {}}
            onRestore={() => updateClassResource('used_bardic_inspiration', Math.max(0, used - 1))}
            color="purple"
            hideEdit
          />
        );
        break;
      }

      case 'Clerc':
        if (typeof classResources.channel_divinity === 'number') {
          items.push(
            <ResourceBlock
              key="channel_divinity"
              icon={<Cross size={20} />}
              label="Conduit divin"
              total={classResources.channel_divinity}
              used={classResources.used_channel_divinity || 0}
              onUse={() => updateClassResource('used_channel_divinity', (classResources.used_channel_divinity || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('channel_divinity', newTotal)}
              onRestore={() => updateClassResource('used_channel_divinity', Math.max(0, (classResources.used_channel_divinity || 0) - 1))}
              color="yellow"
            />
          );
        }
        break;

      case 'Druide':
        if (typeof classResources.wild_shape === 'number') {
          items.push(
            <ResourceBlock
              key="wild_shape"
              icon={<Leaf size={20} />}
              label="Forme sauvage"
              total={classResources.wild_shape}
              used={classResources.used_wild_shape || 0}
              onUse={() => updateClassResource('used_wild_shape', (classResources.used_wild_shape || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('wild_shape', newTotal)}
              onRestore={() => updateClassResource('used_wild_shape', Math.max(0, (classResources.used_wild_shape || 0) - 1))}
              color="green"
            />
          );
        }
        break;

      case 'Ensorceleur':
        if (typeof classResources.sorcery_points === 'number') {
          items.push(
            <ResourceBlock
              key="sorcery_points"
              icon={<Wand2 size={20} />}
              label="Points de sorcellerie"
              total={classResources.sorcery_points}
              used={classResources.used_sorcery_points || 0}
              onUse={() => updateClassResource('used_sorcery_points', (classResources.used_sorcery_points || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('sorcery_points', newTotal)}
              onRestore={() => updateClassResource('used_sorcery_points', Math.max(0, (classResources.used_sorcery_points || 0) - 1))}
              color="purple"
            />
          );
        }
        break;

      case 'Guerrier':
        if (typeof classResources.action_surge === 'number') {
          items.push(
            <ResourceBlock
              key="action_surge"
              icon={<Swords size={20} />}
              label="Sursaut d'action"
              total={classResources.action_surge}
              used={classResources.used_action_surge || 0}
              onUse={() => updateClassResource('used_action_surge', (classResources.used_action_surge || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('action_surge', newTotal)}
              onRestore={() => updateClassResource('used_action_surge', Math.max(0, (classResources.used_action_surge || 0) - 1))}
              color="red"
            />
          );
        }
        break;

      case 'Magicien':
        if (player.class_resources.arcane_recovery !== undefined) {
          items.push(
            <div key="arcane_recovery" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-300">Récupération arcanique</span>
                </div>
                <button
                  onClick={() => updateClassResource('used_arcane_recovery', !player.class_resources?.used_arcane_recovery)}
                  className={`h-8 px-3 flex items-center justify-center rounded-md transition-colors ${
                    player.class_resources?.used_arcane_recovery ? 'bg-gray-800/50 text-gray-500' : 'text-blue-500 hover:bg-blue-900/30'
                  }`}
                >
                  {player.class_resources?.used_arcane_recovery ? 'Utilisé' : 'Disponible'}
                </button>
              </div>
            </div>
          );
        }
        break;

      case 'Moine': {
        const total = (classResources as any).ki_points;
        const used = (classResources as any).used_ki_points ?? 0;
        if (typeof total === 'number') {
          items.push(
            <ResourceBlock
              key="ki_points"
              icon={<Footprints size={20} />}
              label="Points de ki"
              total={total}
              used={used}
              onUse={() => updateClassResource('used_ki_points', used + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('ki_points', newTotal)}
              onRestore={() => updateClassResource('used_ki_points', Math.max(0, used - 1))}
              color="blue"
            />
          );
        }
        break;
      }

      case 'Paladin':
        if (typeof classResources.lay_on_hands === 'number') {
          items.push(
            <ResourceBlock
              key="lay_on_hands"
              icon={<HandHeart size={20} />}
              label="Imposition des mains"
              total={classResources.lay_on_hands}
              used={classResources.used_lay_on_hands || 0}
              onUpdateTotal={(newTotal) => updateClassResource('lay_on_hands', newTotal)}
              onUpdateUsed={(v) => updateClassResource('used_lay_on_hands', v)}
              color="yellow"
              useNumericInput
              hideEdit={true}
              minusOnly={true}
              minusSize={26}
            />
          );
        }
        break;

      case 'Rôdeur':
        if (typeof classResources.favored_foe === 'number') {
          items.push(
            <ResourceBlock
              key="favored_foe"
              icon={<Target size={20} />}
              label="Ennemi juré"
              total={classResources.favored_foe}
              used={classResources.used_favored_foe || 0}
              onUse={() => updateClassResource('used_favored_foe', (classResources.used_favored_foe || 0) + 1)}
              onUpdateTotal={(newTotal) => updateClassResource('favored_foe', newTotal)}
              onRestore={() => updateClassResource('used_favored_foe', Math.max(0, (classResources.used_favored_foe || 0) - 1))}
              color="green"
            />
          );
        }
        break;

      case 'Roublard':
        if (classResources.sneak_attack) {
          items.push(
            <div key="sneak_attack" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skull size={20} className="text-red-500" />
                  <span className="text-sm font-medium text-gray-300">Attaque sournoise</span>
                </div>
                <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">
                  {player.class_resources.sneak_attack}
                </div>
              </div>
            </div>
          );
        }
        break;
    }

    if (!items.length) return null;

    return (
      <div className="stats-card">
        <div className="stat-header flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-100">Ressources de classe</h3>
        </div>
        <div className="p-4 space-y-4">{items}</div>
      </div>
    );
  };

  const initializeResources = async () => {
    if (!player.class) return;

    try {
      const defaultSpellSlots = getSpellSlotsByLevel(player.class, player.level);
      const defaultClassResources = getDefaultClassResources(player);

      const { error } = await supabase
        .from('players')
        .update({
          spell_slots: defaultSpellSlots,
          class_resources: defaultClassResources,
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        spell_slots: defaultSpellSlots,
        class_resources: defaultClassResources,
      });

      toast.success('Ressources initialisées');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des ressources:', error);
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  return (
    <div className="space-y-8">
      <KnownSpellsSection player={player} onUpdate={onUpdate} />

      {/* Section "Emplacements de sorts" masquée */}
      {/* {renderSpellSlots()} */}

      <div className="stats-card">
        <div className="stat-header flex items-center gap-3">
          <Book className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-100">Grimoire</h3>
        </div>
        <div className="p-4">
          <button
            onClick={() => setShowSpellbook(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <Book size={20} />
              Ouvrir le grimoire
            </div>
          </button>
        </div>
      </div>

      {/* Section "Ressources de classe" masquée */}
      {/* {renderClassResources()} */}

      {showSpellbook && (
        <SpellbookModal
          isOpen={showSpellbook}
          onClose={() => setShowSpellbook(false)}
          playerClass={player.class}
        />
      )}

      {showSpellSlotModal && spellSlotModalData && (
        <SpellSlotSelectionModal
          isOpen={showSpellSlotModal}
          onClose={() => {
            setShowSpellSlotModal(false);
            setSpellSlotModalData(null);
          }}
          onConfirm={(level) => {
            handleSpellSlotChange(level, true);
            setShowSpellSlotModal(false);
            setSpellSlotModalData(null);
          }}
          player={player}
          attackName={spellSlotModalData.attackName}
          suggestedLevel={1}
        />
      )}
    </div>
  );
}

/* ============================ Sous-composants Ressources ============================ */

function ResourceEditModal({
  label,
  total,
  onSave,
  onCancel,
}: {
  label: string;
  total: number;
  onSave: (newTotal: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<string>(total.toString());
  const handleSave = () => {
    const newValue = parseInt(value);
    if (!Number.isNaN(newValue) && newValue >= 0) onSave(newValue);
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="input-dark w-full px-3 py-2 rounded-md" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <Save size={16} />
          Sauvegarder
        </button>
        <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <X size={16} />
          Annuler
        </button>
      </div>
    </div>
  );
}

function ResourceBlock({
  icon,
  label,
  total,
  used,
  onUse,
  onRestore,
  onUpdateTotal,
  onUpdateUsed,
  useNumericInput = false,
  color = 'purple',
  onDelete,
  hideEdit = false,
  minusOnly = false,
  minusSize = 18,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse?: () => void;
  onRestore?: () => void;
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  onDelete?: () => void;
  hideEdit?: boolean;
  minusOnly?: boolean;
  minusSize?: number;
}) {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30',
  };

  return (
    <div className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClasses[color]}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center">
            {remaining}/{total}
          </div>
          {!hideEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-blue-900/30 rounded-full transition-colors"
              title="Modifier"
            >
              <Settings size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {useNumericInput ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-dark flex-1 px-3 py-1 rounded-md text-center"
            placeholder="0"
          />
          <button
            onClick={() => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(used + value);
                setAmount('');
              }
            }}
            className="p-1 text-red-500 hover:bg-red-900/30 rounded-md transition-colors"
            title="Dépenser"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Minus size={minusSize} />
          </button>
          {!minusOnly && (
            <button
              onClick={() => {
                const value = parseInt(amount) || 0;
                if (value > 0) {
                  onUpdateUsed?.(Math.max(0, used - value));
                  setAmount('');
                }
              }}
              className="p-1 text-green-500 hover:bg-green-900/30 rounded-md transition-colors"
              title="Récupérer"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onUse}
            disabled={remaining <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              remaining > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Minus size={16} className="mx-auto" />
          </button>
          <button
            onClick={onRestore}
            disabled={used <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              used > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Plus size={16} className="mx-auto" />
          </button>
        </div>
      )}

      {isEditing && !hideEdit && (
        <div className="mt-4 border-t border-gray-700/50 pt-4">
          <ResourceEditModal
            label={`Nombre total de ${label.toLowerCase()}`}
            total={total}
            onSave={(newTotal) => {
              onRestore && onRestore();
              onUpdateTotal(newTotal);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

export default AbilitiesTab;