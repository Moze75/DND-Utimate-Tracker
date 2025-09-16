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

// Essaye d'abord files/Classes (nouvelle structure), puis Classes (historique), sur main puis master
const RAW_BASES = [
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/files/Classes",
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Classes",
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/master/files/Classes",
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
function titleCase(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .split(/([\s\-\u2019'])+/)
    .map((part) =>
      /[\s\-\u2019']+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
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

async function fetchFirstExisting(urls: string[], dbgLabel?: string): Promise<string | null> {
  if (DEBUG) {
    // Limiter le spam: n’affiche que les 6 premières et le total
    console.debug("[classesContent] Try candidates", dbgLabel || "", {
      count: urls.length,
      firsts: urls.slice(0, 6),
    });
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        if (DEBUG) console.debug("[classesContent] OK:", url);
        return await res.text();
      } else {
        if (DEBUG) console.debug("[classesContent] 404:", url);
      }
    } catch (e) {
      if (DEBUG) console.debug("[classesContent] fetch error -> continue", url, e);
    }
  }
  if (DEBUG) console.debug("[classesContent] No match for", dbgLabel || "", "(tried:", urls.length, "urls)");
  return null;
}

/* ===========================================================
   Mappings classes & sous-classes (2024) — clés en minuscule sans accents
   Valeurs = Nom “canon app”. Résolution dossier plus bas.
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

const SUBCLASS_NAME_MAP: Record<string, string> = {
  // Barbare
  "voie de l arbre monde": "Voie de l’Arbre-Monde",
  "path of the world tree": "Voie de l’Arbre-Monde",
  "world tree": "Voie de l’Arbre-Monde",
  "world tree path": "Voie de l’Arbre-Monde",

  "voie du berserker": "Voie du Berserker",
  "berserker": "Voie du Berserker",
  "path of the berserker": "Voie du Berserker",

  "voie du coeur sauvage": "Voie du Cœur sauvage",
  "path of the wild heart": "Voie du Cœur sauvage",
  "wild heart": "Voie du Cœur sauvage",

  "voie du zelateur": "Voie du Zélateur",
  "path of the zealot": "Voie du Zélateur",
  "zealot": "Voie du Zélateur",

  // Barde
  "college de la danse": "Collège de la Danse",
  "college of dance": "Collège de la Danse",

  "college du savoir": "Collège du Savoir",
  "college of lore": "Collège du Savoir",
  "lore": "Collège du Savoir",

  "college de la seduction": "Collège de la Séduction",
  "college of glamour": "Collège de la Séduction",
  "glamour": "Collège de la Séduction",

  "college de la vaillance": "Collège de la Vaillance",
  "college of valor": "Collège de la Vaillance",
  "valor": "Collège de la Vaillance",

  // Clerc
  "domaine de la guerre": "Domaine de la Guerre",
  "war domain": "Domaine de la Guerre",

  "domaine de la lumiere": "Domaine de la Lumière",
  "light domain": "Domaine de la Lumière",

  "domaine de la ruse": "Domaine de la Ruse",
  "trickery domain": "Domaine de la Ruse",

  "domaine de la vie": "Domaine de la Vie",
  "life domain": "Domaine de la Vie",

  // Druide
  "cercle des astres": "Cercle des Astres",
  "circle of stars": "Cercle des Astres",
  "stars": "Cercle des Astres",

  "cercle de la lune": "Cercle de la Lune",
  "circle of the moon": "Cercle de la Lune",
  "moon": "Cercle de la Lune",

  "cercle des mers": "Cercle des Mers",
  "circle of the sea": "Cercle des Mers",
  "sea": "Cercle des Mers",

  "cercle de la terre": "Cercle de la Terre",
  "circle of the land": "Cercle de la Terre",
  "land": "Cercle de la Terre",

  // Ensorceleur
  "options de metamagie": "Options de Métamagie",

  "sorcellerie aberrante": "Sorcellerie aberrante",
  "aberrant sorcery": "Sorcellerie aberrante",
  "aberrant mind": "Sorcellerie aberrante",

  "sorcellerie arcanique": "Sorcellerie arcanique",
  "arcane sorcery": "Sorcellerie arcanique",

  "sorcellerie mecanique": "Sorcellerie mécanique",
  "clockwork sorcery": "Sorcellerie mécanique",
  "clockwork soul": "Sorcellerie mécanique",

  "sorcellerie sauvage": "Sorcellerie sauvage",
  "wild magic": "Sorcellerie sauvage",
  "wild sorcery": "Sorcellerie sauvage",

  // Guerrier
  "champion": "Champion",
  "champion fighter": "Champion",

  "chevalier occultiste": "Chevalier occultiste",
  "eldritch knight": "Chevalier occultiste",

  "maitre de guerre": "Maître de guerre",
  "battle master": "Maître de guerre",
  "battlemaster": "Maître de guerre",

  "soldat psi": "Soldat psi",
  "psi warrior": "Soldat psi",
  "psychic warrior": "Soldat psi",

  // Magicien
  "abjurateur": "Abjurateur",
  "abjuration": "Abjurateur",
  "school of abjuration": "Abjurateur",

  "evocation": "Évocation",
  "école d evocation": "Évocation",
  "school of evocation": "Évocation",

  "illusionniste": "Illusionniste",
  "illusion": "Illusionniste",
  "school of illusion": "Illusionniste",

  // Occultiste
  "options de manifestation occulte": "Options de Manifestation occulte",

  "protecteur archange": "Protecteur Archange",
  "the archfey": "Protecteur Archange",
  "archfey": "Protecteur Archange",

  "protecteur celeste": "Protecteur Céleste",
  "the celestial": "Protecteur Céleste",
  "celestial": "Protecteur Céleste",

  "protecteur felon": "Protecteur Félon",
  "the fiend": "Protecteur Félon",
  "fiend": "Protecteur Félon",

  "protecteur grand ancien": "Protecteur Grand Ancien",
  "the great old one": "Protecteur Grand Ancien",
  "great old one": "Protecteur Grand Ancien",
  "goo": "Protecteur Grand Ancien",

  // Paladin
  "serment des paladins": "Serment des Paladins",
  "oath of the paladins": "Serment des Paladins",

  "serment des anciens": "Serment des Anciens",
  "oath of the ancients": "Serment des Anciens",

  "serment de devotion": "Serment de Dévotion",
  "oath of devotion": "Serment de Dévotion",

  "serment de vengeance": "Serment de Vengeance",
  "oath of vengeance": "Serment de Vengeance",

  // Rôdeur
  "belluaire": "Belluaire",
  "beast master": "Belluaire",
  "beastmaster": "Belluaire",

  "chasseur": "Chasseur",
  "hunter": "Chasseur",

  "traqueur des tenebres": "Traqueur des ténèbres",
  "gloom stalker": "Traqueur des ténèbres",

  "vagabond feerique": "Vagabond féérique",
  "fey wanderer": "Vagabond féérique",

  // Roublard
  "ame aceree": "Âme acérée",
  "soulknife": "Âme acérée",

  "arnaqueur arcanique": "Arnaqueur arcanique",
  "arcane trickster": "Arnaqueur arcanique",

  "assassin": "Assassin",

  "voleur": "Voleur",
  "thief": "Voleur",
};

/* ===========================================================
   Mapping entrée -> noms app, puis résolution de dossiers dépôt
   =========================================================== */

function mapClassName(appClassName: string): string {
  const raw = normalizeName(appClassName);
  const key = lowerNoAccents(raw);
  return CLASS_NAME_MAP[key] ?? titleCase(raw);
}

function mapSubclassName(subclassName: string): string {
  const raw = normalizeName(subclassName);
  const key = lowerNoAccents(raw);
  return SUBCLASS_NAME_MAP[key] ?? titleCase(raw);
}

/**
 * Dossiers possibles pour une classe dans le dépôt.
 * Pour “Occultiste” on essaie aussi “Sorcier” et “Warlock”.
 */
function getClassFolderNames(appClassName: string): string[] {
  const primary = mapClassName(appClassName);
  const variants = [primary];
  const k = lowerNoAccents(primary);
  if (k === "occultiste") variants.push("Sorcier", "Warlock");
  return uniq(variants);
}

/**
 * Dossiers possibles pour les sous-classes: génériques + spécifiques par classe (fréquent en FR).
 */
function getSubclassDirNamesForClass(appClassName: string): string[] {
  const generic = ["Subclasses", "Sous-classes", "Sous classes", "SousClasses", "SubClasses", "Sous_Classes"];
  const k = lowerNoAccents(mapClassName(appClassName));
  const specific: string[] = [];
  if (k === "paladin") specific.push("Serments", "Serment");
  if (k === "clerc") specific.push("Domaines", "Domaines (Clerc)");
  if (k === "druide") specific.push("Cercles", "Cercle");
  if (k === "occultiste") specific.push("Protecteurs", "Patrons", "Pactes");
  if (k === "roublard") specific.push("Archetypes", "Archétypes");
  if (k === "guerrier") specific.push("Archetypes", "Archétypes");
  if (k === "barde") specific.push("Colleges", "Collèges");
  if (k === "rodeur" || k === "rôdeur") specific.push("Archetypes", "Archétypes");
  if (k === "magicien") specific.push("Ecoles", "Écoles");
  return uniq([...generic, ...specific]);
}

/**
 * Construit des variantes robustes pour un nom de sous-classe.
 */
function buildSubclassNameVariants(name: string): string[] {
  const base = normalizeName(name);
  const t = titleCase(base);
  const noParen = stripParentheses(base);
  const tNoParen = titleCase(noParen);
  const apos = normalizeApos(base);
  const aposT = titleCase(apos);

  // On conserve les diacritiques (les fichiers FR les utilisent généralement)
  return uniq([base, t, noParen, tNoParen, apos, aposT]);
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
      const cTitle = titleCase(c);
      candidates.push(
        urlJoin(folder, "README.md"),
        urlJoin(folder, "index.md"),
        urlJoin(folder, `${c}.md`),
        urlJoin(folder, `${cTitle}.md`),
        urlJoin(folder, `Classe - ${c}.md`),
        urlJoin(folder, `${c} - Classe.md`),
      );
    }
  }
  return fetchFirstExisting(candidates, `class:${className}`);
}

async function loadSubclassMarkdown(
  className: string,
  subclassName: string
): Promise<string | null> {
  const classFolders = getClassFolderNames(className);
  const subdirs = getSubclassDirNamesForClass(className);
  const nameVariants = buildSubclassNameVariants(mapSubclassName(subclassName));

  const dash = "-";
  const enDash = "–"; // \u2013
  const emDash = "—"; // \u2014

  const prefixes = ["Sous-classe", "Sous classe", "Subclass", "Sous-Classe"];

  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      for (const subdir of subdirs) {
        const baseSub = urlJoin(base, c, subdir);

        // 1) Fichier direct dans le dossier de sous-classes
        for (const nm of nameVariants) {
          candidates.push(
            urlJoin(baseSub, `${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${emDash} ${nm}.md`),
          );
        }

        // 2) Dossier de sous-classe + fichier interne
        const fileInside = ["README.md", "index.md"];
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
            for (const f of fileInside) {
              candidates.push(urlJoin(baseSub, sf, f));
            }
            // Essayer aussi un fichier “<nm>.md” dans le dossier
            candidates.push(urlJoin(baseSub, nm, `${nm}.md`));
          }
        }
      }

      // 3) Fallback à la racine de la classe (certains dépôts rangent des options ici)
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

export function canonicalizeClassName(input?: string | null): string {
  const key = lowerNoAccents(input || "");
  return CLASS_NAME_MAP[key] || titleCase(input || "");
}

export function canonicalizeSubclassName(classCanonical: string, input?: string | null): string {
  const sub = titleCase(input || "");
  if (!input) return sub;
  const key = lowerNoAccents(input);
  return SUBCLASS_NAME_MAP[key] || sub;
}

export async function loadClassSections(inputClass: string): Promise<AbilitySection[]> {
  const classFolders = getClassFolderNames(inputClass);
  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      const folder = urlJoin(base, c);
      const cTitle = titleCase(c);
      candidates.push(
        urlJoin(folder, "README.md"),
        urlJoin(folder, "index.md"),
        urlJoin(folder, `${c}.md`),
        urlJoin(folder, `${cTitle}.md`),
        urlJoin(folder, `Classe - ${c}.md`),
        urlJoin(folder, `${c} - Classe.md`),
      );
    }
  }

  const md = await getTextWithCache(candidates, `class:${inputClass}`);
  if (!md) return [];
  return parseMarkdownToSections(md, "class");
}

