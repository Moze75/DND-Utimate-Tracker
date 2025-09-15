import React, { useState } from 'react';
import {
  BookOpen, Sparkles, Plus, Minus, Settings, Flame, Music, Cross, Leaf,
  Wand2, Swords, Footprints, HandHeart, Target, Skull, Trash2, Save, X
} from 'lucide-react';
import { Player, ClassResources } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ClassResourcesSectionProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

interface ResourceBlockProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse: () => void;
  onRestore: () => void;
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  onDelete?: () => void;
  hideEdit?: boolean; // nouveau: permet de masquer la roue des paramètres
}

interface ResourceEditModalProps {
  label: string;
  total: number;
  onSave: (newTotal: number) => void;
  onCancel: () => void;
}

/* --------- Helpers --------- */

// Lecture robuste du modificateur de Charisme
const getChaModFromPlayer = (p: Player): number => {
  const abilities: any = (p as any)?.abilities;

  const toNum = (v: any): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^\d+-]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const getFromObj = (obj: any): any | null => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    const matchKey =
      keys.find(k => {
        const kk = k.toLowerCase();
        return kk === 'charisme' || kk === 'charisma' || kk === 'cha' || kk === 'car';
      }) ??
      keys.find(k => k.toLowerCase().includes('charis') || k.toLowerCase() === 'cha' || k.toLowerCase() === 'car');
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
    const mod = toNum(cha.modifier) ?? toNum(cha.mod) ?? toNum(cha.modValue) ?? toNum(cha.value);
    if (mod != null) return mod;

    const score = toNum(cha.score) ?? toNum(cha.total) ?? toNum(cha.base);
    if (score != null) return Math.floor((score - 10) / 2);
  }

  return 0;
};

/* --------- UI --------- */

