import React from 'react';
import { X, Check, Sword } from 'lucide-react';
import { InventoryItem } from '../../types/dnd';

const META_PREFIX = '#meta:';

type WeaponMeta = {
  damageDice: string;
  damageType: 'Tranchant' | 'Perforant' | 'Contondant';
  properties: string;
  range: string;
};
type ItemMeta = {
  type: 'weapon' | string;
  equipped?: boolean;
  weapon?: WeaponMeta;
  quantity?: number;
};

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try { return JSON.parse(metaLine.slice(META_PREFIX.length)); } catch { return null; }
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter(l => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}
function smartCapitalize(s: string) {
  const base = (s || '').trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function WeaponsManageModal({
  inventory,
  onClose,
  onEquip,
  onUnequip,
}: {
  inventory: InventoryItem[];
  onClose: () => void;
  onEquip: (item: InventoryItem) => Promise<void> | void;
  onUnequip: (item: InventoryItem) => Promise<void> | void;
}) {
  const [q, setQ] = React.useState('');
  const [pendingId, setPendingId] = React.useState<string | null>(null); // évite les doubles clics
  
  const weapons = React.useMemo(() => {
    return inventory
      .map(it => ({ it, meta: parseMeta(it.description) }))
      .filter(({ meta }) => (meta?.type === 'weapon'));
  }, [inventory]);

  const equipped = weapons.filter(w => w.meta?.equipped);
  const others = weapons.filter(w => !w.meta?.equipped);

  const filterByQuery = (arr: { it: InventoryItem; meta: ItemMeta | null }[]) => {
    const query = q.trim().toLowerCase();
    if (!query) return arr;
    return arr.filter(({ it, meta }) => {
      const name = (it.name || '').toLowerCase();
      const desc = visibleDescription(it.description).toLowerCase();
      const props = (meta?.weapon?.properties || '').toLowerCase();
      return name.includes(query) || desc.includes(query) || props.includes(query);
    });
  };

  const Section = ({ title, list }: { title: string; list: { it: InventoryItem; meta: ItemMeta | null }[] }) => (
    <div className="space-y-2">
      <h4 className="text-gray-200 font-semibold text-sm">{title}</h4>
      {list.length === 0 ? (
        <div className="text-sm text-gray-500">Aucune arme</div>
      ) : (
        list.map(({ it, meta }) => {
          const w = meta?.weapon;
          const isPending = pendingId === it.id;
          return (
            <div key={it.id} className="rounded-md border border-gray-700/50 bg-gray-800/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sword size={16} className="text-red-400 shrink-0" />
                    <div className="font-medium text-gray-100 truncate">{smartCapitalize(it.name)}</div>
                  </div>
                  {w && (
                    <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                      <div>Dés: {w.damageDice} {w.damageType}</div>
                      {w.properties && <div>Propriété: {w.properties}</div>}
                      {w.range && <div>Portée: {w.range}</div>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {meta?.equipped ? (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isPending) return;
                        setPendingId(it.id);
                        try { 
                          await onUnequip(it); 
                        } catch (error) {
                          console.error('Erreur déséquipement:', error);
                        } finally { 
                          setPendingId(null); 
                        }
                      }}
                      disabled={isPending}
                      className={`px-2 py-1 rounded text-xs border ${
                        isPending 
                          ? 'border-gray-500 text-gray-500 bg-gray-800/50 cursor-not-allowed'
                          : 'border-gray-