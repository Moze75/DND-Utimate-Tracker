/* Service de chargement et parsing des contenus de classes/sous-classes pour l’app
   Aligné avec la nomenclature “Règles 2024”.

   Hypothèses & règles:
   - Structures du dépôt source (Ultimate_Tracker):
       RAW_BASE/Classes/<Classe>/(README.md|index.md|<Classe>.md|<ClasseTitle>.md)
       RAW_BASE/Classes/<Classe>/Subclasses/(“Sous-classe - <Nom>.md” | “<Nom>.md” | dossier "<Nom>" contenant README.md/index.md)
   - On tolère au maximum les variantes d'écriture (accents, apostrophes, casse) via des fonctions de normalisation + maps.
   - On crée des “sections” à partir des titres Markdown ###. Si un niveau (Niveau X / Niv. X / Level X) est détecté, il est saisi;
     sinon, on affecte level=0 (toujours affiché dans l’UI).
   - Compatibilité 2024: “Occultiste” remplace “Sorcier” (Warlock). Tout alias “Sorcier/Warlock” est mappé vers “Occultiste”.
*/

export type AbilitySection = {
  level: number;            // 0 = sans niveau explicite, affiché tout le temps
  title: string;            // titre parsé après nettoyage
  content: string;          // contenu Markdown du bloc
  origin: "class" | "subclass";
};

export type ClassAndSubclassContent = {
  className: string;                 // nom canonique (ex: "Magicien")
  subclassesRequested?: string[];    // sous-classes demandées (normalisées)
  sections: AbilitySection[];        // sections concaténées class + subclasses (dans l’ordre)
  classSections: AbilitySection[];   // sections de classe
  subclassSections: Record<string, AbilitySection[]>; // par sous-classe
};

export const RAW_BASE =
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Classes";

/* ===========================================================
   Normalisation & helpers
   =========================================================== */

