import React, { useMemo, useState } from 'react';
import { Backpack, Plus, Trash2, Shield, Sword, Settings, FlaskRound as Flask, Star, Coins, Search, X, Check } from 'lucide-react';
import { Player, InventoryItem } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { attackService } from '../services/attackService';

/* ================================= Types ================================= */

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;
  // Champs spécifiques (utilisés pour affichage/compat)
  armor_bonus?: number | null;   // autre logique non utilisée si on a une formule
  shield_bonus?: number | null;  // bonus de bouclier “simple”
  proficiency?: string | null;   // pour armures (affichage)
  // Formule d’armure standardisée (si présent, on calcule la CA depuis cette formule)
  armor_formula?: {
    base: number;          // ex 12
    addDex: boolean;       // true si on ajoute mod DEX
    dexCap?: number | null; // cap éventuel (max 2 pour intermédiaires)
    stealthDisadvantage?: boolean;
    strengthReq?: number | null;
    kind?: 'light' | 'medium' | 'heavy';
    label?: string;        // ex “12 + modificateur de Dex (max 2)”
  } | null;
}

type CatalogKind = 'armors' | 'shields' | 'weapons' | 'adventuring_gear' | 'tools' | 'custom';

interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  // Champs optionnels selon type
  // Armure:
  armor?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    stealthDisadvantage?: boolean;
    strengthReq?: number | null;
    kind?: 'light' | 'medium' | 'heavy';
    label: string; // ex "12 + modificateur de Dex (max 2)"
  };
  // Bouclier:
  shield?: {
    bonus: number; // ex +2, +3
  };
  // Arme:
  weapon?: {
    damageDice: string;      // ex "1d8"
    damageType: 'Tranchant' | 'Perforant' | 'Contondant';
    properties: string;      // ex "Finesse, Lancer (portée 6/18)"
    range: string;           // ex "Corps à corps", "6 m", etc.
  };
  // Affichage libre
  description?: string;
}

/* ================================== Meta dans description d’inventaire ==================================
   On stocke les informations structurées dans la description en ajoutant UNE LIGNE finale dédiée:
   #meta:{"type":"armor","quantity":1,"armor":{"base":12,"addDex":true,"dexCap":2,"label":"12 + mod Dex (max 2)"}}
   ================================================================================================ */

type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment';

interface ItemMeta {
  type: MetaType;
  quantity?: number;
  armor?: CatalogItem['armor'];
  shield?: CatalogItem['shield'];
  weapon?: CatalogItem['weapon'];
}

const META_PREFIX = '#meta:';

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = description.split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    const json = metaLine.slice(META_PREFIX.length);
    const meta = JSON.parse(json);
    return meta;
  } catch {
    return null;
  }
}

function injectMetaIntoDescription(desc: string | undefined | null, meta: ItemMeta): string {
  const base = (desc || '').trim();
  const noOldMeta = base
    .split('\n')
    .filter(l => !l.trim().startsWith(META_PREFIX))
    .join('\n')
    .trim();
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return (noOldMeta ? `${noOldMeta}\n` : '') + metaLine;
}

/* =============================== Fetch + Parsing du catalogue (Ultimate_Tracker) =============================== */

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

// Simple parseur de tableaux markdown “pipe”
function parseMarkdownTable(md: string): string[][] {
  const rows: string[][] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('|') && l.endsWith('|') && l.includes('|')) {
      // enlever | et splitter
      const cells = l.substring(1, l.length - 1).split('|').map(c => c.trim());
      // ignorer lignes de séparation "---"
      if (cells.every(c => c.match(/^[-:\s]+$/))) continue;
      rows.push(cells);
    }
  }
  return rows;
}

