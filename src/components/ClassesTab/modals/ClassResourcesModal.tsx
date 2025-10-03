import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Music,
  Cross,
  Leaf,
  Wand2,
  Swords,
  HandHeart,
  Target,
  Skull,
  BookOpen,
  Save,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import type { ClassResources, Player } from '../../../types/dnd';
import { canonicalClass, getChaModFromPlayerLike } from './ClassUtilsModal';

// Utiliser le type Player du fichier types/dnd.ts au lieu de créer PlayerLike
type PlayerLike = Player;

/* ===========================================================
   Ressources de classe
   =========================================================== */

export function ResourceEditModal({
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
    const newValue = parseInt(value) || 0;
    if (newValue >= 0) onSave(newValue);
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
}

export function ResourceBlock({
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
  hideEdit = false,
  onGlobalPulse,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse: () => void;
  onRestore?: () => void; // rendu optionnel et sécurisé
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  hideEdit?: boolean;
  onGlobalPulse?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  // Etat pour l'effet pulse local
  const [pulse, setPulse] = useState(false);
  const triggerLocalPulse = () => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 260);
  };

  const ringColorClasses: Record<NonNullable<typeof color>, string> = {
    red: 'ring-red-400/60',
    purple: 'ring-purple-400/60',
    yellow: 'ring-yellow-400/60',
    green: 'ring-green-400/60',
    blue: 'ring-blue-400/60',
  };

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30',
  };

  return (
    <div
      className={[
        'resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3',
        'transition-shadow duration-200',
        pulse ? `ring-2 ${ringColorClasses[color]}` : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClasses[color]}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div
          className={[
            'text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center',
            'transition-transform duration-200',
            pulse ? `scale-105 ring-1 ${ringColorClasses[color]} shadow-md` : '',
          ].join(' ')}
        >
          {remaining}/{total}
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
            onClick={(e) => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(used + value);
                setAmount('');
                triggerLocalPulse();
                onGlobalPulse?.(e);
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
            onClick={(e) => {
              const remainingNow = Math.max(0, total - used);
              if (remainingNow <= 0) return;
              onUse();
              triggerLocalPulse();
              onGlobalPulse?.(e);
            }}
            disabled={Math.max(0, total - used) <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              Math.max(0, total - used) > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Minus size={16} className="mx-auto" />
          </button>
          <button
            onClick={() => {
              if (used <= 0) return;
              onRestore?.(); // sécurisé
            }}
            disabled={used <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              used > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Plus size={16} className="mx-auto" />
          </button>
        </div>
      )}
    </div>
  );
}

export function mirrorMonkKeys(resource: keyof ClassResources, value: any, into: Record<string, any>) {
  const r = String(resource);
  if (r === 'credo_points') {
    into.ki_points = value;
  } else if (r === 'used_credo_points') {
    into.used_ki_points = value;
  } else if (r === 'ki_points') {
    into.credo_points = value;
  } else if (r === 'used_ki_points') {
    into.used_credo_points = value;
  }
}

export function ClassResourcesCard({
  playerClass,
  resources,
  onUpdateResource,
  player,
  level,
  onPulseScreen,
}: {
  playerClass: string;
  resources?: ClassResources;
  onUpdateResource: (resource: keyof ClassResources, value: any) => void;
  player?: PlayerLike;
  level?: number;
  onPulseScreen?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  if (!resources || !playerClass) return null;

  const cls = canonicalClass(playerClass);
  const items: React.ReactNode[] = [];

  switch (cls) {
    case 'Barbare':
      if (typeof resources.rage === 'number') {
        items.push(
          <ResourceBlock
            key="rage"
            icon={<Flame size={20} />}
            label="Rage"
            total={resources.rage}
            used={resources.used_rage || 0}
            onUse={() => onUpdateResource('used_rage', (resources.used_rage || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('rage', n)}
            onRestore={() => onUpdateResource('used_rage', Math.max(0, (resources.used_rage || 0) - 1))}
            color="red"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Barde': {
      const cap = Math.max(0, getChaModFromPlayerLike(player));
      const used = Math.min(resources.used_bardic_inspiration || 0, cap);

      items.push(
        <ResourceBlock
          key="bardic_inspiration"
          icon={<Music size={20} />}
          label="Inspiration bardique"
          total={cap}
          used={used}
          onUse={() => onUpdateResource('used_bardic_inspiration', Math.min(used + 1, cap))}
          onUpdateTotal={() => { /* no-op */ }}
          onRestore={() => onUpdateResource('used_bardic_inspiration', Math.max(0, used - 1))}
          color="purple"
          hideEdit
          onGlobalPulse={onPulseScreen}
        />
      );
      break;
    }

    case 'Clerc':
      if (typeof resources.channel_divinity === 'number') {
        items.push(
          <ResourceBlock
            key="channel_divinity"
            icon={<Cross size={20} />}
            label="Conduit divin"
            total={resources.channel_divinity}
            used={resources.used_channel_divinity || 0}
            onUse={() => onUpdateResource('used_channel_divinity', (resources.used_channel_divinity || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('channel_divinity', n)}
            onRestore={() => onUpdateResource('used_channel_divinity', Math.max(0, (resources.used_channel_divinity || 0) - 1))}
            color="yellow"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Druide':
      if (typeof resources.wild_shape === 'number') {
        items.push(
          <ResourceBlock
            key="wild_shape"
            icon={<Leaf size={20} />}
            label="Forme sauvage"
            total={resources.wild_shape}
            used={resources.used_wild_shape || 0}
            onUse={() => onUpdateResource('used_wild_shape', (resources.used_wild_shape || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('wild_shape', n)}
            onRestore={() => onUpdateResource('used_wild_shape', Math.max(0, (resources.used_wild_shape || 0) - 1))}
            color="green"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

      case 'Ensorceleur':
        // Points de sorcellerie (existant)
        if (typeof resources.sorcery_points === 'number') {
          items.push(
            <ResourceBlock
              key="sorcery_points"
              icon={<Wand2 size={20} />}
              label="Points de sorcellerie"
              total={resources.sorcery_points}
              used={resources.used_sorcery_points || 0}
              onUse={() =>
                onUpdateResource(
                  'used_sorcery_points',
                  (resources.used_sorcery_points || 0) + 1
                )
              }
              onUpdateTotal={(n) => onUpdateResource('sorcery_points', n)}
              onRestore={() =>
                onUpdateResource(
                  'used_sorcery_points',
                  Math.max(0, (resources.used_sorcery_points || 0) - 1)
                )
              }
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        // Sorcellerie innée (2 charges, reset au repos long)
        {
          const innateTotal =
            typeof resources.innate_sorcery === 'number' ? resources.innate_sorcery : 2;
          const innateUsed = Math.min(
            resources.used_innate_sorcery || 0,
            innateTotal
          );
      
          items.push(
            <ResourceBlock
              key="innate_sorcery"
              icon={<Flame size={20} />}
              label="Sorcellerie innée"
              total={innateTotal}
              used={innateUsed}
              onUse={() =>
                onUpdateResource(
                  'used_innate_sorcery',
                  Math.min((resources.used_innate_sorcery || 0) + 1, innateTotal)
                )
              }
              // tu peux laisser éditable le total si tu veux l'ajuster un jour
              onUpdateTotal={(n) => onUpdateResource('innate_sorcery', n)}
              onRestore={() =>
                onUpdateResource(
                  'used_innate_sorcery',
                  Math.max(0, (resources.used_innate_sorcery || 0) - 1)
                )
              }
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        break;

    case 'Guerrier':
      if (typeof resources.action_surge === 'number') {
        items.push(
          <ResourceBlock
            key="action_surge"
            icon={<Swords size={20} />}
            label="Second souffle"
            total={resources.action_surge}
            used={resources.used_action_surge || 0}
            onUse={() => onUpdateResource('used_action_surge', (resources.used_action_surge || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('action_surge', n)}
            onRestore={() => onUpdateResource('used_action_surge', Math.max(0, (resources.used_action_surge || 0) - 1))}
            color="red"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Magicien':
      if (resources.arcane_recovery !== undefined) {
        items.push(
          <div
            key="arcane_recovery"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-300">Récupération arcanique</span>
              </div>
              <button
                onClick={() => onUpdateResource('used_arcane_recovery', !resources.used_arcane_recovery)}
                className={`h-8 px-3 flex items-center justify-center rounded-md transition-colors ${
                  resources.used_arcane_recovery ? 'bg-gray-800/50 text-gray-500' : 'text-blue-500 hover:bg-blue-900/30'
                }`}
              >
                {resources.used_arcane_recovery ? 'Utilisé' : 'Disponible'}
              </button>
            </div>
          </div>
        );
      }
      break;

      case 'Moine': {
        const total = (resources as any).credo_points ?? (resources as any).ki_points;
        const used = (resources as any).used_credo_points ?? (resources as any).used_ki_points ?? 0;
      
        if (typeof total === 'number') {
          items.push(
            <ResourceBlock
              key="credo_points"
              icon={<Sparkles size={20} />}
              label="Points de crédo"
              total={total}
              used={used}
              onUse={() => onUpdateResource('used_credo_points', used + 1)}
              onUpdateTotal={(n) => onUpdateResource('credo_points', n)}
              onRestore={() => onUpdateResource('used_credo_points', Math.max(0, used - 1))}
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        // Métabolisme surnaturel (N2+): 1 charge, reset repos long (manuellement avec +)
        if ((level || 0) >= 2) {
          const metaTotal = (resources as any).supernatural_metabolism ?? 1;
          const usedMeta = Math.min((resources as any).used_supernatural_metabolism || 0, metaTotal);
      
          items.push(
            <ResourceBlock
              key="supernatural_metabolism"
              icon={<HandHeart size={20} />}
              label="Métabolisme surnaturel"
              total={metaTotal}
              used={usedMeta}
              onUse={() =>
                onUpdateResource(
                  'used_supernatural_metabolism',
                  Math.min(usedMeta + 1, metaTotal)
                )
              }
              // total fixe → pas d'édition (no-op)
              onUpdateTotal={() => { /* no-op */ }}
              onRestore={() =>
                onUpdateResource(
                  'used_supernatural_metabolism',
                  Math.max(0, usedMeta - 1)
                )
              }
              color="purple"
              hideEdit
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        break;
      }

    case 'Occultiste': {
      // Placeholder simple: la "Magie de pacte" est signalée par un drapeau
      if ((resources as any)?.pact_magic) {
        items.push(
          <div
            key="pact_magic"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Magie de pacte</span>
              </div>
              <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">Repos court</span>
            </div>
          </div>
        );
      }
      break;
    }

    case 'Paladin': {
      // Total auto = 5 × niveau
      const lvl = Number(level || 0);
      const totalPoints = Math.max(0, lvl * 5);
      const used = Math.min(Math.max(0, resources.used_lay_on_hands || 0), totalPoints);

      items.push(
        <ResourceBlock
          key="lay_on_hands"
          icon={<HandHeart size={20} />}
          label="Imposition des mains"
          total={totalPoints}
          used={used}
          onUse={() => onUpdateResource('used_lay_on_hands', Math.min(used + 1, totalPoints))}
          onRestore={() => onUpdateResource('used_lay_on_hands', Math.max(0, used - 1))}
          onUpdateTotal={() => { /* no-op: total auto */ }}
          color="yellow"
          useNumericInput
          hideEdit
          onGlobalPulse={onPulseScreen}
          onUpdateUsed={(v) => {
            const clamped = Math.min(Math.max(0, v), totalPoints);
            onUpdateResource('used_lay_on_hands', clamped);
          }}
        />
      );

      // Conduits divins (N3+) — total calculé → pas d'édition
      if (lvl >= 3) {
        const cap = lvl >= 11 ? 3 : 2;
        const usedCd = resources.used_channel_divinity || 0;
        items.push(
          <ResourceBlock
            key="paladin_channel_divinity"
            icon={<Cross size={20} />}
            label="Conduits divins"
            total={cap}
            used={usedCd}
            onUse={() => onUpdateResource('used_channel_divinity', Math.min(usedCd + 1, cap))}
            onUpdateTotal={() => { /* cap calculé par niveau -> non éditable */ }}
            onRestore={() => onUpdateResource('used_channel_divinity', Math.max(0, usedCd - 1))}
            color="yellow"
            hideEdit
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;
    }

    case 'Rôdeur':
      if (typeof resources.favored_foe === 'number') {
        items.push(
          <ResourceBlock
            key="favored_foe"
            icon={<Target size={20} />}
            label="Ennemi juré"
            total={resources.favored_foe}
            used={resources.used_favored_foe || 0}
            onUse={() => onUpdateResource('used_favored_foe', (resources.used_favored_foe || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('favored_foe', n)}
            onRestore={() => onUpdateResource('used_favored_foe', Math.max(0, (resources.used_favored_foe || 0) - 1))}
            color="green"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Roublard':
      if (resources.sneak_attack) {
        items.push(
          <div
            key="sneak_attack"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull size={20} className="text-red-500" />
                <span className="text-sm font-medium text-gray-300">Attaque sournoise</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">{resources.sneak_attack}</div>
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

/* ===========================================================
   Helpers spécifiques – init ressources par classe
   =========================================================== */

export function buildDefaultsForClass(cls: string, level: number, player?: PlayerLike | any): Partial<ClassResources> {
  switch (cls) {
    case 'Barbare':
      return { rage: Math.min(6, Math.floor((level + 3) / 4) + 2), used_rage: 0 };
    case 'Barde':
      return { used_bardic_inspiration: 0 };
    case 'Clerc':
      return { channel_divinity: level >= 6 ? 2 : 1, used_channel_divinity: 0 };
    case 'Druide':
      return { wild_shape: 2, used_wild_shape: 0 };
    case 'Ensorceleur': {
      return {
        sorcery_points: level,
        used_sorcery_points: 0,
        innate_sorcery: 2,
        used_innate_sorcery: 0,
      } as any;
    }
    case 'Guerrier':
      return { action_surge: level >= 17 ? 2 : 1, used_action_surge: 0 };
    case 'Magicien':
      return { arcane_recovery: true, used_arcane_recovery: false };

    case 'Moine': {
      const base: any = {
        credo_points: level,
        used_credo_points: 0,
        ki_points: level,
        used_ki_points: 0,
      };
      // Métabolisme surnaturel: disponible à partir du niveau 2, 1 charge
      if (level >= 2) {
        base.supernatural_metabolism = 1;
        base.used_supernatural_metabolism = 0;
      }
      return base;
    }

    case 'Occultiste':
      // Drapeau simple pour signaler Pact Magic (UI minimale)
      return { pact_magic: true };
    case 'Paladin': {
      const base: any = { lay_on_hands: level * 5, used_lay_on_hands: 0 };
      if (level >= 3) {
        base.channel_divinity = level >= 11 ? 3 : 2;
        base.used_channel_divinity = 0;
      }
      return base;
    }
    case 'Rôdeur':
      return { favored_foe: Math.max(1, Math.floor((level + 3) / 4)), used_favored_foe: 0 };
    case 'Roublard':
      return { sneak_attack: `${Math.ceil(level / 2)}d6` };
    default:
      return {};
  }
}