function stripDiacritics(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function lowerNoAccents(s: string): string {
  return stripDiacritics((s || "").toLowerCase());
}

function titleCase(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .split(/([\s\-\u2019'])+/) // conserver séparateurs (espace, -, apostrophes)
    .map((part) =>
      /[\s\-\u2019']+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
}

// Jointure d’URL: n’encode pas la base, encode chaque segment
function urlJoin(base: string, ...segments: string[]) {
  const cleanBase = base.replace(/\/+$/, "");
  const encodedSegments = segments.map((s) => encodeURIComponent(s));
  return [cleanBase, ...encodedSegments].join("/");
}

async function fetchFirstExisting(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // ignore and try next
    }
  }
  return null;
}

/* ===========================================================
   Mappings classes & sous-classes (2024)
   - clés en minuscule sans accents
   - valeurs = Nom exact de dossier/fichier utilisé dans le dépôt (best-effort)
   - NB: si une sous-classe est absente, on tentera des fallbacks "TitleCase"
   =========================================================== */

// Classes (dossier) — inclure FR/EN/alias
const CLASS_NAME_MAP: Record<string, string> = {
  "barbare": "Barbare",
  "barbarian": "Barbare",

  "barde": "Barde",
  "bard": "Barde",

  "clerc": "Clerc",
  "cleric": "Clerc",
  "pretre": "Clerc",
  "prete": "Clerc",
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

  // 2024: Occultiste (Warlock) — compat anciens contenus “Sorcier”
  "occultiste": "Occultiste",
  "warlock": "Occultiste",
  "sorcier": "Occultiste",
};

// Sous-classes spécifiques — si vous avez des noms exacts de fichiers/dossiers,
// vous pouvez les préciser ici pour améliorer la résolution.
// Format: { [classFolderName]: { [subclassKey(no-accents lower)]: "Nom de sous-classe (tel que dans le dépôt)" } }
const SUBCLASS_MAP: Record<string, Record<string, string>> = {
  // Exemples (adapter selon le dépôt Ultimate_Tracker si des noms exacts sont connus):
  // "Paladin": {
  //   "serment des anciens": "Serment des Anciens",
  //   "serment de devo tion": "Serment de Dévotion",
  // },
  // "Magicien": {
  //   "ecole d evocation": "École d'Évocation",
  //   "ecole de transmutation": "École de Transmutation",
  // },
};

/* ===========================================================
   Résolution des noms (entrée utilisateur -> canon dépôt)
   =========================================================== */

export function canonicalizeClassName(input?: string | null): string {
  const key = lowerNoAccents(input || "");
  return CLASS_NAME_MAP[key] || titleCase(input || "");
}

export function canonicalizeSubclassName(classCanonical: string, input?: string | null): string {
  const sub = titleCase(input || "");
  const classMap = SUBCLASS_MAP[classCanonical];
  if (!input) return sub;
  const key = lowerNoAccents(input);
  if (classMap) {
    const found = classMap[key];
    if (found) return found;
  }
  return sub;
}

/* ===========================================================
   Construction des chemins candidats à charger
   =========================================================== */

function candidateClassFiles(classCanonical: string): string[] {
  // Ordre: README.md, index.md, <Classe>.md, <Classe Title>.md
  // (on garde plusieurs possibilités pour s’adapter aux variations)
  return [
    urlJoin(RAW_BASE, classCanonical, "README.md"),
    urlJoin(RAW_BASE, classCanonical, "index.md"),
    urlJoin(RAW_BASE, classCanonical, `${classCanonical}.md`),
    urlJoin(RAW_BASE, classCanonical, `${titleCase(classCanonical)}.md`),
  ];
}

function candidateSubclassFiles(classCanonical: string, subclassCanonical: string): string[] {
  // On teste un éventail de conventions:
  // - Subclasses/<Nom>/README.md
  // - Subclasses/<Nom>/index.md
  // - Subclasses/<Nom>.md
  // - Subclasses/Sous-classe - <Nom>.md
  return [
    urlJoin(RAW_BASE, classCanonical, "Subclasses", subclassCanonical, "README.md"),
    urlJoin(RAW_BASE, classCanonical, "Subclasses", subclassCanonical, "index.md"),
    urlJoin(RAW_BASE, classCanonical, "Subclasses", `${subclassCanonical}.md`),
    urlJoin(RAW_BASE, classCanonical, "Subclasses", `Sous-classe - ${subclassCanonical}.md`),
  ];
}

/* ===========================================================
   Parsing Markdown -> Sections
   - On prend chaque "### " comme début d’une section
   - Le “Niveau” est détecté si le titre contient:
       “Niveau X”, “Niv. X”, “Level X”, “Lvl X”, “Au niveau X”, etc.
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
    .replace(/^#+\s*/, "") // enleve ##, ###, etc
    .replace(/\s*:+\s*$/, "") // trailing colons
    .trim();
}

export function parseMarkdownToSections(md: string, origin: "class" | "subclass"): AbilitySection[] {
  if (!md || typeof md !== "string") return [];

  // Normaliser les fins de lignes
  const text = md.replace(/\r\n/g, "\n");

  // Couper sur "### " (sections d’aptitudes principales)
  const chunks = text.split(/\n(?=###\s+)/g);

  // Si aucune "###" trouvée, essayer "## " comme fallback (certains docs)
  const work = chunks.length > 1 ? chunks : text.split(/\n(?=##\s+)/g);

  const sections: AbilitySection[] = [];

  for (const chunk of work) {
    const lines = chunk.split("\n");
    const first = lines[0] || "";
    const isSection = /^#{2,3}\s+/.test(first);

    if (!isSection) {
      // bloc initial avant la première section -> on peut le mettre en section "0"
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

  return sections;
}

/* ===========================================================
   Cache simple en mémoire (process)
   =========================================================== */

const textCache = new Map<string, string>();

async function getTextWithCache(urls: string[]): Promise<string | null> {
  for (const u of urls) {
    if (textCache.has(u)) return textCache.get(u)!;
  }
  const txt = await fetchFirstExisting(urls);
  if (txt) {
    const chosen = urls.find((u) => true) as string; // store under first for simplicity
    textCache.set(chosen, txt);
    return txt;
  }
  return null;
}

/* ===========================================================
   API publique
   =========================================================== */

/**
 * Charge les sections de la classe (sans sous-classe).
 */
export async function loadClassSections(inputClass: string): Promise<AbilitySection[]> {
  const classCanonical = canonicalizeClassName(inputClass);
  const urls = candidateClassFiles(classCanonical);
  const md = await getTextWithCache(urls);
  if (!md) return [];
  return parseMarkdownToSections(md, "class");
}

/**
 * Charge les sections d’une sous-classe pour une classe donnée.
 */
export async function loadSubclassSections(inputClass: string, inputSubclass: string): Promise<AbilitySection[]> {
  const classCanonical = canonicalizeClassName(inputClass);
  const subclassCanonical = canonicalizeSubclassName(classCanonical, inputSubclass);
  const urls = candidateSubclassFiles(classCanonical, subclassCanonical);
  const md = await getTextWithCache(urls);
  if (!md) return [];
  return parseMarkdownToSections(md, "subclass");
}

/**
 * Charge et concatène les sections de classe + sous-classes demandées.
 * - L’ordre renvoyé est: sections de classe puis sections de sous-classes (par ordre fourni).
 */
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
      if (sections.length > 0) {
        subclassSections[subclassCanonical] = sections;
      } else {
        // essayer un fallback ultra permissif: TitleCase sans accents
        const fallback = titleCase(stripDiacritics(subclassCanonical));
        if (fallback !== subclassCanonical) {
          const urls = candidateSubclassFiles(classCanonical, fallback);
          const md = await getTextWithCache(urls);
          if (md) {
            subclassSections[subclassCanonical] = parseMarkdownToSections(md, "subclass");
          } else {
            subclassSections[subclassCanonical] = [];
          }
        } else {
          subclassSections[subclassCanonical] = [];
        }
      }
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

/**
 * Utilitaire d’affichage: si vous avez des anciens personnages “Sorcier”, affichez “Occultiste”.
 */
export function displayClassName(cls?: string | null): string {
  if (!cls) return "";
  const canon = canonicalizeClassName(cls);
  return canon;
}

/**
 * Réinitialise le cache (utile en dev).
 */
export function resetClassesContentCache(): void {
  textCache.clear();
}