/* Service de chargement et parsing des contenus de classes/sous-classes pour l’app
   Aligné avec la nomenclature “règles 2024”.

   Hypothèses & règles:
   - Structures de dépôts (Ultimate_Tracker):
       RAW_BASE/Classes/<Classe>/(README.md|index.md|<Classe>.md|<ClasseTitle>.md)
       RAW_BASE/Classes/<Classe>/Subclasses/(“Sous-classe - <Nom>.md” | “<Nom>.md” | dossier "<Nom>" contenant README.md/index.md)
   - On tolère autant que possible les variantes d'écriture (accents, apostrophes, casse) via des maps.
   - On crée des “sections” à partir des titres Markdown ###. Si un niveau (Niveau X / Niv. X / Level X) est détecté, il est saisi;
     sinon, on affecte level=0 (toujours affiché dans l’UI).
*/

export type AbilitySection = {
  level: number;            // 0 = sans niveau explicite, affiché tout le temps
  title: string;            // titre parsé après nettoyage
  content: string;          // contenu Markdown du bloc
  origin: "class" | "subclass";
};

const RAW_BASE =
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Classes";

/* ===========================================================
   Normalisation & helpers
   =========================================================== */

function stripDiacritics(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(name: string): string {
  return (name || "").trim();
}

function lowerNoAccents(s: string): string {
  return stripDiacritics((s || "").toLowerCase());
}

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/([\s\-\u2019']+)/) // conserver séparateurs
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
      const res = await fetch(url, { cache: "no-cache" });
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
   Mappings classes & sous-classes (2024) — clés en minuscule sans accents
   Valeurs = Nom exact utilisé dans le dépôt (dossier/fichier)
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
  "pretres": "Clerc",
  "pretresse": "Clerc",

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
  "voleur": "Roublard",
  "rogue": "Roublard",
  "thief": "Roublard",

  // Occultiste (Warlock) : alias “Sorcier”
  "occultiste": "Occultiste",
  "warlock": "Occultiste",
  "sorcier": "Occultiste",
};

// Sous-classes (fichier/dossier) — clés normalisées (minuscules, sans accents)
const SUBCLASS_NAME_MAP: Record<string, string> = {
  /* ============================
   * Barbare – 2024
   * ============================ */
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

  /* ============================
   * Barde – 2024
   * ============================ */
  "college de la danse": "Collège de la Danse",
  "college of dance": "Collège de la Danse",

  "college du savoir": "Collège du Savoir",
  "college of lore": "Collège du Savoir",
  "lore": "Collège du Savoir",

  // Séduction ~ Glamour (2017) — choix 2024: “Séduction”
  "college de la seduction": "Collège de la Séduction",
  "college of glamour": "Collège de la Séduction",
  "glamour": "Collège de la Séduction",

  "college de la vaillance": "Collège de la Vaillance",
  "college of valor": "Collège de la Vaillance",
  "valor": "Collège de la Vaillance",

  /* ============================
   * Clerc – 2024
   * ============================ */
  "domaine de la guerre": "Domaine de la Guerre",
  "war domain": "Domaine de la Guerre",

  "domaine de la lumiere": "Domaine de la Lumière",
  "light domain": "Domaine de la Lumière",

  "domaine de la ruse": "Domaine de la Ruse",
  "trickery domain": "Domaine de la Ruse",

  "domaine de la vie": "Domaine de la Vie",
  "life domain": "Domaine de la Vie",

  /* ============================
   * Druide – 2024
   * ============================ */
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

  /* ============================
   * Ensorceleur – 2024
   * (Options != sous-classe, mais on tente un chargement direct)
   * ============================ */
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

  /* ============================
   * Guerrier – 2024
   * ============================ */
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

  /* ============================
   * Magicien – 2024
   * ============================ */
  "abjurateur": "Abjurateur",
  "abjuration": "Abjurateur",
  "school of abjuration": "Abjurateur",

  "evocation": "Évocation",
  "école d evocation": "Évocation",
  "school of evocation": "Évocation",

  "illusionniste": "Illusionniste",
  "illusion": "Illusionniste",
  "school of illusion": "Illusionniste",

  /* ============================
   * Moine – 2024
   * ============================ */
  "credo des elements": "Crédo des Éléments",
  "warrior of the elements": "Crédo des Éléments",
  "way of the four elements": "Crédo des Éléments",

  "credo de la misericorde": "Crédo de la Miséricorde",
  "way of mercy": "Crédo de la Miséricorde",

  "credo de l ombre": "Crédo de l’Ombre",
  "way of shadow": "Crédo de l’Ombre",
  "shadow": "Crédo de l’Ombre",

  "credo de la paume": "Crédo de la Paume",
  "voie de la paume": "Crédo de la Paume",
  "voie de la main ouverte": "Crédo de la Paume",
  "way of the open hand": "Crédo de la Paume",
  "open hand": "Crédo de la Paume",

  /* ============================
   * Occultiste (Warlock) – 2024
   * (Options != sous-classe, tentative directe)
   * ============================ */
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

  /* ============================
   * Paladin – 2024
   * ============================ */
  "serment des paladins": "Serment des Paladins",
  "oath of the paladins": "Serment des Paladins",

  "serment des anciens": "Serment des Anciens",
  "oath of the ancients": "Serment des Anciens",

  "serment de devotion": "Serment de Dévotion",
  "oath of devotion": "Serment de Dévotion",

  "serment de vengeance": "Serment de Vengeance",
  "oath of vengeance": "Serment de Vengeance",

  /* ============================
   * Rôdeur – 2024
   * ============================ */
  "belluaire": "Belluaire",
  "beast master": "Belluaire",
  "beastmaster": "Belluaire",

  "chasseur": "Chasseur",
  "hunter": "Chasseur",

  "traqueur des tenebres": "Traqueur des ténèbres",
  "gloom stalker": "Traqueur des ténèbres",

  "vagabond feerique": "Vagabond féérique",
  "fey wanderer": "Vagabond féérique",

  /* ============================
   * Roublard – 2024
   * ============================ */
  "ame aceree": "Âme acérée",
  "soulknife": "Âme acérée",

  "arnaqueur arcanique": "Arnaqueur arcanique",
  "arcane trickster": "Arnaqueur arcanique",

  "assassin": "Assassin",

  "voleur": "Voleur",
  "thief": "Voleur",
};

/* ===========================================================
   Mapping des noms en entrée (App) vers noms exacts (dépôt)
   =========================================================== */

function mapClassName(appClassName: string): string {
  const raw = normalizeName(appClassName);
  const key = lowerNoAccents(raw);
  return CLASS_NAME_MAP[key] ?? raw;
}

function mapSubclassName(subclassName: string): string {
  const raw = normalizeName(subclassName);
  const key = lowerNoAccents(raw);
  return SUBCLASS_NAME_MAP[key] ?? raw;
}

/* ===========================================================
   Chargement markdown: classe et sous-classe
   =========================================================== */

async function loadClassMarkdown(className: string): Promise<string | null> {
  const c = mapClassName(className); // ex: "Ensorceleur"
  const folder = urlJoin(RAW_BASE, c);
  const cTitle = titleCase(c);

  const candidates = [
    urlJoin(folder, "README.md"),
    urlJoin(folder, "index.md"),
    urlJoin(folder, `${c}.md`),
    urlJoin(folder, `${cTitle}.md`),
  ];
  return fetchFirstExisting(candidates);
}

async function loadSubclassMarkdown(
  className: string,
  subclassName: string
): Promise<string | null> {
  const c = mapClassName(className);
  const sBase = mapSubclassName(subclassName); // ex: "Sorcellerie mécanique"
  const sTitle = titleCase(sBase);             // ex: "Sorcellerie Mécanique"

  const baseSub = urlJoin(RAW_BASE, c, "Subclasses");

  // 1) CAS FICHIER DIRECT DANS Subclasses (avec ou sans préfixe "Sous-classe - ")
  const dash = "-";
  const enDash = "–"; // \u2013
  const emDash = "—"; // \u2014
  const directFileCandidates = [
    urlJoin(baseSub, `Sous-classe ${dash} ${sBase}.md`),
    urlJoin(baseSub, `Sous-classe ${dash} ${sTitle}.md`),
    urlJoin(baseSub, `Sous-classe ${enDash} ${sBase}.md`),
    urlJoin(baseSub, `Sous-classe ${enDash} ${sTitle}.md`),
    urlJoin(baseSub, `Sous-classe ${emDash} ${sBase}.md`),
    urlJoin(baseSub, `Sous-classe ${emDash} ${sTitle}.md`),
    urlJoin(baseSub, `${sBase}.md`),
    urlJoin(baseSub, `${sTitle}.md`),
  ];
  const direct = await fetchFirstExisting(directFileCandidates);
  if (direct) return direct;

  // 2) CAS DOSSIER Subclasses/<Nom> + fichier interne (README/index/<Nom>.md)
  const subFolderCandidates = [
    urlJoin(baseSub, `Sous-classe ${dash} ${sBase}`),
    urlJoin(baseSub, `Sous-classe ${dash} ${sTitle}`),
    urlJoin(baseSub, `Sous-classe ${enDash} ${sBase}`),
    urlJoin(baseSub, `Sous-classe ${enDash} ${sTitle}`),
    urlJoin(baseSub, `Sous-classe ${emDash} ${sBase}`),
    urlJoin(baseSub, `Sous-classe ${emDash} ${sTitle}`),
    urlJoin(baseSub, sBase),
    urlJoin(baseSub, sTitle),
  ];
  const fileCandidatesInside = ["README.md", "index.md", `${sBase}.md`, `${sTitle}.md`];

  for (const subFolder of subFolderCandidates) {
    const urls = fileCandidatesInside.map((f) => urlJoin(subFolder, f));
    const text = await fetchFirstExisting(urls);
    if (text) return text;
  }

  // 3) FALLBACK: certains contenus “options …” peuvent être à la racine de la classe
  const classFolderFallback = urlJoin(RAW_BASE, c);
  const classLevelFiles = [
    urlJoin(classFolderFallback, `${sBase}.md`),
    urlJoin(classFolderFallback, `${sTitle}.md`),
  ];
  const fallbackText = await fetchFirstExisting(classLevelFiles);
  if (fallbackText) return fallbackText;

  return null;
}

/* ===========================================================
   Parser markdown -> sections (### titres)
   - Détecte “Niveau X”, “Niv. X”, “Level X” → level
   - Sinon level=0
   - Le titre est nettoyé des préfixes “Niveau … -”
   =========================================================== */

function parseMarkdownToSections(mdText: string, origin: "class" | "subclass"): AbilitySection[] {
  const lines = (mdText || "").replace(/\r\n/g, "\n").split("\n");

  const sections: AbilitySection[] = [];
  let currentTitle: string | null = null;
  let currentLevel: number = 0;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentTitle && buffer.join("").trim() === "") return;
    sections.push({
      level: Number.isFinite(currentLevel) ? currentLevel : 0,
      title: currentTitle || "Aptitudes",
      content: buffer.join("\n").trim(),
      origin,
    });
    currentTitle = null;
    currentLevel = 0;
    buffer = [];
  };

  const parseHeading = (raw: string) => {
    const text = raw.replace(/^#+\s*/, "").trim();

    // Tenter d’extraire le niveau
    // Ex: "Niveau 3 - Truc", "Niv. 5: Machin", "Level 2 — Bidule"
    const levelMatch =
      text.match(/\b(?:niveau|niv\.?|level)\s+(\d+)\b/i) || text.match(/\b(\d+)\b/);

    const lvl = levelMatch ? parseInt(levelMatch[1], 10) : 0;

    // Nettoyer le titre en retirant le préfixe “Niveau X -/–/—/:”
    let title = text
      .replace(/\b(?:niveau|niv\.?|level)\s+\d+\s*[-–—:]?\s*/i, "")
      .trim();

    if (!title) {
      // Si aucun titre évident, garder le texte source sans le marqueur
      title = text;
    }

    return { lvl: Number.isFinite(lvl) ? lvl : 0, title };
  };

  for (const line of lines) {
    if (/^\s*###\s+/.test(line)) {
      // nouveau bloc
      if (buffer.length > 0 || currentTitle !== null) {
        flush();
      }
      const { lvl, title } = parseHeading(line);
      currentLevel = lvl;
      currentTitle = title || `Aptitude (Niv. ${lvl || 0})`;
    } else {
      buffer.push(line);
    }
  }

  // Dernier bloc
  flush();

  // Nettoyage: supprimer sections vides (sans contenu et sans titre utile)
  return sections.filter(
    (s) => (s.content && s.content.trim().length > 0) || (s.title && s.title.trim().length > 0)
  );
}

/* ===========================================================
   API publique
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

  // Tri par niveau croissant, puis par origine (class avant subclass à niveau égal)
  out.sort((a, b) => {
    const la = Number(a.level) || 0;
    const lb = Number(b.level) || 0;
    if (la !== lb) return la - lb;
    if (a.origin !== b.origin) return a.origin === "class" ? -1 : 1;
    return a.title.localeCompare(b.title, "fr");
  });

  return { sections: out };
}