/* Service de chargement et parsing des contenus de classes/sous-classes pour l’app
   Aligné avec la nomenclature “règles 2024”.
*/

export type AbilitySection = {
  level: number;
  title: string;
  content: string;
  origin: "class" | "subclass";
};

export type ClassAndSubclassContent = {
  className: string;
  subclassesRequested?: string[];
  sections: AbilitySection[];
  classSections: AbilitySection[];
  subclassSections: Record<string, AbilitySection[]>;
};

// Activer les logs détaillés en mettant window.UT_DEBUG = true dans la console
const DEBUG: boolean =
  typeof window !== "undefined" && (window as any).UT_DEBUG === true;

/* ===========================================================
   Bases RAW — structure réelle du dépôt
   =========================================================== */
const RAW_BASES = [
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Classes",
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/master/Classes",
];

/* ===========================================================
   Normalisation & helpers
   =========================================================== */

function stripDiacritics(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function lowerNoAccents(s: string): string {
  return stripDiacritics((s || "").toLowerCase());
}
function normalizeName(name: string): string {
  return (name || "").trim();
}
function normalizeApos(s: string): string {
  return (s || "").replace(/[’]/g, "'");
}
function titleCaseFrench(input: string): string {
  // TitleCase fr avec petits mots conservés en minuscule
  const small = new Set(["de", "des", "du", "la", "le", "les", "et", "d'", "l'"]);
  return (input || "")
    .trim()
    .split(/(\s+)/)
    .map((part, idx) => {
      if (/^\s+$/.test(part)) return part;
      const p = part.toLowerCase();
      if (idx !== 0 && small.has(p)) return p;
      const head = p.charAt(0).toUpperCase();
      return head + p.slice(1);
    })
    .join("");
}
function sentenceCaseFrench(input: string): string {
  // Premier mot capitalisé, reste en minuscule (utile pour “Collège du savoir”, “Credo de la paume”)
  const s = (input || "").trim().toLowerCase();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function stripParentheses(s: string): string {
  return (s || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// Jointure d’URL: n’encode pas la base, encode chaque segment
function urlJoin(base: string, ...segments: string[]) {
  const cleanBase = base.replace(/\/+$/, "");
  const encodedSegments = segments.map((s) => encodeURIComponent(s));
  return [cleanBase, ...encodedSegments].join("/");
}

/* ===========================================================
   Cache “positif” + cache “négatif” (anti-404 répétées)
   =========================================================== */

const textCache = new Map<string, string>();

type NegativeEntry = { ts: number };
const negativeCache = new Map<string, NegativeEntry>();
const NEGATIVE_TTL_MS = 5 * 60 * 1000; // 5 min

function negativeHas(url: string): boolean {
  const e = negativeCache.get(url);
  if (!e) return false;
  if (Date.now() - e.ts > NEGATIVE_TTL_MS) {
    negativeCache.delete(url);
    return false;
  }
  return true;
}
function negativeSet(url: string): void {
  negativeCache.set(url, { ts: Date.now() });
}

async function fetchFirstExisting(urls: string[], dbgLabel?: string): Promise<string | null> {
  if (DEBUG) {
    console.debug("[classesContent] Try candidates", dbgLabel || "", {
      count: urls.length,
      firsts: urls.slice(0, 8),
    });
  }
  for (const url of urls) {
    try {
      if (negativeHas(url)) {
        if (DEBUG) console.debug("[classesContent] skip known 404:", url);
        continue;
      }
      if (textCache.has(url)) {
        if (DEBUG) console.debug("[classesContent] cache hit:", url);
        return textCache.get(url)!;
      }
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const txt = await res.text();
        textCache.set(url, txt);
        if (DEBUG) console.debug("[classesContent] OK:", url);
        return txt;
      } else {
        negativeSet(url);
        if (DEBUG) console.debug("[classesContent] not OK:", res.status, url);
      }
    } catch (e) {
      if (DEBUG) console.debug("[classesContent] fetch error -> continue", url, e);
    }
  }
  if (DEBUG) console.debug("[classesContent] No match for", dbgLabel || "", "(tried:", urls.length, "urls)");
  return null;
}

/* ===========================================================
   Mappings classes & sous-classes (2024)
   =========================================================== */

const CLASS_NAME_MAP: Record<string, string> = {
  "barbare": "Barbare",
  "barbarian": "Barbare",

  "barde": "Barde",
  "bard": "Barde",

  "clerc": "Clerc",
  "cleric": "Clerc",
  "pretre": "Clerc",
  "prete": "Clerc",
  "pretres": "Clerc",
  "pretresse": "Clerc",
  "prêtre": "Clerc",

  "druide": "Druide",
  "druid": "Druide",

  "ensorceleur": "Ensorceleur",
  "sorcerer": "Ensorceleur",
  "sorceror": "Ensorceleur",

  "guerrier": "Guerrier",
  "fighter": "Guerrier",

  "magicien": "Magicien",
  "wizard": "Magicien",
  "mage": "Magicien",

  "moine": "Moine",
  "monk": "Moine",

  "paladin": "Paladin",

  "rodeur": "Rôdeur",
  "rôdeur": "Rôdeur",
  "ranger": "Rôdeur",

  "roublard": "Roublard",
  "rogue": "Roublard",
  "voleur": "Roublard",
  "thief": "Roublard",

  // 2024: Occultiste (Warlock) — résolution dossiers via getClassFolderNames
  "occultiste": "Occultiste",
  "warlock": "Occultiste",
  "sorcier": "Occultiste",
};

// On garde une table minimale et on s’appuie surtout sur les variantes générées.
// Ajoute ici si tu veux forcer des renommages officiels.
const SUBCLASS_NAME_MAP: Record<string, string> = {
  // Paladin — casse exacte dans le dépôt
  "serment des anciens": "Serment des Anciens",
  "oath of the ancients": "Serment des Anciens",

  "serment de devotion": "Serment de dévotion",
  "serment de dévotion": "Serment de dévotion",
  "oath of devotion": "Serment de dévotion",

  "serment de vengeance": "Serment de Vengeance",
  "oath of vengeance": "Serment de Vengeance",
  "serment de gloire": "Serment de Gloire",
  "oath of glory": "Serment de Gloire",
};

function canonicalizeClassName(input?: string | null): string {
  const key = lowerNoAccents(input || "");
  return CLASS_NAME_MAP[key] || titleCaseFrench(input || "");
}
function canonicalizeSubclassName(_classCanonical: string, input?: string | null): string {
  if (!input) return "";
  const key = lowerNoAccents(input);
  return SUBCLASS_NAME_MAP[key] || titleCaseFrench(input);
}

/**
 * Dossiers possibles pour une classe dans le dépôt.
 * - nom canonique
 * - variante sans accents (ex: Rôdeur -> Rodeur)
 * - “Sorcier” et “Warlock” en plus pour Occultiste
 */
function getClassFolderNames(appClassName: string): string[] {
  const primary = canonicalizeClassName(appClassName);
  const variants = [primary];

  const k = lowerNoAccents(primary);
  if (k === "occultiste") variants.push("Sorcier", "Warlock");

  // Ajouter une variante sans accents pour tous (utile si certains dossiers n’ont pas d’accents)
  variants.push(stripDiacritics(primary));

  return uniq(variants);
}

/**
 * Dossiers possibles pour les sous-classes — “Subclasses” en premier (structure réelle),
 * garder d’autres variantes par tolérance.
 */
function getSubclassDirNames(): string[] {
  return ["Subclasses", "Sous-classes", "Sous classes", "SousClasses", "SubClasses", "Sous_Classes"];
}

/**
 * Variantes robustes pour un nom de sous-classe:
 * - base d’entrée, TitleCase fr, tout en minuscule, “Phrase” (premier mot cap),
 * - sans parenthèses, apostrophes normalisées,
 * - chaque variante déclinée aussi en “sans accents”.
 */
function buildSubclassNameVariants(name: string): string[] {
  const base = normalizeName(name);
  const lower = base.toLowerCase();
  const tFr = titleCaseFrench(base);
  const sent = sentenceCaseFrench(base);
  const noParen = stripParentheses(base);
  const noParenLower = noParen.toLowerCase();
  const noParenT = titleCaseFrench(noParen);
  const noParenSent = sentenceCaseFrench(noParen);
  const apos = normalizeApos(base);
  const aposLower = apos.toLowerCase();
  const aposT = titleCaseFrench(apos);
  const aposSent = sentenceCaseFrench(apos);

  const withAccents = [
    base, lower, tFr, sent,
    noParen, noParenLower, noParenT, noParenSent,
    apos, aposLower, aposT, aposSent,
  ];

  const noAccents = withAccents.map(stripDiacritics);

  // Cas particulier: “... de dévotion” -> forcer aussi “... de Dévotion”
  const altDev = (s: string) => s.replace(/(de)\s+(d[ée]votion)/i, "de Dévotion");
  const withAltDev = uniq([...withAccents, ...withAccents.map(altDev)]);

  return uniq([...withAltDev, ...noAccents, ...noAccents.map(altDev)]);
}

/* ===========================================================
   Chargement markdown: classe et sous-classe
   =========================================================== */

async function loadClassMarkdown(className: string): Promise<string | null> {
  const classFolders = getClassFolderNames(className);
  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      const folder = urlJoin(base, c);

      // 1) Chemin réel observé
      candidates.push(urlJoin(folder, `${c}.md`)); // ex: Paladin/Paladin.md

      // 2) Fallbacks classiques
      candidates.push(
        urlJoin(folder, "README.md"),
        urlJoin(folder, "index.md"),
      );
    }
  }
  return fetchFirstExisting(candidates, `class:${className}`);
}

async function loadSubclassMarkdown(className: string, subclassName: string): Promise<string | null> {
  const classFolders = getClassFolderNames(className);
  const subdirs = getSubclassDirNames();
  const sc = canonicalizeSubclassName(canonicalizeClassName(className), subclassName);
  const nameVariants = buildSubclassNameVariants(sc);

  const dash = "-";
  const enDash = "–"; // \u2013
  const emDash = "—"; // \u2014

  const bestPrefix = "Sous-classe"; // forme réellement observée
  const extraPrefixes = ["Sous classe", "Subclass", "Sous-Classe"];

  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      for (const subdir of subdirs) {
        const baseSub = urlJoin(base, c, subdir);

        // 1) Fichiers directs — d’abord le format observé
        for (const nm of nameVariants) {
          candidates.push(
            urlJoin(baseSub, `${bestPrefix} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${bestPrefix} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${bestPrefix} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${nm}.md`),
          );
        }

        // 2) Autres préfixes (moins probables)
        for (const nm of nameVariants) {
          for (const p of extraPrefixes) {
            candidates.push(
              urlJoin(baseSub, `${p} ${dash} ${nm}.md`),
              urlJoin(baseSub, `${p} ${enDash} ${nm}.md`),
              urlJoin(baseSub, `${p} ${emDash} ${nm}.md`),
            );
          }
        }

        // 3) Dossiers “<Nom>/{README.md,index.md}”
        const inside = ["README.md", "index.md"];
        for (const nm of nameVariants) {
          const subFolderVariants = uniq([
            nm,
            `${bestPrefix} ${dash} ${nm}`,
            `${bestPrefix} ${enDash} ${nm}`,
            `${bestPrefix} ${emDash} ${nm}`,
          ]);
          for (const sf of subFolderVariants) {
            for (const f of inside) candidates.push(urlJoin(baseSub, sf, f));
            candidates.push(urlJoin(baseSub, nm, `${nm}.md`)); // <Nom>/<Nom>.md
          }
        }
      }

      // 4) Fallback: racine de la classe
      const classFolder = urlJoin(base, c);
      for (const nm of nameVariants) candidates.push(urlJoin(classFolder, `${nm}.md`));
    }
  }

  return fetchFirstExisting(candidates, `subclass:${className}/${subclassName}`);
}

