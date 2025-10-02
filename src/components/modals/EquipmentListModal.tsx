import React from 'react';
import { Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

/* Types locaux (alignés sur EquipmentTab) */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool';
interface WeaponMeta { damageDice: string; damageType: 'Tranchant' | 'Perforant' | 'Contondant'; properties: string; range: string; }
interface ArmorMeta { base: number; addDex: boolean; dexCap?: number | null; label: string; }
interface ShieldMeta { bonus: number; }
export interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}
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

/* Helpers locaux */
const ULT_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Equipements';
const URLS = {
  armors: `${ULT_BASE}/Armures.md`,
  shields: `${ULT_BASE}/Boucliers.md`,
  weapons: `${ULT_BASE}/Armes.md`,
  adventuring_gear: `${ULT_BASE}/Equipements_daventurier.md`,
  tools: `${ULT_BASE}/Outils.md`,
};
const META_PREFIX = '#meta:';
const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
const smartCapitalize = (name: string) => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

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

/* Parsers catalogue */
function parseArmors(md: string): CatalogItem[] {
  const items: CatalogItem[] = [];
  const lines = md.split('\n');
  
  console.log('=== DÉBUT PARSING ARMURES ===');
  console.log('Contenu brut du fichier Armures.md:');
  console.log(md);
  console.log('===============================');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Chercher les lignes de table qui contiennent des armures
    if (line.startsWith('|') && line.endsWith('|') && line.includes('|')) {
      const cells = line.substring(1, line.length - 1).split('|').map(c => c.trim());
      
      if (cells.length >= 2) {
        const [nomRaw, ca] = cells;
        
        console.log(`Ligne ${i+1}: [${nomRaw}] -> [${ca}]`);
        
        // Ignorer les en-têtes et séparateurs de manière plus précise
        const nomNorm = nomRaw.toLowerCase();
        const caNorm = (ca || '').toLowerCase();
        
        if (
          !nomRaw ||
          !ca ||
          nomNorm.includes('armure') && caNorm.includes('classe') ||
          nomRaw.includes('-') && nomRaw.length > 5 ||
          ca.includes('-') && ca.length > 5 ||
          nomRaw === '—' ||
          ca === '—' ||
          caNorm.includes('force') ||
          caNorm.includes('discrétion') ||
          nomNorm === 'force' ||
          nomNorm === 'discrétion'
        ) {
          console.log(`  -> Ignoré (en-tête ou séparateur)`);
          continue;
        }
        
        const nom = stripPriceParentheses(nomRaw);
        
        // Parser la CA avec tous les cas possibles
        let base = 10, addDex = false, dexCap: number | null = null;
        
        console.log(`  -> Parsing CA: "${ca}"`);
        
        if (ca.toLowerCase().includes('modificateur de dex')) {
          // Formule avec Dex: "11 + modificateur de Dex" ou "12 + modificateur de Dex (max 2)"
          const baseMatch = ca.match(/(\d+)/);
          const capMatch = ca.match(/max\s*(\d+)/i);
          
          if (baseMatch) {
            base = parseInt(baseMatch[1]);
            addDex = true;
            dexCap = capMatch ? parseInt(capMatch[1]) : null;
            console.log(`    -> Formule Dex: ${base} + Dex${dexCap ? ` (max ${dexCap})` : ''}`);
          }
        } else {
          // Nombre simple: "14", "16", etc.
          const numberMatch = ca.match(/^\s*(\d+)\s*$/);
          if (numberMatch) {
            base = parseInt(numberMatch[1]);
            addDex = false;
            dexCap = null;
            console.log(`    -> Nombre simple: ${base}`);
          } else {
            console.log(`    -> CA non reconnue, tentative d'extraction de nombre`);
            // Fallback: essayer d'extraire n'importe quel nombre
            const anyNumberMatch = ca.match(/(\d+)/);
            if (anyNumberMatch) {
              base = parseInt(anyNumberMatch[1]);
              addDex = false;
              dexCap = null;
              console.log(`    -> Nombre extrait: ${base}`);
            }
          }
        }
        
        const armorItem = { 
          id: `armor:${nom}`, 
          kind: 'armors' as CatalogKind, 
          name: nom, 
          armor: { base, addDex, dexCap, label: ca } 
        };
        
        items.push(armorItem);
        console.log(`  -> ✅ Ajouté: ${nom}`);
      }
    }
  }
  
  console.log(`\n=== RÉSUMÉ FINAL ===`);
  console.log(`Total armures trouvées: ${items.length}`);
  items.forEach(item => {
    const armor = item.armor!;
    console.log(`- ${item.name}: CA ${armor.base}${armor.addDex ? ' + Dex' : ''}${armor.dexCap ? ` (max ${armor.dexCap})` : ''}`);
  });
  console.log('====================');
  
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
    items.push({ id: `shield:${nom}`, kind: 'shields', name: nom, shield: { bonus } });
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
    items.push({ id: `weapon:${nom}`, kind: 'weapons', name: nom, weapon: { damageDice, damageType, properties: props || '', range } });
  }
  return items;
}

