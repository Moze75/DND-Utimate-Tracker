import React, { useMemo, useState, useEffect } from 'react';
import {
  Backpack, Plus, Trash2, Shield as ShieldIcon, Sword, FlaskRound as Flask, Star,
  Coins, Search, X, Check, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { attackService } from '../services/attackService';
import { Player, InventoryItem } from '../types/dnd';

/* ====================== Types & helpers ====================== */

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;

  inventory_item_id?: string | null;

  armor_formula?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    label?: string;
  } | null;

  shield_bonus?: number | null;

  weapon_meta?: {
    damageDice: string;
    damageType: 'Tranchant' | 'Perforant' | 'Contondant';
    properties: string;
    range: string;
  } | null;
}

type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool';

interface WeaponMeta {
  damageDice: string;
  damageType: 'Tranchant' | 'Perforant' | 'Contondant';
  properties: string;
  range: string;
}
interface ArmorMeta {
  base: number;
  addDex: boolean;
  dexCap?: number | null;
  label: string;
}
interface ShieldMeta {
  bonus: number;
}

interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}

const META_PREFIX = '#meta:';

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    return JSON.parse(metaLine.slice(META_PREFIX.length));
  } catch {
    return null;
  }
}

function injectMetaIntoDescription(desc: string | null | undefined, meta: ItemMeta): string {
  const base = (desc || '').trim();
  const noOldMeta = base
    .split('\n')
    .filter(l => !l.trim().startsWith(META_PREFIX))
    .join('\n')
    .trim();
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return (noOldMeta ? `${noOldMeta}\n` : '') + metaLine;
}

function stripPriceParentheses(name: string): string {
  return name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}
