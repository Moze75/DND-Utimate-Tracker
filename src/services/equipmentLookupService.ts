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

export interface EnrichedEquipment {
  name: string;
  description: string;
  meta: ItemMeta;
  autoEquip: boolean;
}

const ULT_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Equipements';
const URLS = {
  armors: `${ULT_BASE}/Armures.md`,
  shields: `${ULT_BASE}/Boucliers.md`,
  weapons: `${ULT_BASE}/Armes.md`,
  adventuring_gear: `${ULT_BASE}/Equipements_daventurier.md`,
  tools: `${ULT_BASE}/Outils.md`,
};

let cachedCatalogs: CatalogItem[] | null = null;

const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();

const smartCapitalize = (name: string) => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
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
  const items: CatalogItem[] = [];
  const lines = md.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|') && line.includes('|')) {
      const cells = line.substring(1, line.length - 1).split('|').map(c => c.trim());

      if (cells.length >= 2) {
        const [nomRaw, ca] = cells;

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
          nomRaw === '---' ||
          ca === '---' ||
          caNorm.includes('force') ||
          caNorm.includes('discrétion') ||
          nomNorm === 'force' ||
          nomNorm === 'discrétion'
        ) {
          continue;
        }

        const nom = stripPriceParentheses(nomRaw);

        if (!nom || nom === '---' || nom.length < 2) {
          continue;
        }

        let base = 10, addDex = false, dexCap: number | null = null;

        if (ca.toLowerCase().includes('modificateur de dex')) {
          const baseMatch = ca.match(/(\d+)/);
          const capMatch = ca.match(/max\s*(\d+)/i);

          if (baseMatch) {
            base = parseInt(baseMatch[1]);
            addDex = true;
            dexCap = capMatch ? parseInt(capMatch[1]) : null;
          }
        } else {
          const numberMatch = ca.match(/^\s*(\d+)\s*$/);
          if (numberMatch) {
            base = parseInt(numberMatch[1]);
            addDex = false;
            dexCap = null;
          } else {
            const anyNumberMatch = ca.match(/(\d+)/);
            if (anyNumberMatch) {
              base = parseInt(anyNumberMatch[1]);
              addDex = false;
              dexCap = null;
            }
          }
        }

        items.push({
          id: `armor:${nom}`,
          kind: 'armors',
          name: nom,
          armor: { base, addDex, dexCap, label: ca }
        });
      }
    }
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

function isMarkdownTableLine(line: string) {
  const l = line.trim();
  return l.startsWith('|') && l.endsWith('|') && l.includes('|');
}

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

  const seen = new Set(items.map(i => i.name.toLowerCase()));
  for (const sec of sections) {
    if (seen.has(sec.name.toLowerCase())) continue;
    items.push({ id: `tools:${sec.name}`, kind: 'tools', name: sec.name, description: sec.desc });
  }
  const dedup = new Map<string, CatalogItem>();
  for (const it of items) { if (!dedup.has(it.id)) dedup.set(it.id, it); }
  return [...dedup.values()];
}

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

export async function loadEquipmentCatalogs(): Promise<CatalogItem[]> {
  if (cachedCatalogs) {
    return cachedCatalogs;
  }

  const [armorsMd, shieldsMd, weaponsMd, gearMd, toolsMd] = await Promise.all([
    fetchText(URLS.armors),
    fetchText(URLS.shields),
    fetchText(URLS.weapons),
    fetchText(URLS.adventuring_gear),
    fetchText(URLS.tools),
  ]);

  const list: CatalogItem[] = [
    ...parseArmors(armorsMd),
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

  cachedCatalogs = cleaned;
  return cleaned;
}

function parseEquipmentString(item: string): { quantity: number; name: string } | null {
  if (/\d+\s*po$/i.test(item)) {
    return null;
  }

  const match = item.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { quantity: parseInt(match[1]), name: match[2].trim() };
  }

  const parenthesesMatch = item.match(/^(.+?)\s*\((\d+)\s*(?:flasques?|exemplaires?|unités?)\)$/i);
  if (parenthesesMatch) {
    return { quantity: parseInt(parenthesesMatch[2]), name: parenthesesMatch[1].trim() };
  }

  return { quantity: 1, name: item.trim() };
}

function findEquipmentByName(name: string, catalogs: CatalogItem[]): CatalogItem | null {
  const normalized = stripPriceParentheses(name).toLowerCase().trim();

  let found = catalogs.find(c =>
    stripPriceParentheses(c.name).toLowerCase().trim() === normalized
  );

  if (!found) {
    found = catalogs.find(c => {
      const cName = stripPriceParentheses(c.name).toLowerCase().trim();
      return cName.includes(normalized) || normalized.includes(cName);
    });
  }

  return found || null;
}

export async function enrichEquipmentList(items: string[]): Promise<EnrichedEquipment[]> {
  try {
    const catalogs = await loadEquipmentCatalogs();
    const enriched: EnrichedEquipment[] = [];

    for (const item of items) {
      const parsed = parseEquipmentString(item);
      if (!parsed) continue;

      const catalogItem = findEquipmentByName(parsed.name, catalogs);

      if (catalogItem) {
        let meta: ItemMeta = { type: 'equipment', quantity: parsed.quantity, equipped: false };

        if (catalogItem.kind === 'armors' && catalogItem.armor) {
          meta = { type: 'armor', quantity: parsed.quantity, equipped: false, armor: catalogItem.armor };
        } else if (catalogItem.kind === 'shields' && catalogItem.shield) {
          meta = { type: 'shield', quantity: parsed.quantity, equipped: false, shield: catalogItem.shield };
        } else if (catalogItem.kind === 'weapons' && catalogItem.weapon) {
          meta = { type: 'weapon', quantity: parsed.quantity, equipped: false, weapon: catalogItem.weapon };
        } else if (catalogItem.kind === 'tools') {
          meta = { type: 'tool', quantity: parsed.quantity, equipped: false };
        }

        enriched.push({
          name: catalogItem.name,
          description: catalogItem.description || '',
          meta,
          autoEquip: false,
        });
      } else {
        enriched.push({
          name: smartCapitalize(parsed.name),
          description: '',
          meta: {
            type: 'equipment',
            quantity: parsed.quantity,
            equipped: false,
          },
          autoEquip: false,
        });
      }
    }

    return enriched;
  } catch (error) {
    console.error('Erreur lors du chargement des catalogues:', error);
    return [];
  }
}

export function determineAutoEquip(items: EnrichedEquipment[]): EnrichedEquipment[] {
  let hasArmor = false;
  let hasShield = false;
  const weaponNames = new Set<string>();

  const result = items.map(item => {
    const type = item.meta.type;
    let autoEquip = false;

    if (type === 'armor' && !hasArmor) {
      autoEquip = true;
      hasArmor = true;
    } else if (type === 'shield' && !hasShield) {
      autoEquip = true;
      hasShield = true;
    } else if (type === 'weapon') {
      const normalizedName = item.name.toLowerCase().trim();
      if (!weaponNames.has(normalizedName)) {
        autoEquip = true;
        weaponNames.add(normalizedName);
      }
    }

    return {
      ...item,
      autoEquip,
      meta: {
        ...item.meta,
        equipped: autoEquip,
      }
    };
  });

  console.log('[determineAutoEquip] R\u00e9sultat:', result.map(i => ({ name: i.name, type: i.meta.type, autoEquip: i.autoEquip })));
  return result;
}