/* ===========================================================
   Parsing Markdown -> Sections
   =========================================================== */

const LEVEL_REGEXES: RegExp[] = [
  /\bNiveau\s*(\d+)\b/i,
  /\bNiv\.?\s*(\d+)\b/i,
  /\bLevel\s*(\d+)\b/i,
  /\bLvl\.?\s*(\d+)\b/i,
  /\bAu\s+niveau\s+(\d+)\b/i,
];

function extractLevelFromTitle(title: string): number {
  for (const re of LEVEL_REGEXES) {
    const m = title.match(re);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function cleanTitle(raw: string): string {
  return (raw || "")
    .replace(/^#+\s*/, "")
    .replace(/\s*:+\s*$/, "")
    .trim();
}

function parseMarkdownToSections(md: string, origin: "class" | "subclass"): AbilitySection[] {
  if (!md || typeof md !== "string") return [];
  const text = md.replace(/\r\n/g, "\n");
  const chunks = text.split(/\n(?=###\s+)/g);
  const work = chunks.length > 1 ? chunks : text.split(/\n(?=##\s+)/g);

  const sections: AbilitySection[] = [];

  for (const chunk of work) {
    const lines = chunk.split("\n");
    const first = lines[0] || "";
    const isSection = /^#{2,3}\s+/.test(first);

    if (!isSection) {
      const content = chunk.trim();
      if (content) {
        sections.push({
          level: 0,
          title: "Général",
          content,
          origin,
        });
      }
      continue;
    }

    const rawTitle = cleanTitle(first);
    const level = extractLevelFromTitle(rawTitle);
    const body = lines.slice(1).join("\n").trim();

    sections.push({
      level,
      title: rawTitle,
      content: body,
      origin,
    });
  }

  return sections.filter(
    (s) => (s.content && s.content.trim().length > 0) || (s.title && s.title.trim().length > 0)
  );
}

/* ===========================================================
   API moderne
   =========================================================== */

export async function loadClassSections(inputClass: string): Promise<AbilitySection[]> {
  const classFolders = getClassFolderNames(inputClass);
  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      const folder = urlJoin(base, c);
      // Essayer d’abord <Classe>/<Classe>.md (réel)
      candidates.push(urlJoin(folder, `${c}.md`));
      // Fallbacks ensuite
      candidates.push(urlJoin(folder, "README.md"), urlJoin(folder, "index.md"));
    }
  }
  const md = await fetchFirstExisting(candidates, `class:${inputClass}`);
  if (!md) return [];
  return parseMarkdownToSections(md, "class");
}

export async function loadSubclassSections(inputClass: string, inputSubclass: string): Promise<AbilitySection[]> {
  const classCanonical = canonicalizeClassName(inputClass);
  const subclassCanonical = canonicalizeSubclassName(classCanonical, inputSubclass);
  const md = await loadSubclassMarkdown(classCanonical, subclassCanonical);
  if (!md) return [];
  return parseMarkdownToSections(md, "subclass");
}

export async function loadClassAndSubclassContent(
  inputClass: string,
  inputSubclasses?: string[] | null
): Promise<ClassAndSubclassContent> {
  const classCanonical = canonicalizeClassName(inputClass);

  const classSections = await loadClassSections(classCanonical);

  const subclassSections: Record<string, AbilitySection[]> = {};
  const subclassesRequested: string[] = [];

  if (inputSubclasses && inputSubclasses.length > 0) {
    for (const sc of inputSubclasses) {
      const subclassCanonical = canonicalizeSubclassName(classCanonical, sc);
      subclassesRequested.push(subclassCanonical);
      const sections = await loadSubclassSections(classCanonical, subclassCanonical);
      subclassSections[subclassCanonical] = sections;
    }
  }

  const sections: AbilitySection[] = [
    ...classSections,
    ...subclassesRequested.flatMap((sc) => subclassSections[sc] || []),
  ];

  return {
    className: classCanonical,
    subclassesRequested,
    sections,
    classSections,
    subclassSections,
  };
}

/* ===========================================================
   API rétro-compatible avec l’app
   =========================================================== */

export async function loadAbilitySections(params: {
  className: string;
  subclassName: string | null;
  characterLevel: number;
}): Promise<{ sections: AbilitySection[] }> {
  const { className, subclassName } = params;

  const out: AbilitySection[] = [];

  const classMd = await loadClassMarkdown(className);
  if (classMd) out.push(...parseMarkdownToSections(classMd, "class"));

  if (subclassName && subclassName.trim().length > 0) {
    const subMd = await loadSubclassMarkdown(className, subclassName);
    if (subMd) out.push(...parseMarkdownToSections(subMd, "subclass"));
  }

  out.sort((a, b) => {
    const la = Number(a.level) || 0;
    const lb = Number(b.level) || 0;
    if (la !== lb) return la - lb;
    if (a.origin !== b.origin) return a.origin === "class" ? -1 : 1;
    return a.title.localeCompare(b.title, "fr");
  });

  return { sections: out };
}

/* ===========================================================
   Utils
   =========================================================== */

export function displayClassName(cls?: string | null): string {
  if (!cls) return "";
  return canonicalizeClassName(cls);
}

export function resetClassesContentCache(): void {
  textCache.clear();
  negativeCache.clear();
}