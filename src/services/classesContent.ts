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
   Bases RAW — d’abord la structure réellement présente
   =========================================================== */
// D’abord “Classes” (structure réelle), puis fallback “master”
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
function titleCaseFrench(input: string): string {
  // TitleCase “fr” avec petits mots conservés en minuscule
  const small = new Set(["de", "des", "du", "la", "le", "les", "et", "d'", "l'"]);
  return (input || "")
    .trim()
    .split(/(\s+)/)
    .map((part, idx, arr) => {
      if (/^\s+$/.test(part)) return part;
      const p = part.toLowerCase();
      if (idx !== 0 && small.has(p)) return p;
      // garder apostrophes typographiques
      const head = p.charAt(0).toUpperCase();
      return head + p.slice(1);
    })
    .join("");
}
function stripParentheses(s: string): string {
  return (s || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
function normalizeApos(s: string): string {
  return (s || "").replace(/[’]/g, "'");
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

async function fetchFirstExisting(urls: string[], dbgLabel?: string): Promise<string | null> {
  if (DEBUG) {
    console.debug("[classesContent] Try candidates", dbgLabel || "", {
      count: urls.length,
      firsts: urls.slice(0, 8),
    });
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        if (DEBUG) console.debug("[classesContent] OK:", url);
        return await res.text();
      } else if (DEBUG) {
        console.debug("[classesContent] 404:", url);
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

  "occultiste": "Occultiste",
  "warlock": "Occultiste",
  "sorcier": "Occultiste",
};

const SUBCLASS_NAME_MAP: Record<string, string> = {
  // Paladin — utiliser la casse exacte “Serment de dévotion” (dé en minuscule)
  "serment des anciens": "Serment des Anciens",
  "oath of the ancients": "Serment des Anciens",

  "serment de devotion": "Serment de dévotion",
  "serment de dévotion": "Serment de dévotion",
  "oath of devotion": "Serment de dévotion",

  "serment de vengeance": "Serment de Vengeance",
  "oath of vengeance": "Serment de Vengeance",

  "serment de gloire": "Serment de Gloire",
  "oath of glory": "Serment de Gloire",

  // (Le reste — cf. autres classes si besoin; on garde celles qui existent déjà
  // dans l’app; le souci actuel concerne surtout Paladin)
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
 * Pour “Occultiste” on essaie aussi “Sorcier” et “Warlock” (compat).
 */
function getClassFolderNames(appClassName: string): string[] {
  const primary = canonicalizeClassName(appClassName);
  const variants = [primary];
  const k = lowerNoAccents(primary);
  if (k === "occultiste") variants.push("Sorcier", "Warlock");
  return uniq(variants);
}

/**
 * Dossiers possibles pour les sous-classes — d’abord Subclasses (réel dans le dépôt)
 */
function getSubclassDirNames(): string[] {
  return ["Subclasses", "Sous-classes", "Sous classes", "SousClasses", "SubClasses", "Sous_Classes"];
}

/**
 * Variantes robustes pour un nom de sous-classe (préserve accents, varie la casse utile).
 */
function buildSubclassNameVariants(name: string): string[] {
  const base = normalizeName(name);
  const lower = base.toLowerCase(); // utile si les fichiers sont tout en minuscule
  const tFr = titleCaseFrench(base); // TitleCase fr avec “de/des/du” en minuscule
  const noParen = stripParentheses(base);
  const noParenT = titleCaseFrench(noParen);
  const apos = normalizeApos(base);
  const aposT = titleCaseFrench(apos);

  // Inclure aussi la version “Serment de Dévotion” (D majuscule) au cas où
  const altCapital = base.replace(/(de)\s+(d[ée]votion)/i, "de Dévotion");

  return uniq([base, lower, tFr, noParen, noParenT, apos, aposT, altCapital]);
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
      const cTitle = c; // déjà bien cased
      candidates.push(
        urlJoin(folder, "README.md"),
        urlJoin(folder, "index.md"),
        urlJoin(folder, `${cTitle}.md`), // ex: Paladin/Paladin.md (réel)
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
  const prefixes = ["Sous-classe", "Sous classe", "Subclass", "Sous-Classe"];

  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      for (const subdir of subdirs) {
        const baseSub = urlJoin(base, c, subdir);

        // Fichiers directs — d’abord le format réel “Sous-classe - <Nom>.md”
        for (const nm of nameVariants) {
          candidates.push(
            urlJoin(baseSub, `${prefixes[0]} ${dash} ${nm}.md`), // Sous-classe - nm.md
            urlJoin(baseSub, `${prefixes[0]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${nm}.md`), // nm.md
          );
        }

        // Dossiers “<Nom>/{README.md,index.md}”
        const inside = ["README.md", "index.md"];
        for (const nm of nameVariants) {
          const subFolderVariants = uniq([
            nm,
            `${prefixes[0]} ${dash} ${nm}`,
            `${prefixes[0]} ${enDash} ${nm}`,
            `${prefixes[0]} ${emDash} ${nm}`,
            `${prefixes[1]} ${dash} ${nm}`,
            `${prefixes[1]} ${enDash} ${nm}`,
            `${prefixes[1]} ${emDash} ${nm}`,
          ]);
          for (const sf of subFolderVariants) {
            for (const f of inside) {
              candidates.push(urlJoin(baseSub, sf, f));
            }
            candidates.push(urlJoin(baseSub, nm, `${nm}.md`)); // <Nom>/<Nom>.md
          }
        }
      }

      // Fallback: parfois à la racine de la classe
      const classFolder = urlJoin(base, c);
      for (const nm of nameVariants) {
        candidates.push(urlJoin(classFolder, `${nm}.md`));
      }
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
   Cache simple
   =========================================================== */

const textCache = new Map<string, string>();

async function getTextWithCache(urls: string[], dbgLabel?: string): Promise<string | null> {
  for (const u of urls) {
    if (textCache.has(u)) {
      if (DEBUG) console.debug("[classesContent] cache hit:", u);
      return textCache.get(u)!;
    }
  }
  const txt = await fetchFirstExisting(urls, dbgLabel);
  if (txt) {
    const chosen = urls[0];
    textCache.set(chosen, txt);
    return txt;
  }
  return null;
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
      candidates.push(
        urlJoin(folder, "README.md"),
        urlJoin(folder, "index.md"),
        urlJoin(folder, `${c}.md`), // ex: Paladin/Paladin.md
      );
    }
  }

  const md = await getTextWithCache(candidates, `class:${inputClass}`);
  if (!md) return [];
  return parseMarkdownToSections(md, "class");
}

export async function loadSubclassSections(inputClass: string, inputSubclass: string): Promise<AbilitySection[]> {
  const subclassCanonical = canonicalizeSubclassName(canonicalizeClassName(inputClass), inputSubclass);
  const nameVariants = buildSubclassNameVariants(subclassCanonical);
  const classFolders = getClassFolderNames(inputClass);
  const subdirs = getSubclassDirNames();

  const dash = "-";
  const enDash = "–";
  const emDash = "—";
  const prefixes = ["Sous-classe", "Sous classe", "Subclass", "Sous-Classe"];

  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      for (const subdir of subdirs) {
        const baseSub = urlJoin(base, c, subdir);

        for (const nm of nameVariants) {
          candidates.push(
            urlJoin(baseSub, `${prefixes[0]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${nm}.md`),
          );
        }

        const inside = ["README.md", "index.md"];
        for (const nm of nameVariants) {
          const subFolderVariants = uniq([
            nm,
            `${prefixes[0]} ${dash} ${nm}`,
            `${prefixes[0]} ${enDash} ${nm}`,
            `${prefixes[0]} ${emDash} ${nm}`,
            `${prefixes[1]} ${dash} ${nm}`,
            `${prefixes[1]} ${enDash} ${nm}`,
            `${prefixes[1]} ${emDash} ${nm}`,
          ]);
          for (const sf of subFolderVariants) {
            for (const f of inside) candidates.push(urlJoin(baseSub, sf, f));
            candidates.push(urlJoin(baseSub, nm, `${nm}.md`));
          }
        }
      }
      const classFolder = urlJoin(base, c);
      for (const nm of nameVariants) {
        candidates.push(urlJoin(classFolder, `${nm}.md`));
      }
    }
  }

  const md = await getTextWithCache(candidates, `subclass:${inputClass}/${inputSubclass}`);
  if (!md) return [];
  return parseMarkdownToSections(md, "subclass");
}

export async function loadClassAndSubclassContent(
  inputClass: string,
  inputSubclasses?: string[] | null
): Promise<ClassAndSubclassContent> {
  const classSections = await loadClassSections(inputClass);

  const subclassSections: Record<string, AbilitySection[]> = {};
  const subclassesRequested: string[] = [];

  if (inputSubclasses && inputSubclasses.length > 0) {
    for (const sc of inputSubclasses) {
      const scCanon = canonicalizeSubclassName(canonicalizeClassName(inputClass), sc);
      subclassesRequested.push(scCanon);
      const sections = await loadSubclassSections(inputClass, scCanon);
      subclassSections[scCanon] = sections;
    }
  }

  const sections: AbilitySection[] = [
    ...classSections,
    ...subclassesRequested.flatMap((sc) => subclassSections[sc] || []),
  ];

  return {
    className: canonicalizeClassName(inputClass),
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
}