// ARMURES
function parseArmors(md: string): CatalogItem[] {
  // On récupère tous les tableaux; on ne dépend pas des titres exacts
  // Attendu colonnes: Armures | Classe d'armure (CA) | Force | Discrétion
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  // détecter header
  // On garde les lignes où la CA est non vide
  for (const row of rows) {
    if (row.length < 4) continue;
    const [nom, ca, force, discr] = row;
    if (nom.toLowerCase().includes('armures')) continue; // header
    if (!nom || !ca || nom === 'Armures') continue;
    // Ex de ca:
    // "11 + modificateur de Dex"
    // "13 + modificateur de Dex (max 2)"
    // "16"
    const caStr = ca;
    const dexMatch = caStr.match(/(\d+)\s*\+\s*modificateur de Dex(?:\s*\(max\s*(\d+)\))?/i);
    let base = 10;
    let addDex = false;
    let dexCap: number | null | undefined = null;
    if (dexMatch) {
      base = parseInt(dexMatch[1], 10);
      addDex = true;
      dexCap = dexMatch[2] ? parseInt(dexMatch[2], 10) : null;
    } else {
      const justBase = caStr.match(/^\s*(\d+)\s*$/);
      if (justBase) {
        base = parseInt(justBase[1], 10);
        addDex = false;
        dexCap = null;
      } else {
        // fallback
        base = 10;
        addDex = false;
        dexCap = null;
      }
    }
    const stealthDisadvantage = /désavantage/i.test(discr || '');
    let strengthReq: number | null = null;
    const strMatch = (force || '').match(/For\s*(\d+)/i);
    if (strMatch) strengthReq = parseInt(strMatch[1], 10);

    // Déduire type depuis ordre du fichier si possible (facultatif)
    let kind: 'light' | 'medium' | 'heavy' | undefined = undefined;
    // heuristique simple:
    if (/matelassée|cuir|clouté/i.test(nom)) kind = 'light';
    else if (/peaux|chemise de mailles|écailles|cuirasse|demi-plate/i.test(nom)) kind = 'medium';
    else kind = 'heavy'; // broigne, cotte de mailles, etc.

    items.push({
      id: `armor:${nom}`,
      kind: 'armors',
      name: nom,
      armor: {
        base,
        addDex,
        dexCap,
        kind,
        stealthDisadvantage,
        strengthReq,
        label: caStr
      },
      description: `Force: ${force || '—'} • Discrétion: ${discr || '—'}`,
    });
  }
  return items;
}

// BOUCLIERS
function parseShields(md: string): CatalogItem[] {
  // colonnes attendues: Armures | Classe d'armure (CA) | Force | Discrétion
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 4) continue;
    const [nom, ca] = row;
    if (!nom || !ca || nom.toLowerCase().includes('armures')) continue;
    const m = ca.match(/\+?\s*(\d+)/);
    const bonus = m ? parseInt(m[1], 10) : 2;
    items.push({
      id: `shield:${nom}`,
      kind: 'shields',
      name: nom,
      shield: { bonus },
      description: `Bonus de CA: +${bonus}`,
    });
  }
  return items;
}

// ARMES
function parseWeapons(md: string): CatalogItem[] {
  // Attendu colonnes: Nom | Dégâts | Propriétés | Botte d'arme
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 3) continue;
    const [nom, degats, props] = row;
    if (!nom || nom.toLowerCase() === 'nom') continue;
    const dmgDiceMatch = (degats || '').match(/(\d+d\d+)/i);
    const damageDice = dmgDiceMatch ? dmgDiceMatch[1] : '1d6';
    // Type à partir de “1d6 contondants / tranchants / perforants”
    let damageType: 'Tranchant' | 'Perforant' | 'Contondant' = 'Tranchant';
    if (/contondant/i.test(degats)) damageType = 'Contondant';
    else if (/perforant/i.test(degats)) damageType = 'Perforant';
    else if (/tranchant/i.test(degats)) damageType = 'Tranchant';

    // Range: si propriétés contiennent “portée X/Y” on prend la première distance, sinon “Corps à corps”
    let range = 'Corps à corps';
    const pm = (props || '').match(/portée\s*([\d,\.\/\s]+)/i);
    if (pm) {
      // ex "24/96" => on met "24 m"
      const first = pm[1].trim().split(/[\/\s]/)[0]?.trim() || '';
      if (first) range = `${first} m`;
    }
    items.push({
      id: `weapon:${nom}`,
      kind: 'weapons',
      name: nom,
      weapon: {
        damageDice,
        damageType,
        properties: props || '',
        range
      },
      description: `Dégâts: ${degats} • Propriétés: ${props || '—'}`,
    });
  }
  return items;
}