const ResourceEditModal = ({ label, total, onSave, onCancel }: ResourceEditModalProps) => {
  const [value, setValue] = useState<string>(total.toString());

  const handleSave = () => {
    const newValue = parseInt(value);
    if (!Number.isNaN(newValue) && newValue >= 0) onSave(newValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-dark w-full px-3 py-2 rounded-md"
        />
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
};

const ResourceBlock = ({
  icon, label, total, used, onUse, onRestore, onUpdateTotal, onUpdateUsed,
  useNumericInput = false, color = 'purple', onDelete, hideEdit = false
}: ResourceBlockProps) => {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30'
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
        <div className="flex-1 flex items-center gap-1">
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
          >
            <Minus size={18} />
          </button>
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
              onRestore(); // reset used
              onUpdateTotal(newTotal);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
};

export function ClassResourcesSection({ player, onUpdate }: ClassResourcesSectionProps) {
  if (!player.class_resources || !player.class) return null;

  const updateClassResource = async (
    resource: keyof ClassResources,
    value: number | boolean
  ) => {
    if (!player.class_resources) return;

    // Barde: pas d'override, ignore toute tentative d'écriture du total
    if (resource === 'bardic_inspiration') {
      toast.error("Le total d'Inspiration bardique est calculé automatiquement (modificateur de Charisme).");
      return;
    }

    const cr = { ...player.class_resources };

    // Clamp pour le Barde (used uniquement)
    if (resource === 'used_bardic_inspiration' && typeof value === 'number') {
      const cap = getChaModFromPlayer(player);
      const upper = Math.max(0, cap);
      cr.used_bardic_inspiration = Math.min(Math.max(0, value), upper);
      // purge tout override persistant s'il existait
      if ((cr as any).bardic_inspiration !== undefined) {
        delete (cr as any).bardic_inspiration;
      }
    } else {
      (cr as any)[resource] = value;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ class_resources: cr })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        class_resources: cr
      });

      if (typeof value === 'boolean') {
        toast.success(`Récupération arcanique ${value ? 'utilisée' : 'disponible'}`);
      } else {
        const resourceNames: Record<string, string> = {
          rage: 'Rage',
          bardic_inspiration: 'Inspiration bardique',
          channel_divinity: 'Conduit divin',
          wild_shape: 'Forme sauvage',
          sorcery_points: 'Points de sorcellerie',
          action_surge: "Sursaut d'action",
          ki_points: 'Points de crédo',
          lay_on_hands: 'Imposition des mains',
          favored_foe: 'Ennemi juré'
        };

        const displayKey = resource.replace('used_', '');
        const resourceName = resourceNames[displayKey] || displayKey;
        const isUsed = resource.startsWith('used_');
        const previous = player.class_resources?.[resource] as number | boolean | undefined;
        const action =
          isUsed
            ? (typeof previous === 'number' && typeof value === 'number' && value > previous ? 'utilisé' : 'récupéré')
            : 'mis à jour';

        if (isUsed && typeof previous === 'number' && typeof value === 'number') {
          const diff = Math.abs(value - previous);
          toast.success(`${diff} ${resourceName} ${action}`);
        } else {
          toast.success(`${resourceName} ${action}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des ressources:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const cr = player.class_resources;
  const items: React.ReactNode[] = [];

  switch (player.class) {
    case 'Barbare':
      if (typeof cr.rage === 'number') {
        items.push(
          <ResourceBlock
            key="rage"
            icon={<Flame size={20} />}
            label="Rage"
            total={cr.rage}
            used={cr.used_rage || 0}
            onUse={() => updateClassResource('used_rage', (cr.used_rage || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('rage', n)}
            onRestore={() => updateClassResource('used_rage', Math.max(0, (cr.used_rage || 0) - 1))}
            color="red"
          />
        );
      }
      break;

    case 'Barde': {
      // Toujours auto: total = modificateur de Charisme, pas d'édition du total
      const cap = getChaModFromPlayer(player);
      const upper = Math.max(0, cap);
      const used = Math.min(cr.used_bardic_inspiration || 0, upper);

      items.push(
        <ResourceBlock
          key="bardic_inspiration"
          icon={<Music size={20} />}
          label="Inspiration bardique"
          total={cap}
          used={used}
          onUse={() => updateClassResource('used_bardic_inspiration', used + 1)}
          onUpdateTotal={() => { /* no-op: pas d'override */ }}
          onRestore={() => updateClassResource('used_bardic_inspiration', Math.max(0, used - 1))}
          color="purple"
          hideEdit // masque la roue des paramètres
        />
      );
      break;
    }

    case 'Clerc':
      if (typeof cr.channel_divinity === 'number') {
        items.push(
          <ResourceBlock
            key="channel_divinity"
            icon={<Cross size={20} />}
            label="Conduit divin"
            total={cr.channel_divinity}
            used={cr.used_channel_divinity || 0}
            onUse={() => updateClassResource('used_channel_divinity', (cr.used_channel_divinity || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('channel_divinity', n)}
            onRestore={() => updateClassResource('used_channel_divinity', Math.max(0, (cr.used_channel_divinity || 0) - 1))}
            color="yellow"
          />
        );
      }
      break;

    case 'Druide':
      if (typeof cr.wild_shape === 'number') {
        items.push(
          <ResourceBlock
            key="wild_shape"
            icon={<Leaf size={20} />}
            label="Forme sauvage"
            total={cr.wild_shape}
            used={cr.used_wild_shape || 0}
            onUse={() => updateClassResource('used_wild_shape', (cr.used_wild_shape || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('wild_shape', n)}
            onRestore={() => updateClassResource('used_wild_shape', Math.max(0, (cr.used_wild_shape || 0) - 1))}
            color="green"
          />
        );
      }
      break;

    case 'Ensorceleur':
      if (typeof cr.sorcery_points === 'number') {
        items.push(
          <ResourceBlock
            key="sorcery_points"
            icon={<Wand2 size={20} />}
            label="Points de sorcellerie"
            total={cr.sorcery_points}
            used={cr.used_sorcery_points || 0}
            onUse={() => updateClassResource('used_sorcery_points', (cr.used_sorcery_points || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('sorcery_points', n)}
            onRestore={() => updateClassResource('used_sorcery_points', Math.max(0, (cr.used_sorcery_points || 0) - 1))}
            color="purple"
          />
        );
      }
      break;

    case 'Guerrier':
      if (typeof cr.action_surge === 'number') {
        items.push(
          <ResourceBlock
            key="action_surge"
            icon={<Swords size={20} />}
            label="Sursaut d'action"
            total={cr.action_surge}
            used={cr.used_action_surge || 0}
            onUse={() => updateClassResource('used_action_surge', (cr.used_action_surge || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('action_surge', n)}
            onRestore={() => updateClassResource('used_action_surge', Math.max(0, (cr.used_action_surge || 0) - 1))}
            color="red"
          />
        );
      }
      break;

    case 'Magicien':
      if (cr.arcane_recovery !== undefined) {
        items.push(
          <div key="arcane_recovery" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-300">Récupération arcanique</span>
              </div>
              <button
                onClick={() => updateClassResource('used_arcane_recovery', !cr.used_arcane_recovery)}
                className={`h-8 px-3 flex items-center justify-center rounded-md transition-colors ${
                  cr.used_arcane_recovery ? 'bg-gray-800/50 text-gray-500' : 'text-blue-500 hover:bg-blue-900/30'
                }`}
              >
                {cr.used_arcane_recovery ? 'Utilisé' : 'Disponible'}
              </button>
            </div>
          </div>
        );
      }
      break;

    case 'Moine':
      if (typeof cr.ki_points === 'number') {
        items.push(
          <ResourceBlock
            key="ki_points"
            icon={<Footprints size={20} />}
            label="Points de crédo"
            total={cr.ki_points}
            used={cr.used_ki_points || 0}
            onUse={() => updateClassResource('used_ki_points', (cr.used_ki_points || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('ki_points', n)}
            onRestore={() => updateClassResource('used_ki_points', Math.max(0, (cr.used_ki_points || 0) - 1))}
            color="blue"
          />
        );
      }
      break;

    case 'Paladin': {
      // Imposition des mains
      if (typeof cr.lay_on_hands === 'number') {
        items.push(
          <ResourceBlock
            key="lay_on_hands"
            icon={<HandHeart size={20} />}
            label="Imposition des mains"
            total={cr.lay_on_hands}
            used={cr.used_lay_on_hands || 0}
            onUpdateTotal={(n) => updateClassResource('lay_on_hands', n)}
            onUpdateUsed={(v) => updateClassResource('used_lay_on_hands', v)}
            color="yellow"
            useNumericInput
          />
        );
      }

      // Conduits divins (N3+)
      const lvl = player.level ?? 0;
      if (lvl >= 3) {
        const cap = lvl >= 11 ? 3 : 2;
        const used = cr.used_channel_divinity || 0;
        items.push(
          <ResourceBlock
            key="paladin_channel_divinity"
            icon={<Cross size={20} />}
            label="Conduits divins"
            total={cap}
            used={used}
            onUse={() => updateClassResource('used_channel_divinity', Math.min(used + 1, cap))}
            onUpdateTotal={() => { /* cap calculé -> non éditable */ }}
            onRestore={() => updateClassResource('used_channel_divinity', Math.max(0, used - 1))}
            color="yellow"
            hideEdit
          />
        );
      }
      break;
    }

    case 'Rôdeur':
      if (typeof cr.favored_foe === 'number') {
        items.push(
          <ResourceBlock
            key="favored_foe"
            icon={<Target size={20} />}
            label="Ennemi juré"
            total={cr.favored_foe}
            used={cr.used_favored_foe || 0}
            onUse={() => updateClassResource('used_favored_foe', (cr.used_favored_foe || 0) + 1)}
            onUpdateTotal={(n) => updateClassResource('favored_foe', n)}
            onRestore={() => updateClassResource('used_favored_foe', Math.max(0, (cr.used_favored_foe || 0) - 1))}
            color="green"
          />
        );
      }
      break;

    case 'Roublard':
      if (cr.sneak_attack) {
        items.push(
          <div key="sneak_attack" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull size={20} className="text-red-500" />
                <span className="text-sm font-medium text-gray-300">Attaque sournoise</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">
                {cr.sneak_attack}
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
}