export async function loadSubclassSections(inputClass: string, inputSubclass: string): Promise<AbilitySection[]> {
  const classFolders = getClassFolderNames(inputClass);
  const subdirs = getSubclassDirNamesForClass(inputClass);
  const subclassCanonical = canonicalizeSubclassName(mapClassName(inputClass), inputSubclass);
  const nameVariants = buildSubclassNameVariants(subclassCanonical);

  const dash = "-";
  const enDash = "–";
  const emDash = "—";
  const prefixes = ["Sous-classe", "Sous classe", "Subclass", "Sous-Classe"];

  const candidates: string[] = [];

  for (const base of RAW_BASES) {
    for (const c of classFolders) {
      for (const subdir of subdirs) {
        const baseSub = urlJoin(base, c, subdir);

        // Fichiers directs
        for (const nm of nameVariants) {
          candidates.push(
            urlJoin(baseSub, `${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[0]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[1]} ${emDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${dash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${enDash} ${nm}.md`),
            urlJoin(baseSub, `${prefixes[2]} ${emDash} ${nm}.md`),
          );
        }

        // Dossiers
        const fileInside = ["README.md", "index.md"];
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
            for (const f of fileInside) {
              candidates.push(urlJoin(baseSub, sf, f));
            }
            candidates.push(urlJoin(baseSub, nm, `${nm}.md`));
          }
        }
      }

      // Fallback à la racine de la classe
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
   API rétro-compatible avec l’app (import { loadAbilitySections })
   =========================================================== */

export async function loadAbilitySections(params: {
  className: string;
  subclassName: string | null;
  characterLevel: number;
}): Promise<{ sections: AbilitySection[] }> {
  const { className, subclassName } = params;

  const out: AbilitySection[] = [];

  // Classe
  const classMd = await loadClassMarkdown(className);
  if (classMd) {
    const classSections = parseMarkdownToSections(classMd, "class");
    out.push(...classSections);
  }

  // Sous-classe (si fournie)
  if (subclassName && subclassName.trim().length > 0) {
    const subMd = await loadSubclassMarkdown(className, subclassName);
    if (subMd) {
      const subSections = parseMarkdownToSections(subMd, "subclass");
      out.push(...subSections);
    }
  }

  // Tri: niveau asc, class avant subclass, puis titre fr
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
  const canon = canonicalizeClassName(cls);
  return canon;
}

export function resetClassesContentCache(): void {
  textCache.clear();
}