// ÉQUIPEMENTS D’AVENTURIER et OUTILS: on liste les titres “## ...”
function parseTitledList(md: string, kind: CatalogKind): CatalogItem[] {
  const items: CatalogItem[] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      const name = m[1].trim();
      items.push({
        id: `${kind}:${name}`,
        kind,
        name,
        description: '',
      });
    }
  }
  return items;
}

/* ============================== Modal: Catalogue d’équipement ============================== */

function CatalogModal({
  onClose,
  onAddItem,
}: {
  onClose: () => void;
  onAddItem: (item: { name: string; description?: string; meta: ItemMeta }) => void;
}) {
  const [activeTab, setActiveTab] = useState<CatalogKind>('weapons');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [list, setList] = useState<CatalogItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  // Custom fields
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customType, setCustomType] = useState<MetaType>('equipment');

  const loadTab = async (tab: CatalogKind) => {
    if (tab === 'custom') {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const url = URLS[tab as keyof typeof URLS];
      const text = await fetchText(url);
      let items: CatalogItem[] = [];
      if (tab === 'armors') items = parseArmors(text);
      else if (tab === 'shields') items = parseShields(text);
      else if (tab === 'weapons') items = parseWeapons(text);
      else if (tab === 'adventuring_gear') items = parseTitledList(text, 'adventuring_gear');
      else if (tab === 'tools') items = parseTitledList(text, 'tools');
      setList(items);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de chargement du catalogue');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(i => i.name.toLowerCase().includes(q));
  }, [list, query]);

  const handlePick = (ci: CatalogItem) => {
    if (quantity <= 0) {
      toast.error('Quantité invalide');
      return;
    }
    let meta: ItemMeta = { type: 'equipment', quantity };
    if (ci.kind === 'armors' && ci.armor) {
      meta = { type: 'armor', quantity, armor: ci.armor };
    } else if (ci.kind === 'shields' && ci.shield) {
      meta = { type: 'shield', quantity, shield: ci.shield };
    } else if (ci.kind === 'weapons' && ci.weapon) {
      meta = { type: 'weapon', quantity, weapon: ci.weapon };
    } else if (ci.kind === 'adventuring_gear' || ci.kind === 'tools') {
      meta = { type: 'equipment', quantity };
    }
    onAddItem({
      name: ci.name,
      description: ci.description || '',
      meta,
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast.error("Nom requis");
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantité invalide');
      return;
    }
    const meta: ItemMeta = { type: customType, quantity };
    onAddItem({
      name: customName.trim(),
      description: customDesc.trim(),
      meta,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900/95 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans l’onglet courant…"
              className="input-dark px-3 py-2 rounded-md w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as CatalogKind)}
              className="input-dark px-3 py-2 rounded-md"
            >
              <option value="weapons">Armes</option>
              <option value="armors">Armures</option>
              <option value="shields">Boucliers</option>
              <option value="adventuring_gear">Équipements d’aventurier</option>
              <option value="tools">Outils</option>
              <option value="custom">Personnalisé</option>
            </select>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
              <X />
            </button>
          </div>
        </div>

        {activeTab === 'custom' ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom</label>
                <input className="input-dark w-full px-3 py-2 rounded-md" value={customName} onChange={e => setCustomName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select className="input-dark w-full px-3 py-2 rounded-md" value={customType} onChange={e => setCustomType(e.target.value as MetaType)}>
                  <option value="equipment">Équipement</option>
                  <option value="potion">Potion</option>
                  <option value="weapon">Arme</option>
                  <option value="armor">Armure</option>
                  <option value="shield">Bouclier</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={3} value={customDesc} onChange={e => setCustomDesc(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Quantité</label>
              <input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div className="pt-2">
              <button onClick={handleAddCustom} className="btn-primary px-4 py-2 rounded-lg">Ajouter</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Quantité</label>
                <input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[65vh] space-y-2">
              {loading ? (
                <div className="text-gray-400">Chargement…</div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-500 text-sm">Aucun résultat</div>
              ) : (
                filtered.map(ci => (
                  <div key={ci.id} className="p-3 rounded-md bg-gray-800/50 border border-gray-700/50 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-gray-100 font-medium">{ci.name}</div>
                      <div className="text-sm text-gray-400">
                        {ci.kind === 'armors' && ci.armor && <>CA: {ci.armor.label} {ci.armor.stealthDisadvantage ? '• Désavantage Discrétion' : ''}</>}
                        {ci.kind === 'shields' && ci.shield && <>Bonus de bouclier: +{ci.shield.bonus}</>}
                        {ci.kind === 'weapons' && ci.weapon && <>Dégâts: {ci.weapon.damageDice} {ci.weapon.damageType} • Props: {ci.weapon.properties || '—'}</>}
                        {(ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description || 'Équipement')}</div>
                    </div>
                    <button onClick={() => handlePick(ci)} className="btn-primary px-3 py-2 rounded-lg flex items-center gap-1">
                      <Check className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================== Modals Armure/Bouclier (édition simple texte conservée pour autres) ============================== */

interface EquipmentModalProps {
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry';
  equipment: Equipment | null;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  setIsEditing: (value: boolean) => void;
}

const EquipmentModal = ({ type, equipment, onClose, onSave, setIsEditing }: EquipmentModalProps) => {
  // On n’utilise plus ce petit modal pour armor/shield (géré via sac + équiper)
  if (type === 'armor' || type === 'shield') return null;

  const [text, setText] = useState(
    equipment?.description || ''
  );

  const handleSave = () => {
    onSave({
      name: getTitle(type),
      description: text,
      isTextArea: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
        <div className="flex items-center gap-2">
          {type === 'potion' ? <Flask size={20} className="text-green-500" /> : null}
          {type === 'weapon' ? <Sword size={20} className="text-red-500" /> : null}
          <h3 className="text-lg font-semibold text-gray-100">
            {getTitle(type)}
          </h3>
        </div>

        <textarea
          placeholder={`Liste des ${getTitle(type).toLowerCase()} en votre possession...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-dark w-full px-3 py-2 rounded-md"
          rows={8}
        />

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            className="btn-primary flex-1 px-4 py-2 rounded-lg"
          >
            Sauvegarder
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              onClose();
            }}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================================== InfoBubble affichage (inchangé sauf affichage formule) ================================== */

const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry') => {
  switch (type) {
    case 'potion': return 'Potions';
    case 'shield': return 'Bouclier';
    case 'armor': return 'Armure';
    case 'weapon': return 'Armes';
    case 'shoes': return 'Chaussures';
    case 'bag': return 'Sac à dos';
    case 'jewelry': return 'Bijoux';
    default: return '';
  }
};

interface InfoBubbleProps {
  equipment: Equipment | null;
  position: string;
  onClose: () => void;
  setIsEditing: (value: boolean) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'jewelry';
  onDelete?: () => void;
}

const InfoBubble = ({ equipment, position, onClose, setIsEditing, type, onDelete }: InfoBubbleProps) => {
  if (!equipment) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[61]" onClick={onClose} />
      <div className="relative p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-96 border border-gray-700/50 z-[62]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
          <div className="flex items-center gap-1">
            {(type === 'armor' || type === 'shield') && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Supprimer l'objet ?")) {
                    onDelete();
                  }
                }}
                className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors hover:text-red-500"
                title="Supprimer l'objet"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors hover:text-red-500"
              title="Modifier"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {equipment.name && (
            <h5 className="font-medium text-gray-100">{equipment.name}</h5>
          )}
          {equipment.description && (
            <p className="text-sm text-gray-400">{equipment.description}</p>
          )}

          {type === 'armor' && equipment.armor_formula && (
            <div className="mt-2 text-sm text-gray-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Formule</span>
                <span className="font-medium text-gray-100">{equipment.armor_formula.label || ''}</span>
              </div>
            </div>
          )}

          {type === 'shield' && typeof equipment.shield_bonus === 'number' && (
            <div className="mt-2 text-sm text-gray-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Bonus de bouclier</span>
                <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================= Slot équipement (ouvre info + édition) ================================= */

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  onEquip: (equipment: Equipment | null) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'jewelry';
  bubblePosition: string;
}

const EquipmentSlot = ({ icon, position, equipment, onEquip, type, bubblePosition }: EquipmentSlotProps) => {
  const [isOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = () => {
    if (isOpen) return;
    setShowInfo(prev => !prev);
  };

  const handleClose = () => {
    setShowInfo(false);
  };

  const handleEdit = () => {
    setShowInfo(false);
    setIsEditing(true);
  };

  return (<>
    <button
      onClick={handleClick}
      className={`absolute ${position} ${type === 'bag' ? 'w-24 h-24' : 'w-12 h-12'} rounded-lg hover:bg-gray-700/20 transition-all duration-200 border border-gray-600/50 hover:border-gray-500/50 flex items-center justify-center cursor-pointer`}
      style={{ zIndex: showInfo ? 50 : 10 }}
    >
      <div className="w-full h-full flex items-center justify-center">
        {type === 'bag' ? icon : React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
    </button>

    {showInfo && (
      <InfoBubble
        equipment={equipment}
        position={bubblePosition}
        onClose={handleClose}
        setIsEditing={handleEdit}
        type={type}
        onDelete={(type === 'armor' || type === 'shield') ? () => onEquip(null) : undefined}
      />
    )}

    {isEditing && (
      <EquipmentModal
        type={type}
        equipment={equipment}
        onClose={() => setIsEditing(false)}
        onSave={(eq) => onEquip(eq)}
        setIsEditing={setIsEditing}
      />
    )}
  </>);
};

/* ================================== Composants Monnaie ================================== */

interface EquipmentTabProps {
  player: Player;
  inventory: InventoryItem[];
  onPlayerUpdate: (player: Player) => void;
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
}

type Currency = 'gold' | 'silver' | 'copper';

interface CurrencyInputProps {
  currency: Currency;
  value: number;
  onAdd: (amount: number) => void;
  onSpend: (amount: number) => void;
}

const CurrencyInput = ({ currency, value, onAdd, onSpend }: CurrencyInputProps) => {
  const [amount, setAmount] = useState<string>('');

  const getCurrencyColor = (curr: Currency) => {
    switch (curr) {
      case 'gold': return 'text-yellow-500';
      case 'silver': return 'text-gray-300';
      case 'copper': return 'text-orange-400';
      default: return 'text-gray-300';
    }
  };

  const getCurrencyName = (curr: Currency) => {
    switch (curr) {
      case 'gold': return 'Or';
      case 'silver': return 'Argent';
      case 'copper': return 'Cuivre';
      default: return curr;
    }
  };

  const handleAction = (isAdding: boolean) => {
    const numAmount = parseInt(amount) || 0;
    if (numAmount > 0) {
      isAdding ? onAdd(numAmount) : onSpend(numAmount);
      setAmount('');
    }
  };

  return (
    <div className="flex items-center gap-2 h-11 relative">
      <div className={`w-16 text-center font-medium ${getCurrencyColor(currency)}`}>
        {getCurrencyName(currency)}
      </div>
      <div className="w-16 h-full text-center bg-gray-800/50 rounded-md flex items-center justify-center font-bold">
        {value}
      </div>
      <div className="flex-1 flex items-center justify-end gap-1">
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-dark w-20 h-11 px-2 rounded-md text-center text-base"
          placeholder="0"
        />
        <button
          onClick={() => handleAction(true)}
          className="h-11 w-[72px] text-base text-green-500 hover:bg-green-900/30 rounded-md transition-colors whitespace-nowrap border border-green-500/20 hover:border-green-500/40 flex items-center justify-center"
          title="Ajouter"
        >
          Ajouter
        </button>
        <button
          onClick={() => handleAction(false)}
          className="h-11 w-[72px] text-base text-red-500 hover:bg-red-900/30 rounded-md transition-colors whitespace-nowrap border border-red-500/20 hover:border-red-500/40 flex items-center justify-center"
          title="Retirer"
        >
          Dépenser
        </button>
      </div>
    </div>
  );
};

/* ================================== Helpers CA (armure équipée) ================================== */

function getDexModFromPlayer(player: Player): number {
  const abilities: any = (player as any).abilities;
  const fromArray = Array.isArray(abilities) ? abilities.find((a: any) => a?.name === 'Dextérité') : undefined;
  if (fromArray?.modifier != null) return fromArray.modifier;
  if (fromArray?.score != null) return Math.floor((fromArray.score - 10) / 2);
  return 0;
}

function computeArmorAC(armorFormula: NonNullable<Equipment['armor_formula']>, dexMod: number): number {
  const base = armorFormula.base || 10;
  if (!armorFormula.addDex) return base;
  const cap = armorFormula.dexCap == null ? Infinity : armorFormula.dexCap;
  const applied = Math.max(-10, Math.min(cap, dexMod)); // borne minimale
  return base + applied;
}

/* ================================== Composant principal ================================== */

export function EquipmentTab({
  player,
  inventory,
  onPlayerUpdate,
  onInventoryUpdate
}: EquipmentTabProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [weapon, setWeapon] = useState<Equipment | null>(player.equipment?.weapon || null);
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  const [potion, setPotion] = useState<Equipment | null>(player.equipment?.potion || null);
  const [shoes, setShoes] = useState<Equipment | null>(player.equipment?.shoes || null);
  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);
  const [jewelry, setJewelry] = useState<Equipment | null>(player.equipment?.jewelry || null);

  const saveEquipment = async (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const nextEquipment = {
        ...player.equipment,
        [type]: equipment
      };

      const { error } = await supabase
        .from('players')
        .update({
          equipment: nextEquipment
        })
        .eq('id', player.id);

      if (error) throw error;

      onPlayerUpdate({
        ...player,
        equipment: nextEquipment
      });

      const label =
        type === 'armor' ? 'Armure'
        : type === 'weapon' ? 'Armes'
        : type === 'shield' ? 'Bouclier'
        : type === 'potion' ? 'Potions'
        : type === 'shoes' ? 'Chaussures'
        : type === 'bag' ? 'Sac à dos'
        : 'Bijoux';

      toast.success(`${label} ${equipment ? 'mis à jour' : 'supprimé'}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  /* ======================== INVENTAIRE (Sac) ======================== */

  const addItemToInventory = async () => {
    if (!newItemName.trim()) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([
          {
            player_id: player.id,
            name: newItemName.trim(),
            description: newItemDescription.trim() || null
          }
        ]);

      if (error) throw error;

      const { data: newInventory } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', player.id);

      if (newInventory) {
        onInventoryUpdate(newInventory);
      }

      setNewItemName('');
      setNewItemDescription('');
      toast.success('Objet ajouté à l\'inventaire');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet:', error);
      toast.error('Erreur lors de l\'ajout de l\'objet');
    }
  };

  const addFromCatalog = async (payload: { name: string; description?: string; meta: ItemMeta }) => {
    try {
      const finalDesc = injectMetaIntoDescription(payload.description || '', payload.meta);
      const { error } = await supabase
        .from('inventory_items')
        .insert([{ player_id: player.id, name: payload.name, description: finalDesc }]);
      if (error) throw error;

      const { data: newInventory } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', player.id);

      if (newInventory) onInventoryUpdate(newInventory);
      toast.success('Équipement ajouté');
    } catch (e) {
      console.error(e);
      toast.error('Erreur ajout équipement');
    } finally {
      setShowCatalog(false);
    }
  };

  const removeItemFromInventory = async (itemId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet objet ?')) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        onInventoryUpdate(inventory.filter(item => item.id !== itemId));
        toast.success('Objet supprimé');
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'objet:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  /* ======================== ÉQUIPER / DÉSÉQUIPER depuis le sac ======================== */

  const equipArmorFromItem = async (item: InventoryItem, meta: ItemMeta) => {
    if (!meta.armor) {
      toast.error('Données armure manquantes');
      return;
    }
    const eq: Equipment = {
      name: item.name,
      description: item.description?.replace(new RegExp(`${META_PREFIX}.*$`, 'm'), '').trim() || '',
      armor_formula: {
        base: meta.armor.base,
        addDex: meta.armor.addDex,
        dexCap: meta.armor.dexCap ?? null,
        label: meta.armor.label,
        strengthReq: meta.armor.strengthReq ?? null,
        stealthDisadvantage: meta.armor.stealthDisadvantage ?? false,
        kind: meta.armor.kind
      }
    };
    setArmor(eq);
    await saveEquipment('armor', eq);
  };

  const unequipArmor = async () => {
    setArmor(null);
    await saveEquipment('armor', null);
  };

  const equipShieldFromItem = async (item: InventoryItem, meta: ItemMeta) => {
    if (!meta.shield) {
      toast.error('Données bouclier manquantes');
      return;
    }
    const eq: Equipment = {
      name: item.name,
      description: item.description?.replace(new RegExp(`${META_PREFIX}.*$`, 'm'), '').trim() || '',
      shield_bonus: meta.shield.bonus
    };
    setShield(eq);
    await saveEquipment('shield', eq);
  };

  const unequipShield = async () => {
    setShield(null);
    await saveEquipment('shield', null);
  };

  const equipWeaponFromItem = async (item: InventoryItem, meta: ItemMeta) => {
    if (!meta.weapon) {
      toast.error('Données arme manquantes');
      return;
    }
    try {
      // Crée une attaque dans CombatTab
      const newAttack = await attackService.addAttack({
        player_id: player.id,
        name: item.name,
        damage_dice: meta.weapon.damageDice,
        damage_type: meta.weapon.damageType,
        range: meta.weapon.range || 'Corps à corps',
        properties: meta.weapon.properties || '',
        manual_attack_bonus: null,
        manual_damage_bonus: null,
        expertise: false,
        attack_type: 'physical',
        spell_level: null,
        ammo_count: 0
      });
      if (newAttack) {
        toast.success('Arme équipée (attaque créée)');
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la création de l'attaque");
    }
  };

  /* ======================== Argent ======================== */

  const updatePlayerMoney = async (currency: Currency, amount: number, isAdding: boolean) => {
    const newAmount = Math.max(0, player[currency] + (isAdding ? amount : -amount));

    try {
      const { error } = await supabase
        .from('players')
        .update({ [currency]: newAmount })
        .eq('id', player.id);

      if (error) throw error;

      onPlayerUpdate({
        ...player,
        [currency]: newAmount
      });

      toast.success(`${isAdding ? 'Ajout' : 'Retrait'} de ${amount} ${currency}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'argent:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6">
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

            {/* Armor slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-purple-500" />}
              position="top-[25%] left-1/2 -translate-x-1/2 bg-gray-800/50"
              equipment={armor || null}
              onEquip={(equipment) => {
                setArmor(equipment);
                saveEquipment('armor', equipment);
              }}
              type="armor"
              bubblePosition="right-[5%] top-[15%]"
            />

            {/* Shield slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-blue-500" />}
              position="top-[45%] left-[15%] bg-gray-800/50"
              equipment={shield || null}
              onEquip={(equipment) => {
                setShield(equipment as Equipment);
                saveEquipment('shield', equipment as Equipment);
              }}
              type="shield"
              bubblePosition="left-[5%] top-[15%]"
            />

            {/* Weapon slot (placeholder: non géré en slot individuel ici) */}
            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[45%] right-[15%] bg-gray-800/50"
              equipment={weapon || { name: 'Armes', description: 'Gérées dans Attaques', isTextArea: true }}
              onEquip={(equipment) => {
                setWeapon(equipment as Equipment);
                saveEquipment('weapon', equipment as Equipment);
              }}
              type="weapon"
              bubblePosition="right-[5%] top-[15%]"
            />

            {/* Potion slot */}
            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" title="Potions et poisons" />}
              position="top-[5%] right-[5%] bg-gray-800/50"
              equipment={potion || { name: 'Potions et poisons', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setPotion(equipment as Equipment);
                saveEquipment('potion', equipment as Equipment);
              }}
              type="potion"
              bubblePosition="right-[5%] top-[5%]"
            />

            {/* Jewelry slot */}
            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%] bg-gray-800/50"
              equipment={jewelry || { name: 'Bijoux', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setJewelry(equipment as Equipment);
                saveEquipment('jewelry', equipment as Equipment);
              }}
              type="jewelry"
              bubblePosition="right-[5%] top-[15%]"
            />

            {/* Shoes slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-yellow-500" />}
              position="bottom-[5%] left-1/2 -translate-x-1/2 bg-gray-800/50"
              equipment={shoes || { name: 'Chaussures', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setShoes(equipment as Equipment);
                saveEquipment('shoes', equipment as Equipment);
              }}
              type="shoes"
              bubblePosition="right-[5%] bottom-[15%]"
            />

            {/* Bag slot */}
            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setBag(equipment as Equipment);
                saveEquipment('bag', equipment as Equipment);
              }}
              type="bag"
              bubblePosition="left-[5%] bottom-[5%]"
            />
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Coins className="text-green-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Mon argent</h2>
        </div>
        <div className="p-4 space-y-2">
          {(['gold', 'silver', 'copper'] as Currency[]).map(currency => (
            <CurrencyInput
              key={currency}
              currency={currency}
              value={player[currency]}
              onAdd={(amount) => updatePlayerMoney(currency, amount, true)}
              onSpend={(amount) => updatePlayerMoney(currency, amount, false)}
            />
          ))}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Sac</h2>
        </div>

        <div className="p-4">
          {/* Barre actions ajout */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Ajout simple (conservé) */}
            <input
              type="text"
              placeholder="Nom de l'objet"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
            />
            <textarea
              placeholder="Description (optionnelle)"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg resize-none"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={addItemToInventory}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
              >
                <Plus size={20} />
                Ajouter à l'inventaire
              </button>
              <button
                onClick={() => setShowCatalog(true)}
                className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200"
              >
                Ajouter depuis catalogue
              </button>
            </div>
          </div>

          {/* Liste inventaire avec quantités + équiper/déséquiper */}
          <div className="space-y-2">
            {inventory.map((item) => {
              const meta = parseMeta(item.description);
              const quantity = meta?.quantity ?? 1;
              const isArmor = meta?.type === 'armor';
              const isShield = meta?.type === 'shield';
              const isWeapon = meta?.type === 'weapon';

              return (
                <div key={item.id} className="inventory-item flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-gray-100">{item.name}</h5>
                      {quantity > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">x{quantity}</span>
                      )}
                      {isArmor && <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">Armure</span>}
                      {isShield && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">Bouclier</span>}
                      {isWeapon && <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300">Arme</span>}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {item.description.split('\n').filter(l => !l.trim().startsWith(META_PREFIX)).join('\n')}
                      </p>
                    )}

                    {(isArmor || isShield || isWeapon) && (
                      <div className="flex items-center gap-2 mt-2">
                        {isArmor && (
                          <>
                            <button
                              onClick={() => equipArmorFromItem(item, meta!)}
                              className="px-2 py-1 rounded border border-purple-500/40 text-purple-300 hover:bg-purple-900/20 text-xs"
                            >
                              Équiper
                            </button>
                            {armor && armor.name === item.name && (
                              <button
                                onClick={unequipArmor}
                                className="px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700/40 text-xs"
                              >
                                Déséquiper
                              </button>
                            )}
                          </>
                        )}
                        {isShield && (
                          <>
                            <button
                              onClick={() => equipShieldFromItem(item, meta!)}
                              className="px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-900/20 text-xs"
                            >
                              Équiper
                            </button>
                            {shield && shield.name === item.name && (
                              <button
                                onClick={unequipShield}
                                className="px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700/40 text-xs"
                              >
                                Déséquiper
                              </button>
                            )}
                          </>
                        )}
                        {isWeapon && (
                          <button
                            onClick={() => equipWeaponFromItem(item, meta!)}
                            className="px-2 py-1 rounded border border-red-500/40 text-red-300 hover:bg-red-900/20 text-xs"
                          >
                            Équiper (créer attaque)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItemFromInventory(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
                    title="Supprimer l'objet"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCatalog && (
        <CatalogModal
          onClose={() => setShowCatalog(false)}
          onAddItem={addFromCatalog}
        />
      )}
    </div>
  );
}