function smartCapitalize(name: string): string {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/* ====================== Markdown renderer (tables + simple lists) ====================== */

function isMarkdownTableBlock(lines: string[]) {
  return lines.length >= 2 && lines[0].trim().startsWith('|') && lines[0].includes('|');
}
function parseMarkdownTableBlock(lines: string[]) {
  const rows: string[][] = [];
  for (const line of lines) {
    const l = line.trim();
    if (!(l.startsWith('|') && l.endsWith('|') && l.includes('|'))) continue;
    const cells = l.substring(1, l.length - 1).split('|').map(c => c.trim());
    if (cells.every(c => /^[-:\s]+$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}
function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/g).map(b => b.split('\n'));
  return (
    <div className="space-y-2">
      {blocks.map((lines, idx) => {
        if (isMarkdownTableBlock(lines)) {
          const rows = parseMarkdownTableBlock(lines);
          if (rows.length === 0) return null;
          const header = rows[0];
          const body = rows.slice(1);
          return (
            <div key={idx} className="overflow-x-auto">
              <table className="w-full text-left text-sm border border-gray-700/50 rounded-md overflow-hidden">
                <thead className="bg-gray-800/60">
                  <tr>
                    {header.map((c, i) => (
                      <th key={i} className="px-2 py-1 border-b border-gray-700/50">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((r, ri) => (
                    <tr key={ri} className="odd:bg-gray-800/30">
                      {r.map((c, ci) => (
                        <td key={ci} className="px-2 py-1 align-top border-b border-gray-700/30">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every(l => l.trim().startsWith('- '))) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {lines.map((l, i) => <li key={i} className="text-sm text-gray-300">{l.replace(/^- /, '')}</li>)}
            </ul>
          );
        }
        return <p key={idx} className="text-sm text-gray-300 whitespace-pre-wrap">{lines.join('\n')}</p>;
      })}
    </div>
  );
}

/* ====================== Popup de confirmation ====================== */

function ConfirmEquipModal({
  open,
  mode, // 'equip' | 'unequip'
  itemName,
  onConfirm,
  onCancel
}: {
  open: boolean;
  mode: 'equip' | 'unequip';
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const title = mode === 'equip' ? 'Équiper cet objet ?' : 'Déséquiper cet objet ?';
  const label = mode === 'equip' ? 'Équiper' : 'Déséquiper';
  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-700 rounded-lg p-4 w-[min(28rem,95vw)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <button className="p-2 text-gray-400 hover:bg-gray-800 rounded" onClick={onCancel} aria-label="Fermer">
            <X />
          </button>
        </div>
        <p className="text-gray-300 mb-4 break-words">{smartCapitalize(itemName)}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          <button onClick={onConfirm} className="btn-primary px-4 py-2 rounded-lg">{label}</button>
        </div>
      </div>
    </div>
  );
}

/* ====================== Liste d’équipement: fetch + parsing ====================== */

type CatalogKind = 'armors' | 'shields' | 'weapons' | 'adventuring_gear' | 'tools';
interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  description?: string;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
  weapon?: WeaponMeta;
}

const ULT_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Equipements';
const URLS = {
  armors: `${ULT_BASE}/Armures.md`,
  shields: `${ULT_BASE}/Boucliers.md`,
  weapons: `${ULT_BASE}/Armes.md`,
  adventuring_gear: `${ULT_BASE}/Equipements_daventurier.md`,
  tools: `${ULT_BASE}/Outils.md`,
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch catalogue échoué: ${url}`);
  return await res.text();
}
function parseMarkdownTable(md: string): string[][] {
  const rows: string[][] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('|') && l.endsWith('|') && l.includes('|')) {
      const cells = l.substring(1, l.length - 1).split('|').map(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c))) continue;
      rows.push(cells);
    }
  }
  return rows;
}
function looksLikeHeader(cellA: string, cellB: string, keyword: RegExp) {
  return keyword.test(cellB || '') || /^nom$/i.test(cellA || '');
}
function parseArmors(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const [nomRaw, ca] = row;
    if (!nomRaw) continue;
    if (looksLikeHeader(nomRaw, ca, /classe d'armure|ca/i)) continue;
    const nom = stripPriceParentheses(nomRaw);
    let base = 10, addDex = false, dexCap: number | null = null;
    const dexMatch = ca.match(/(\d+)\s*\+\s*modificateur\s*de\s*dex/i);
    const capMatch = ca.match(/\(max\s*(\d+)\)/i);
    if (dexMatch) {
      base = +dexMatch[1];
      addDex = true;
      dexCap = capMatch ? +capMatch[1] : null;
    } else {
      const m = ca.match(/^\s*(\d+)\s*$/);
      if (m) { base = +m[1]; addDex = false; dexCap = null; }
    }
    items.push({ id: `armor:${nom}`, kind: 'armors', name: nom, description: '', armor: { base, addDex, dexCap, label: ca } });
  }
  return items;
}
function parseShields(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const [nomRaw, ca] = row;
    if (!nomRaw) continue;
    if (looksLikeHeader(nomRaw, ca, /classe d'armure|ca/i)) continue;
    const nom = stripPriceParentheses(nomRaw);
    const m = ca.match(/\+?\s*(\d+)/);
    const bonus = m ? +m[1] : 2;
    items.push({ id: `shield:${nom}`, kind: 'shields', name: nom, description: '', shield: { bonus } });
  }
  return items;
}
function parseWeapons(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 3) continue;
    const [nomRaw, degats, props] = row;
    if (!nomRaw) continue;
    if (/^nom$/i.test(nomRaw) || /d[ée]g[âa]ts/i.test(degats)) continue;
    const nom = stripPriceParentheses(nomRaw);
    const dmgMatch = (degats || '').match(/(\d+d\d+)/i);
    const damageDice = dmgMatch ? dmgMatch[1] : '1d6';
    let damageType: 'Tranchant' | 'Perforant' | 'Contondant' = 'Tranchant';
    if (/contondant/i.test(degats)) damageType = 'Contondant';
    else if (/perforant/i.test(degats)) damageType = 'Perforant';
    else if (/tranchant/i.test(degats)) damageType = 'Tranchant';
    let range = 'Corps à corps';
    const pm = (props || '').match(/portée\s*([\d,\.\/\s]+)/i);
    if (pm) {
      const first = pm[1].trim().split(/[\/\s]/)[0]?.trim() || '';
      if (first) range = `${first} m`;
    }
    items.push({ id: `weapon:${nom}`, kind: 'weapons', name: nom, description: '', weapon: { damageDice, damageType, properties: props || '', range } });
  }
  return items;
}
// Outils & Équipements d'aventurier: sections "## Titre" + texte (peuvent contenir des tableaux)
function parseSectionedList(md: string, kind: CatalogKind): CatalogItem[] {
  const items: CatalogItem[] = [];
  const lines = md.split('\n');
  let current: { name: string; descLines: string[] } | null = null;

  const isNoiseName = (n: string) =>
    !n ||
    /^types?$/i.test(n) ||
    /^sommaire$/i.test(n) ||
    /^table des matières$/i.test(n) ||
    /^inutiles?$/i.test(n) ||
    /^type inutile$/i.test(n);

  const flush = () => {
    if (!current) return;
    const rawName = current.name || '';
    const cleanName = stripPriceParentheses(rawName);
    const desc = current.descLines.join('\n').trim();
    // Drop éléments vides/parasites
    if (!cleanName.trim() || isNoiseName(cleanName) || !desc) {
      current = null;
      return;
    }
    items.push({ id: `${kind}:${cleanName}`, kind, name: cleanName, description: desc });
    current = null;
  };

  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/); // titres de niveau 2
    if (h) {
      if (current) flush();
      current = { name: h[1].trim(), descLines: [] };
      continue;
    }
    // délimiteurs de sections
    if (/^---\s*$/.test(line)) {
      if (current) { flush(); continue; }
    }
    if (current) current.descLines.push(line);
  }
  if (current) flush();
  return items;
}

/* ====================== Modal Liste d’équipement ====================== */

type FilterState = {
  weapons: boolean;
  armors: boolean;
  shields: boolean;
  adventuring_gear: boolean;
  tools: boolean;
};

function EquipmentListModal({
  onClose,
  onAddItem,
  allowedKinds = null,
}: {
  onClose: () => void;
  onAddItem: (item: { name: string; description?: string; meta: ItemMeta }) => void;
  allowedKinds?: CatalogKind[] | null;
}) {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<CatalogItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    weapons: true, armors: true, shields: true, adventuring_gear: true, tools: true
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [armorsMd, shieldsMd, weaponsMd, gearMd, toolsMd] = await Promise.all([
          fetchText(URLS.armors), fetchText(URLS.shields), fetchText(URLS.weapons),
          fetchText(URLS.adventuring_gear), fetchText(URLS.tools),
        ]);
        const list: CatalogItem[] = [
          ...parseArmors(armorsMd),
          ...parseShields(shieldsMd),
          ...parseWeapons(weaponsMd),
          ...parseSectionedList(gearMd, 'adventuring_gear'),
          ...parseSectionedList(toolsMd, 'tools'),
        ];
        // Nettoyage (supprime doublons & entrées vides)
        const seen = new Set<string>();
        const cleaned = list.filter(ci => {
          const nm = (ci.name || '').trim();
          if (!nm) return false;
          const id = ci.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setAll(cleaned);
      } catch (e) {
        console.error(e);
        toast.error('Erreur de chargement de la liste');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const effectiveFilters: FilterState = React.useMemo(() => {
    if (!allowedKinds) return filters;
    return {
      weapons: allowedKinds.includes('weapons'),
      armors: allowedKinds.includes('armors'),
      shields: allowedKinds.includes('shields'),
      adventuring_gear: allowedKinds.includes('adventuring_gear'),
      tools: allowedKinds.includes('tools'),
    };
  }, [allowedKinds, filters]);

  const noneSelected = !effectiveFilters.weapons && !effectiveFilters.armors && !effectiveFilters.shields && !effectiveFilters.adventuring_gear && !effectiveFilters.tools;

  const filtered = useMemo(() => {
    if (noneSelected) return [];
    const q = query.trim().toLowerCase();
    return all.filter(ci => {
      if (!effectiveFilters[ci.kind]) return false;
      if (allowedKinds && !allowedKinds.includes(ci.kind)) return false;
      if (!q) return true;
      if (smartCapitalize(ci.name).toLowerCase().includes(q)) return true;
      if ((ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description || '').toLowerCase().includes(q)) return true;
      return false;
    });
  }, [all, query, effectiveFilters, allowedKinds, noneSelected]);

  const handlePick = (ci: CatalogItem) => {
    let meta: ItemMeta = { type: 'equipment', quantity: 1, equipped: false };
    if (ci.kind === 'armors' && ci.armor) meta = { type: 'armor', quantity: 1, equipped: false, armor: ci.armor };
    if (ci.kind === 'shields' && ci.shield) meta = { type: 'shield', quantity: 1, equipped: false, shield: ci.shield };
    if (ci.kind === 'weapons' && ci.weapon) meta = { type: 'weapon', quantity: 1, equipped: false, weapon: ci.weapon };
    if (ci.kind === 'tools') meta = { type: 'tool', quantity: 1, equipped: false };
    const description = (ci.kind === 'adventuring_gear' || ci.kind === 'tools') ? (ci.description || '').trim() : '';
    onAddItem({ name: ci.name, description, meta });
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const typeButtons: CatalogKind[] = ['weapons','armors','shields','adventuring_gear','tools'];

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900 flex flex-col" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-100 font-semibold text-lg">Liste des équipements</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg" aria-label="Fermer">
              <X />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-[220px] flex-1">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="input-dark px-3 py-2 rounded-md w-full"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {typeButtons.map(k => {
                if (allowedKinds && !allowedKinds.includes(k)) return null;
                return (
                  <button
                    key={k}
                    onClick={() => setFilters(prev => ({ ...prev, [k]: !prev[k] }))}
                    className={`px-2 py-1 rounded text-xs border ${
                      effectiveFilters[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'
                    }`}
                  >
                    {k === 'weapons' ? 'Armes' :
                     k === 'armors' ? 'Armures' :
                     k === 'shields' ? 'Boucliers' :
                     k === 'adventuring_gear' ? 'Équipements' : 'Outils'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-gray-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm">Aucun résultat</div>
          ) : (
            filtered.map(ci => {
              const isOpen = !!expanded[ci.id];
              return (
                <div key={ci.id} className="bg-gray-800/50 border border-gray-700/50 rounded-md">
                  <div className="flex items-start justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <button className="text-gray-100 font-medium hover:underline break-words text-left" onClick={() => toggleExpand(ci.id)}>
                        {smartCapitalize(ci.name)}
                      </button>
                      <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                        {ci.kind === 'armors' && ci.armor && <div>CA: {ci.armor.label}</div>}
                        {ci.kind === 'shields' && ci.shield && <div>Bonus de bouclier: +{ci.shield.bonus}</div>}
                        {ci.kind === 'weapons' && ci.weapon && (
                          <>
                            <div>Dégâts: {ci.weapon.damageDice} {ci.weapon.damageType}</div>
                            {ci.weapon.properties && <div>Propriété: {ci.weapon.properties}</div>}
                            {ci.weapon.range && <div>Portée: {ci.weapon.range}</div>}
                          </>
                        )}
                        {(ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description ? 'Voir le détail' : 'Équipement')}
                      </div>
                    </div>
                    <button onClick={() => handlePick(ci)} className="btn-primary px-3 py-2 rounded-lg flex items-center gap-1">
                      <Check className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      {(ci.kind === 'adventuring_gear' || ci.kind === 'tools')
                        ? <MarkdownLite text={(ci.description || '').trim()} />
                        : <div className="text-sm text-gray-400">Aucun détail supplémentaire</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================== Modals Custom & Edit ====================== */

function CustomItemModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (payload: { name: string; description: string; meta: ItemMeta }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<MetaType>('equipment');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [armBase, setArmBase] = useState<number>(12);
  const [armAddDex, setArmAddDex] = useState<boolean>(true);
  const [armDexCap, setArmDexCap] = useState<number | ''>(2);
  const [shieldBonus, setShieldBonus] = useState<number>(2);

  const [wDice, setWDice] = useState('1d6');
  const [wType, setWType] = useState<'Tranchant' | 'Perforant' | 'Contondant'>('Tranchant');
  const [wProps, setWProps] = useState('');
  const [wRange, setWRange] = useState('Corps à corps');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const add = () => {
    const cleanNameRaw = name.trim();
    if (!cleanNameRaw) return toast.error('Nom requis');
    if (quantity <= 0) return toast.error('Quantité invalide');
    const cleanName = smartCapitalize(cleanNameRaw);
    let meta: ItemMeta = { type, quantity, equipped: false };
    if (type === 'armor') {
      const cap = armDexCap === '' ? null : Number(armDexCap);
      meta.armor = { base: armBase, addDex: armAddDex, dexCap: cap, label: `${armBase}${armAddDex ? ` + modificateur de Dex${cap != null ? ` (max ${cap})` : ''}` : ''}` };
    } else if (type === 'shield') {
      meta.shield = { bonus: shieldBonus };
    } else if (type === 'weapon') {
      meta.weapon = { damageDice: wDice, damageType: wType, properties: wProps, range: wRange };
    }
    onAdd({ name: cleanName, description: description.trim(), meta });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900/95 w-screen h-screen overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">Objet personnalisé</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"><X /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom</label>
            <input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select className="input-dark w-full px-3 py-2 rounded-md" value={type} onChange={e => setType(e.target.value as MetaType)}>
              <option value="equipment">Équipement</option>
              <option value="potion">Potion / Poison</option>
              <option value="weapon">Arme</option>
              <option value="armor">Armure</option>
              <option value="shield">Bouclier</option>
              <option value="jewelry">Bijoux</option>
              <option value="tool">Outils</option>
            </select>
          </div>
        </div>

        {type === 'armor' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Base CA</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={armBase} onChange={e => setArmBase(parseInt(e.target.value) || 10)} /></div>
            <div className="flex items-center gap-2"><input id="addDex" type="checkbox" checked={armAddDex} onChange={e => setArmAddDex(e.target.checked)} /><label htmlFor="addDex" className="text-sm text-gray-300">Ajoute mod DEX</label></div>
            <div><label className="block text-sm text-gray-400 mb-1">Cap DEX (vide = illimité)</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={armDexCap} onChange={e => setArmDexCap(e.target.value === '' ? '' : parseInt(e.target.value))} /></div>
          </div>
        )}
        {type === 'shield' && (<div className="mt-3"><label className="block text-sm text-gray-400 mb-1">Bonus de bouclier</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={shieldBonus} onChange={e => setShieldBonus(parseInt(e.target.value) || 0)} /></div>)}
        {type === 'weapon' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} placeholder="1d6" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Type de dégâts</label><select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}><option>Tranchant</option><option>Perforant</option><option>Contondant</option></select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Propriété(s)</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} placeholder="Finesse, Polyvalente..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Portée</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} placeholder="Corps à corps, 6 m..." /></div>
          </div>
        )}

        <div className="mt-3">
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-gray-400">Quantité</label>
          <input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={add} className="btn-primary px-4 py-2 rounded-lg">Ajouter</button>
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function InventoryItemEditModal({
  item, onClose, onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = parseMeta(item.description) || { type: 'equipment', quantity: 1, equipped: false } as ItemMeta;
  const [name, setName] = useState(smartCapitalize(item.name));
  const [description, setDescription] = useState(visibleDescription(item.description));
  const [quantity, setQuantity] = useState<number>(meta.quantity ?? 1);

  const [wDice, setWDice] = useState(meta.weapon?.damageDice || '1d6');
  const [wType, setWType] = useState<'Tranchant' | 'Perforant' | 'Contondant'>(meta.weapon?.damageType || 'Tranchant');
  const [wProps, setWProps] = useState(meta.weapon?.properties || '');
  const [wRange, setWRange] = useState(meta.weapon?.range || 'Corps à corps');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const save = async () => {
    try {
      let nextMeta: ItemMeta = { ...meta, quantity: Math.max(1, quantity) };
      if (nextMeta.type === 'weapon') {
        nextMeta = {
          ...nextMeta,
          weapon: {
            damageDice: wDice || '1d6',
            damageType: wType,
            properties: wProps || '',
            range: wRange || 'Corps à corps'
          }
        };
      }
      const nextDesc = injectMetaIntoDescription(description, nextMeta);
      const { error } = await supabase.from('inventory_items').update({ name: smartCapitalize(name.trim()), description: nextDesc }).eq('id', item.id);
      if (error) throw error;
      toast.success('Objet mis à jour');
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900/95 w-screen h-screen overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-100">Modifier l’objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"><X /></button>
        </div>

        <div className="space-y-3">
          <div><label className="block text-sm text-gray-400 mb-1">Nom</label><input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea className="input-dark w-full px-3 py-2 rounded-md" rows={6} value={description} onChange={e => setDescription(e.target.value)} /></div>

          {meta.type === 'weapon' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Type de dégâts</label><select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}><option>Tranchant</option><option>Perforant</option><option>Contondant</option></select></div>
              <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Propriété(s)</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} /></div>
              <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Portée</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} /></div>
            </div>
          )}

          <div className="flex items-center gap-3"><label className="text-sm text-gray-400">Quantité</label><input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} /></div>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={save} className="btn-primary px-4 py-2 rounded-lg">Sauvegarder</button>
            <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Popup slot (image) ====================== */

const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag') =>
  type === 'armor' ? 'Armure'
  : type === 'shield' ? 'Bouclier'
  : type === 'weapon' ? 'Armes'
  : type === 'potion' ? 'Potions'
  : type === 'jewelry' ? 'Bijoux'
  : 'Sac à dos';

interface InfoBubbleProps {
  equipment: Equipment | null;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onClose: () => void;
  onToggleEquip?: () => void;
  isEquipped?: boolean;
  onRequestOpenList?: () => void;
  onOpenEditFromSlot?: () => void;
}

const InfoBubble = ({ equipment, type, onClose, onToggleEquip, isEquipped, onRequestOpenList, onOpenEditFromSlot }: InfoBubbleProps) => (
  <div className="fixed inset-0 z-[9999]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-[min(32rem,95vw)] border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
        <div className="flex items-center gap-1">
          {(type === 'armor' || type === 'shield' || type === 'weapon') && equipment && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleEquip?.(); }}
              className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
            >
              {isEquipped ? 'Équipé' : 'Non équipé'}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenEditFromSlot?.(); }}
            className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
            title="Paramètres"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {equipment ? (
        <div className="space-y-2">
          {equipment.name && <h5 className="font-medium text-gray-100 break-words">{smartCapitalize(equipment.name)}</h5>}
          {equipment.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{equipment.description}</p>}

          {type === 'armor' && equipment.armor_formula && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Formule</span>
              <span className="font-medium text-gray-100">{equipment.armor_formula.label || ''}</span>
            </div>
          )}

          {type === 'shield' && typeof equipment.shield_bonus === 'number' && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Bonus de bouclier</span>
              <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
            </div>
          )}

          {type === 'weapon' && equipment.weapon_meta && (
            <div className="mt-1 text-sm text-gray-300 space-y-1">
              <div className="flex items-center justify-between"><span className="text-gray-400">Dés</span><span className="font-medium text-gray-100">{equipment.weapon_meta.damageDice}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400">Type</span><span className="font-medium text-gray-100">{equipment.weapon_meta.damageType}</span></div>
              {equipment.weapon_meta.properties && <div className="flex items-center justify-between"><span className="text-gray-400">Propriété</span><span className="font-medium text-gray-100">{equipment.weapon_meta.properties}</span></div>}
              {equipment.weapon_meta.range && <div className="flex items-center justify-between"><span className="text-gray-400">Portée</span><span className="font-medium text-gray-100">{equipment.weapon_meta.range}</span></div>}
            </div>
          )}
        </div>
      ) : (
        (type === 'armor' || type === 'shield' || type === 'weapon') && (
          <div className="text-sm text-gray-400">
            Aucun {type === 'armor' ? 'armure' : type === 'shield' ? 'bouclier' : 'arme'} équipé.
            <div className="mt-3">
              <button onClick={() => onRequestOpenList?.()} className="btn-primary px-3 py-2 rounded-lg">Équiper depuis la liste</button>
            </div>
          </div>
        )
      )}
    </div>
  </div>
);

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onRequestOpenList: () => void;
  onToggleEquipFromSlot: () => void;
  onOpenEditFromSlot: () => void;
  isEquipped: boolean;
}

const EquipmentSlot = ({
  icon, position, equipment, type, onRequestOpenList, onToggleEquipFromSlot, onOpenEditFromSlot, isEquipped
}: EquipmentSlotProps) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowInfo(v => !v)}
        className={`absolute ${position} ${type === 'bag' ? 'w-24 h-24' : 'w-12 h-12'} rounded-lg hover:bg-gray-700/20 border border-gray-600/50 flex items-center justify-center`}
        style={{ zIndex: showInfo ? 50 : 10 }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {type === 'bag' ? icon : React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
      </button>

      {showInfo && (
        <InfoBubble
          equipment={equipment}
          type={type}
          onClose={() => setShowInfo(false)}
          onToggleEquip={onToggleEquipFromSlot}
          isEquipped={isEquipped}
          onRequestOpenList={onRequestOpenList}
          onOpenEditFromSlot={onOpenEditFromSlot}
        />
      )}
    </>
  );
};

/* ====================== Composant principal ====================== */

interface EquipmentTabProps {
  player: Player;
  inventory: InventoryItem[];
  onPlayerUpdate: (player: Player) => void;
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
}

type Currency = 'gold' | 'silver' | 'copper';

const CurrencyInput = ({ currency, value, onAdd, onSpend }: {
  currency: Currency;
  value: number;
  onAdd: (n: number) => void;
  onSpend: (n: number) => void;
}) => {
  const [amount, setAmount] = useState<string>('');
  const getColor = (c: Currency) => c === 'gold' ? 'text-yellow-500' : c === 'silver' ? 'text-gray-300' : 'text-orange-400';
  const getName = (c: Currency) => c === 'gold' ? 'Or' : c === 'silver' ? 'Argent' : 'Cuivre';
  const act = (add: boolean) => { const n = parseInt(amount) || 0; if (n > 0) { (add ? onAdd : onSpend)(n); setAmount(''); } };
  return (
    <div className="flex items-center gap-2 h-11 relative">
      <div className={`w-16 text-center font-medium ${getColor(currency)}`}>{getName(currency)}</div>
      <div className="w-16 h-full text-center bg-gray-800/50 rounded-md flex items-center justify-center font-bold">{value}</div>
      <div className="flex-1 flex items-center justify-end gap-1">
        <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-dark w-20 h-11 px-2 rounded-md text-center text-base" placeholder="0" />
        <button onClick={() => act(true)} className="h-11 w-[72px] text-base text-green-500 hover:bg-green-900/30 rounded-md border border-green-500/20 hover:border-green-500/40">Ajouter</button>
        <button onClick={() => act(false)} className="h-11 w-[72px] text-base text-red-500 hover:bg-red-900/30 rounded-md border border-red-500/20 hover:border-red-500/40">Dépenser</button>
      </div>
    </div>
  );
};

export function EquipmentTab({
  player, inventory, onPlayerUpdate, onInventoryUpdate
}: EquipmentTabProps) {
  const [showList, setShowList] = useState(false);
  const [allowedKinds, setAllowedKinds] = useState<CatalogKind[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ mode: 'equip' | 'unequip'; item: InventoryItem } | null>(null);

  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [weapon, setWeapon] = useState<Equipment | null>(player.equipment?.weapon || null);
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  // Synthèses dynamiques pour bijoux/potions (liste provenant de l’inventaire)
  const jewelryItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'jewelry'), [inventory]);
  const potionItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'potion'), [inventory]);
  const jewelryEquip: Equipment = useMemo(() => ({
    name: 'Bijoux',
    description: jewelryItems.length
      ? jewelryItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n')
      : '',
    isTextArea: true
  }), [jewelryItems]);
  const potionEquip: Equipment = useMemo(() => ({
    name: 'Potions et poisons',
    description: potionItems.length
      ? potionItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n')
      : '',
    isTextArea: true
  }), [potionItems]);

  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);

  const saveEquipment = async (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const nextEquipment = { ...player.equipment, [type]: equipment };
      const { error } = await supabase.from('players').update({ equipment: nextEquipment }).eq('id', player.id);
      if (error) throw error;
      onPlayerUpdate({ ...player, equipment: nextEquipment });
    } catch (error) {
      console.error('Erreur équipement:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const refreshInventory = async () => {
    const { data } = await supabase.from('inventory_items').select('*').eq('player_id', player.id);
    if (data) onInventoryUpdate(data);
  };

  const notifyAttacksChanged = () => {
    try {
      window.dispatchEvent(new CustomEvent('attacks:changed', { detail: { playerId: player.id } }));
    } catch {}
  };

  const createOrUpdateWeaponAttack = async (name: string, w?: WeaponMeta | null) => {
    try {
      const attacks = await attackService.getPlayerAttacks(player.id);
      const existing = attacks.find(a => norm(a.name) === norm(name));
      const payload = {
        player_id: player.id,
        name,
        damage_dice: w?.damageDice || '1d6',
        damage_type: w?.damageType || 'Tranchant',
        range: w?.range || 'Corps à corps',
        properties: w?.properties || '',
        manual_attack_bonus: null,
        manual_damage_bonus: null,
        expertise: false,
        attack_type: 'physical' as const,
        spell_level: null as any,
        ammo_count: (existing as any)?.ammo_count ?? 0
      };
      if (existing) {
        await attackService.updateAttack({ ...payload, id: existing.id });
      } else {
        await attackService.addAttack(payload);
      }
      notifyAttacksChanged();
    } catch (err) {
      console.error('Création/mise à jour attaque échouée', err);
    }
  };

  const applyInventoryMetaLocal = (itemId: string, nextMeta: ItemMeta) => {
    const next = inventory.map(it => it.id === itemId
      ? { ...it, description: injectMetaIntoDescription(visibleDescription(it.description), nextMeta) }
      : it
    );
    onInventoryUpdate(next);
  };

  const addFromList = async (payload: { name: string; description?: string; meta: ItemMeta }) => {
    try {
      const meta: ItemMeta = { ...payload.meta, equipped: false };
      const finalDesc = injectMetaIntoDescription(payload.description || '', meta);
      const { error } = await supabase.from('inventory_items').insert([{ player_id: player.id, name: smartCapitalize(payload.name), description: finalDesc }]);
      if (error) throw error;
      await refreshInventory();
      toast.success('Équipement ajouté');
    } catch (e) {
      console.error(e);
      toast.error('Erreur ajout équipement');
    } finally {
      setShowList(false);
      setAllowedKinds(null);
    }
  };

  const addCustom = async (payload: { name: string; description: string; meta: ItemMeta }) => {
    try {
      const finalDesc = injectMetaIntoDescription(payload.description || '', { ...payload.meta, equipped: false });
      const { error } = await supabase.from('inventory_items').insert([{ player_id: player.id, name: smartCapitalize(payload.name), description: finalDesc }]);
      if (error) throw error;
      await refreshInventory();
      toast.success('Objet personnalisé ajouté');
    } catch (e) {
      console.error(e);
      toast.error('Erreur ajout objet');
    } finally {
      setShowCustom(false);
    }
  };

  const removeItemFromInventory = async (itemId: string) => {
    if (!window.confirm('Supprimer cet objet ?')) return;
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) throw error;
      onInventoryUpdate(inventory.filter(i => i.id !== itemId));
      toast.success('Objet supprimé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur suppression');
    }
  };

  const updateItemMeta = async (item: InventoryItem, nextMeta: ItemMeta) => {
    applyInventoryMetaLocal(item.id, nextMeta);
    const nextDesc = injectMetaIntoDescription(visibleDescription(item.description), nextMeta);
    const { error } = await supabase.from('inventory_items').update({ description: nextDesc }).eq('id', item.id);
    if (error) throw error;
  };

  const unequipOthersOfType = async (type: 'armor' | 'shield', keepItemId?: string) => {
    const updates: Promise<any>[] = [];
    for (const it of inventory) {
      const meta = parseMeta(it.description);
      if (!meta) continue;
      if ((type === 'armor' && meta.type === 'armor') || (type === 'shield' && meta.type === 'shield')) {
        if (it.id !== keepItemId && meta.equipped) {
          const next = { ...meta, equipped: false };
          applyInventoryMetaLocal(it.id, next);
          updates.push(supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(it.description), next) }).eq('id', it.id));
        }
      }
    }
    if (updates.length) await Promise.allSettled(updates);
  };

  // Multi-armes: ne pas forcer l’unicité dans le slot
  const performToggle = async (item: InventoryItem, mode: 'equip' | 'unequip') => {
    const meta = parseMeta(item.description);
    if (!meta) return;

    try {
      if (meta.type === 'armor') {
        if (mode === 'unequip' && armor?.inventory_item_id === item.id) {
          setArmor(null); await saveEquipment('armor', null); await updateItemMeta(item, { ...meta, equipped: false });
          toast.success('Armure déséquipée');
        } else if (mode === 'equip') {
          await unequipOthersOfType('armor', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            armor_formula: meta.armor ? { base: meta.armor.base, addDex: meta.armor.addDex, dexCap: meta.armor.dexCap ?? null, label: meta.armor.label } : null,
            shield_bonus: null,
            weapon_meta: null,
          };
          setArmor(eq); await saveEquipment('armor', eq); await updateItemMeta(item, { ...meta, equipped: true });
          toast.success('Armure équipée');
        }
      } else if (meta.type === 'shield') {
        if (mode === 'unequip' && shield?.inventory_item_id === item.id) {
          setShield(null); await saveEquipment('shield', null); await updateItemMeta(item, { ...meta, equipped: false });
          toast.success('Bouclier déséquipé');
        } else if (mode === 'equip') {
          await unequipOthersOfType('shield', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            shield_bonus: meta.shield?.bonus ?? null,
            armor_formula: null,
            weapon_meta: null,
          };
          setShield(eq); await saveEquipment('shield', eq); await updateItemMeta(item, { ...meta, equipped: true });
          toast.success('Bouclier équipé');
        }
      } else if (meta.type === 'weapon') {
        if (mode === 'unequip') {
          await updateItemMeta(item, { ...meta, equipped: false });
          // Si le slot affiche précisément cette arme, l’effacer du slot
          if (weapon?.inventory_item_id === item.id) { setWeapon(null); await saveEquipment('weapon', null); }
          toast.success('Arme déséquipée');
        } else if (mode === 'equip') {
          // Marque l’arme comme équipée, et si le slot est vide, y placer un aperçu
          await updateItemMeta(item, { ...meta, equipped: true });
          if (!weapon) {
            const eq: Equipment = {
              name: item.name,
              description: visibleDescription(item.description),
              inventory_item_id: item.id,
              armor_formula: null,
              shield_bonus: null,
              weapon_meta: meta.weapon ? {
                damageDice: meta.weapon.damageDice || '1d6',
                damageType: meta.weapon.damageType || 'Tranchant',
                properties: meta.weapon.properties || '',
                range: meta.weapon.range || 'Corps à corps',
              } : {
                damageDice: '1d6',
                damageType: 'Tranchant',
                properties: '',
                range: 'Corps à corps',
              }
            };
            setWeapon(eq);
            await saveEquipment('weapon', eq);
          }
          await createOrUpdateWeaponAttack(item.name, meta.weapon);
          toast.success('Arme équipée');
        }
      }

      await refreshInventory();
    } catch (e) {
      console.error(e);
      toast.error('Erreur bascule équiper');
    }
  };

  const requestToggleWithConfirm = (item: InventoryItem) => {
    const meta = parseMeta(item.description);
    if (!meta) return toast.error("Objet sans métadonnées. Ouvrez Paramètres et précisez sa nature.");
    const isArmor = meta.type === 'armor';
    const isShield = meta.type === 'shield';
    const isWeapon = meta.type === 'weapon';

    const equipped =
      (isArmor && armor?.inventory_item_id === item.id) ||
      (isShield && shield?.inventory_item_id === item.id) ||
      (isWeapon && (parseMeta(item.description)?.equipped === true)); // armes: basé sur meta.equipped

    setConfirmPayload({ mode: equipped ? 'unequip' : 'equip', item });
    setConfirmOpen(true);
  };

  // Ouvre l’édition depuis le slot (icône roue)
  const openEditFromSlot = (slot: 'armor' | 'shield' | 'weapon') => {
    const eq = slot === 'armor' ? armor : slot === 'shield' ? shield : weapon;
    if (!eq?.inventory_item_id) return;
    const item = inventory.find(i => i.id === eq.inventory_item_id);
    if (item) setEditingItem(item);
  };

  const toggleFromSlot = (slot: 'armor' | 'shield' | 'weapon') => {
    const eq = slot === 'armor' ? armor : slot === 'shield' ? shield : weapon;
    if (!eq) return;
    const item = eq.inventory_item_id
      ? inventory.find(i => i.id === eq.inventory_item_id)
      : undefined;
    if (!item) return;
    setConfirmPayload({ mode: 'unequip', item });
    setConfirmOpen(true);
  };

  /* ===== Sac: filtres (gauche) + recherche (droite) ===== */
  const [bagFilter, setBagFilter] = useState('');
  const [bagKinds, setBagKinds] = useState<Record<MetaType, boolean>>({
    armor: true, shield: true, weapon: true, equipment: true, potion: true, jewelry: true, tool: true
  });

  const filteredInventory = useMemo(() => {
    const q = bagFilter.trim().toLowerCase();
    return inventory.filter(i => {
      const meta = parseMeta(i.description);
      const kind: MetaType = (meta?.type || 'equipment') as MetaType;
      if (!bagKinds[kind]) return false;
      if (!q) return true;
      const name = stripPriceParentheses(i.name).toLowerCase();
      const desc = visibleDescription(i.description).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [inventory, bagFilter, bagKinds]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      {/* Carte silhouette + slots */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Inventaire</h2>
        </div>
        <div className="p-4">
          <div className="relative w-full mx-auto aspect-[2/3] bg-gray-800/50 rounded-lg overflow-hidden">
            <img
              src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//Silouete.png"
              alt="Character silhouette"
              className="absolute inset-0 w-full h-full object-contain opacity-30"
              style={{ mixBlendMode: 'luminosity' }}
            />

            {/* Armure */}
            <EquipmentSlot
              icon={<ShieldIcon size={24} className="text-purple-500" />}
              position="top-[27%] left-1/2 -translate-x-1/2"
              equipment={armor || null}
              type="armor"
              onRequestOpenList={() => { setAllowedKinds(['armors']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('armor')}
              onOpenEditFromSlot={() => openEditFromSlot('armor')}
              isEquipped={!!armor}
            />

            {/* Bouclier (descendu légèrement) */}
            <EquipmentSlot
              icon={<ShieldIcon size={24} className="text-blue-500" />}
              position="top-[50%] left-[15%]"
              equipment={shield || null}
              type="shield"
              onRequestOpenList={() => { setAllowedKinds(['shields']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('shield')}
              onOpenEditFromSlot={() => openEditFromSlot('shield')}
              isEquipped={!!shield}
            />

            {/* Arme (descendue légèrement) */}
            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[50%] right-[15%]"
              equipment={weapon || null}
              type="weapon"
              onRequestOpenList={() => { setAllowedKinds(['weapons']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('weapon')}
              onOpenEditFromSlot={() => openEditFromSlot('weapon')}
              isEquipped={!!weapon}
            />

            {/* Potion: affiche la synthèse des objets de type potion/poison */}
            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" />}
              position="top-[5%] right-[5%]"
              equipment={potionEquip}
              type="potion"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />

            {/* Bijoux: affiche la synthèse des objets de type jewelry */}
            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%]"
              equipment={jewelryEquip}
              type="jewelry"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />

            {/* Sac visuel */}
            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              type="bag"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />
          </div>
        </div>
      </div>

      {/* Argent */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Coins className="text-green-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Mon argent</h2>
        </div>
        <div className="p-4 space-y-2">
          {(['gold','silver','copper'] as Currency[]).map(curr => (
            <CurrencyInput
              key={curr}
              currency={curr}
              value={player[curr] as number}
              onAdd={async (n) => {
                const newAmount = Math.max(0, (player[curr] as number) + n);
                try {
                  const { error } = await supabase.from('players').update({ [curr]: newAmount }).eq('id', player.id);
                  if (error) throw error;
                  onPlayerUpdate({ ...player, [curr]: newAmount } as any);
                  toast.success(`Ajout de ${n} ${curr}`);
                } catch (e) { toast.error('Erreur lors de la mise à jour'); }
              }}
              onSpend={async (n) => {
                const newAmount = Math.max(0, (player[curr] as number) - n);
                try {
                  const { error } = await supabase.from('players').update({ [curr]: newAmount }).eq('id', player.id);
                  if (error) throw error;
                  onPlayerUpdate({ ...player, [curr]: newAmount } as any);
                  toast.success(`Retrait de ${n} ${curr}`);
                } catch (e) { toast.error('Erreur lors de la mise à jour'); }
              }}
            />
          ))}
        </div>
      </div>

      {/* Sac */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Sac</h2>
        </div>

        <div className="p-4">
          {/* Actions + filtres alignés à gauche, recherche à droite */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => { setAllowedKinds(null); setShowList(true); }} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} /> Liste d’équipement</button>
            <button onClick={() => setShowCustom(true)} className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"><Plus size={18} /> Objet personnalisé</button>

            {/* Filtres (gauche) */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['armor','shield','weapon','equipment','potion','jewelry','tool'] as MetaType[]).map(k => (
                <button
                  key={k}
                  onClick={() => setBagKinds(prev => ({ ...prev, [k]: !prev[k] }))}
                  className={`px-2 py-1 rounded text-xs border ${bagKinds[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'}`}
                >
                  {k === 'armor' ? 'Armure'
                    : k === 'shield' ? 'Bouclier'
                    : k === 'weapon' ? 'Arme'
                    : k === 'potion' ? 'Potion/Poison'
                    : k === 'jewelry' ? 'Bijoux'
                    : k === 'tool' ? 'Outils' : 'Équipement'}
                </button>
              ))}
            </div>

            {/* Recherche (droite) */}
            <div className="ml-auto flex-1 min-w-[220px] flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={bagFilter} onChange={(e) => setBagFilter(e.target.value)} placeholder="Filtrer le sac…" className="input-dark px-3 py-2 rounded-md w-full" />
            </div>
          </div>

          {/* Liste inventaire */}
          <div className="space-y-2">
            {filteredInventory.map(item => {
              const meta = parseMeta(item.description);
              const qty = meta?.quantity ?? 1;
              const isArmor = meta?.type === 'armor';
              const isShield = meta?.type === 'shield';
              const isWeapon = meta?.type === 'weapon';

              const isEquipped =
                (isArmor && armor?.inventory_item_id === item.id) ||
                (isShield && shield?.inventory_item_id === item.id) ||
                (isWeapon && meta?.equipped === true); // armes: multiple via meta.equipped

              return (
                <div key={item.id} className="bg-gray-800/40 border border-gray-700/40 rounded-md">
                  <div className="flex items-start justify-between p-2">
                    <div className="flex-1 mr-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleExpand(item.id)} className="text-left text-gray-100 font-medium hover:underline break-words">{smartCapitalize(item.name)}</button>
                        {qty > 1 && <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">x{qty}</span>}
                        {isArmor && <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">Armure</span>}
                        {isShield && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">Bouclier</span>}
                        {isWeapon && <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300">Arme</span>}
                        {meta?.type === 'tool' && <span className="text-xs px-2 py-0.5 rounded bg-teal-900/30 text-teal-300">Outil</span>}
                        {meta?.type === 'jewelry' && <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">Bijou</span>}
                        {meta?.type === 'potion' && <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300">Potion/Poison</span>}
                      </div>

                      {/* Détails techniques (déplié) */}
                      {expanded[item.id] && (isArmor || isShield || isWeapon) && (
                        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                          {isArmor && meta?.armor && <div>CA: {meta.armor.label}</div>}
                          {isShield && meta?.shield && <div>Bonus de bouclier: +{meta.shield.bonus}</div>}
                          {isWeapon && meta?.weapon && (
                            <>
                              <div>Dégâts: {meta.weapon.damageDice} {meta.weapon.damageType}</div>
                              {meta.weapon.properties && <div>Propriété: {meta.weapon.properties}</div>}
                              {meta.weapon.range && <div>Portée: {meta.weapon.range}</div>}
                            </>
                          )}
                        </div>
                      )}
                      {expanded[item.id] && !(isArmor || isShield || isWeapon) && (
                        <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{visibleDescription(item.description)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(isArmor || isShield || isWeapon) && (
                        <button
                          onClick={() => requestToggleWithConfirm(item)}
                          className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
                          title={isEquipped ? 'Cliquer pour déséquiper' : 'Cliquer pour équiper'}
                        >
                          {isEquipped ? 'Équipé' : 'Non équipé'}
                        </button>
                      )}
                      {/* Paramètres (édition) */}
                      <button onClick={() => setEditingItem(item)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40 rounded-full" title="Paramètres">
                        <Settings size={16} />
                      </button>
                      <button onClick={() => removeItemFromInventory(item.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full" title="Supprimer l'objet">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showList && (
        <EquipmentListModal
          onClose={() => { setShowList(false); setAllowedKinds(null); }}
          onAddItem={addFromList}
          allowedKinds={allowedKinds}
        />
      )}
      {showCustom && (
        <CustomItemModal
          onClose={() => setShowCustom(false)}
          onAdd={addCustom}
        />
      )}
      {editingItem && (
        <InventoryItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={refreshInventory}
        />
      )}

      {/* Confirmation equip/unequip */}
      <ConfirmEquipModal
        open={confirmOpen}
        mode={confirmPayload?.mode || 'equip'}
        itemName={confirmPayload?.item?.name || ''}
        onCancel={() => { setConfirmOpen(false); setConfirmPayload(null); }}
        onConfirm={async () => {
          if (!confirmPayload) return;
          setConfirmOpen(false);
          await performToggle(confirmPayload.item, confirmPayload.mode);
          setConfirmPayload(null);
        }}
      />
    </div>
  );
}