/* Markdown renderer simple (tables + listes) */
function isMarkdownTableLine(line: string) {
  const l = line.trim();
  return l.startsWith('|') && l.endsWith('|') && l.includes('|');
}
function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/g).map(b => b.split('\n'));
  return (
    <div className="space-y-2">
      {blocks.map((lines, idx) => {
        if (lines.length >= 2 && isMarkdownTableLine(lines[0])) {
          const tableLines: string[] = [];
          for (const l of lines) if (isMarkdownTableLine(l)) tableLines.push(l);
          const rows: string[][] = [];
          for (const tl of tableLines) {
            const cells = tl.substring(1, tl.length - 1).split('|').map(c => c.trim());
            if (cells.every(c => /^[-:\s]+$/.test(c))) continue;
            rows.push(cells);
          }
          if (rows.length === 0) return null;
          const header = rows[0];
          const body = rows.slice(1);
          return (
            <div key={idx} className="overflow-x-auto">
              <table className="w-full text-left text-sm border border-gray-700/50 rounded-md overflow-hidden">
                <thead className="bg-gray-800/60">
                  <tr>{header.map((c, i) => <th key={i} className="px-2 py-1 border-b border-gray-700/50">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((r, ri) => (
                    <tr key={ri} className="odd:bg-gray-800/30">
                      {r.map((c, ci) => <td key={ci} className="px-2 py-1 align-top border-b border-gray-700/30">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every(l => l.trim().startsWith('- '))) {
          return <ul key={idx} className="list-disc pl-5 space-y-1">{lines.map((l, i) => <li key={i} className="text-sm text-gray-300">{l.replace(/^- /, '')}</li>)}</ul>;
        }
        return <p key={idx} className="text-sm text-gray-300 whitespace-pre-wrap">{lines.join('\n')}</p>;
      })}
    </div>
  );
}

/* OUTILS parsing robuste (tables + sections) */
function parseMarkdownTables(md: string): string[][][] {
  const tables: string[][][] = [];
  const lines = md.split('\n');
  let current: string[][] | null = null;
  for (const raw of lines) {
    const line = raw.trimRight();
    if (isMarkdownTableLine(line)) {
      const cells = line.substring(1, line.length - 1).split('|').map(c => c.trim());
      if (!current) current = [];
      current.push(cells);
    } else {
      if (current && current.length > 0) tables.push(current);
      current = null;
    }
  }
  if (current && current.length > 0) tables.push(current);
  return tables;
}
function parseTools(md: string): CatalogItem[] {
  const items: CatalogItem[] = [];
  const tables = parseMarkdownTables(md);
  const noiseRow = (s: string) =>
    !s ||
    /^autres? outils?$/i.test(s) ||
    /^types? d'?outils?$/i.test(s) ||
    /^outils?$/i.test(s) ||
    /^sommaire$/i.test(s) ||
    /^table des matières$/i.test(s) ||
    /^généralités?$/i.test(s) ||
    /^introduction$/i.test(s);

  for (const table of tables) {
    if (table.length === 0) continue;
    let header = table[0];
    const body = table.slice(1);
    const headerLooksLikeHeader = header.some(c => /nom|outil|description|prix|coût|co[ûu]t/i.test(c));
    if (!headerLooksLikeHeader) header = header.map((_, i) => (i === 0 ? 'Nom' : `Col${i + 1}`));
    for (const row of body) {
      const name = stripPriceParentheses(row[0] || '').trim();
      if (!name || noiseRow(name)) continue;
      const parts: string[] = [];
      for (let i = 1; i < Math.min(row.length, header.length); i++) {
        const h = header[i]?.trim();
        const v = (row[i] || '').trim();
        if (!v) continue;
        if (/prix|co[ûu]t/i.test(h)) continue;
        parts.push(`${smartCapitalize(h)}: ${v}`);
      }
      const desc = parts.join('\n');
      items.push({ id: `tools:${name}`, kind: 'tools', name, description: desc });
    }
  }

  const lines = md.split('\n');
  const sections: { name: string; desc: string }[] = [];
  let current: { name: string; buf: string[] } | null = null;
  const isHeader = (line: string) => /^#{2,3}\s+/.test(line);
  const headerName = (line: string) => line.replace(/^#{2,3}\s+/, '').trim();

  for (const raw of lines) {
    if (isHeader(raw)) {
      if (current) {
        const nm = stripPriceParentheses(current.name);
        const ds = current.buf.join('\n').trim();
        if (nm && ds && !noiseRow(nm)) sections.push({ name: nm, desc: ds });
      }
      current = { name: headerName(raw), buf: [] };
    } else {
      if (current) current.buf.push(raw);
    }
  }
  if (current) {
    const nm = stripPriceParentheses(current.name);
    const ds = current.buf.join('\n').trim();
    if (nm && ds && !noiseRow(nm)) sections.push({ name: nm, desc: ds });
  }

  const seen = new Set(items.map(i => norm(i.name)));
  for (const sec of sections) {
    if (seen.has(norm(sec.name))) continue;
    items.push({ id: `tools:${sec.name}`, kind: 'tools', name: sec.name, description: sec.desc });
  }
  const dedup = new Map<string, CatalogItem>();
  for (const it of items) { if (!dedup.has(it.id)) dedup.set(it.id, it); }
  return [...dedup.values()];
}

/* Props */
type FilterState = {
  weapons: boolean;
  armors: boolean;
  shields: boolean;
  adventuring_gear: boolean;
  tools: boolean;
};
export function EquipmentListModal({
  onClose,
  onAddItem,
  allowedKinds = null,
}: {
  onClose: () => void;
  onAddItem: (item: { name: string; description?: string; meta: ItemMeta }) => void;
  allowedKinds?: CatalogKind[] | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [all, setAll] = React.useState<CatalogItem[]>([]);
  const [filters, setFilters] = React.useState<FilterState>({
    weapons: true, armors: true, shields: true, adventuring_gear: true, tools: true
  });
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [armorsMd, shieldsMd, weaponsMd, gearMd, toolsMd] = await Promise.all([
          fetchText(URLS.armors), fetchText(URLS.shields), fetchText(URLS.weapons),
          fetchText(URLS.adventuring_gear), fetchText(URLS.tools),
        ]);

        console.log('Début du chargement des équipements...');
        const armorItems = parseArmors(armorsMd);
        console.log('Fin du parsing des armures');

        const list: CatalogItem[] = [
          ...armorItems,
          ...parseShields(shieldsMd),
          ...parseWeapons(weaponsMd),
          ...parseTools(toolsMd),
          ...parseSectionedList(gearMd, 'adventuring_gear'),
        ];

        const seen = new Set<string>();
        const cleaned = list.filter(ci => {
          const nm = (ci.name || '').trim();
          if (!nm) return false;
          const id = ci.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        
        console.log(`\n=== STATISTIQUES FINALES ===`);
        console.log(`Total d'équipements chargés: ${cleaned.length}`);
        console.log(`Armures: ${cleaned.filter(i => i.kind === 'armors').length}`);
        console.log(`Boucliers: ${cleaned.filter(i => i.kind === 'shields').length}`);
        console.log(`Armes: ${cleaned.filter(i => i.kind === 'weapons').length}`);
        console.log(`Outils: ${cleaned.filter(i => i.kind === 'tools').length}`);
        console.log(`Équipements: ${cleaned.filter(i => i.kind === 'adventuring_gear').length}`);
        console.log('============================');
        
        setAll(cleaned);
      } catch (e) {
        console.error('Erreur de chargement:', e);
        toast.error('Erreur de chargement de la liste');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function parseSectionedList(md: string, kind: CatalogKind): CatalogItem[] {
    const items: CatalogItem[] = [];
    const lines = md.split('\n');
    let current: { name: string; descLines: string[] } | null = null;

    const isNoiseName = (n: string) =>
      !n ||
      /^sommaire$/i.test(n) ||
      /^table des matières$/i.test(n) ||
      /^introduction$/i.test(n);

    const flush = () => {
      if (!current) return;
      const rawName = current.name || '';
      const cleanName = stripPriceParentheses(rawName);
      const desc = current.descLines.join('\n').trim();
      if (!cleanName.trim() || isNoiseName(cleanName) || !desc) {
        current = null;
        return;
      }
      items.push({ id: `${kind}:${cleanName}`, kind, name: cleanName, description: desc });
      current = null;
    };

    for (const line of lines) {
      const h = line.match(/^#{2,3}\s+(.+?)\s*$/);
      if (h) { if (current) flush(); current = { name: h[1].trim(), descLines: [] }; continue; }
      if (/^---\s*$/.test(line)) { if (current) { flush(); continue; } }
      if (current) current.descLines.push(line);
    }
    if (current) flush();
    return items;
  }

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

  const filtered = React.useMemo(() => {
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

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-gray-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm">Aucun résultat</div>
          ) : (
            filtered.map(ci => {
              const isOpen = !!expanded[ci.id];
              const preview = (
                <>
                  {ci.kind === 'armors' && ci.armor && <div>CA: {ci.armor.label}</div>}
                  {ci.kind === 'shields' && ci.shield && <div>Bonus de bouclier: +{ci.shield.bonus}</div>}
                  {ci.kind === 'weapons' && ci.weapon && (
                    <div className="space-y-0.5">
                      <div>Dégâts: {ci.weapon.damageDice} {ci.weapon.damageType}</div>
                      {ci.weapon.properties && <div>Propriété: {ci.weapon.properties}</div>}
                      {ci.weapon.range && <div>Portée: {ci.weapon.range}</div>}
                    </div>
                  )}
                  {(ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description ? 'Voir le détail' : 'Équipement')}
                </>
              );
              return (
                <div key={ci.id} className="bg-gray-800/50 border border-gray-700/50 rounded-md">
                  <div className="flex items-start justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <button className="text-gray-100 font-medium hover:underline break-words text-left" onClick={() => toggleExpand(ci.id)}>
                        {smartCapitalize(ci.name)}
                      </button>
                      <div className="text-xs text-gray-400 mt-1">{preview}</div>
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