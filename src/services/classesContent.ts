/* Service de chargement et parsing des contenus de classes/sous-classes
   Hypothèses:
   - Les blocs à afficher sont marqués dans les .md par des titres "###" de la forme:
       "### Niveau 3 - Attaque supplémentaire"
     Variantes aussi acceptées: ":", "–", "—", ou sans titre après le niveau.
   - Le contenu d’un bloc est tout ce qui suit ce titre jusqu’au prochain "###".
   - Les fichiers attendus dans les dossiers sont l’un des suivants (par ordre de tentative):
       README.md, index.md, <Nom>.md (avec essais de casse Title Case).
   - Les sous-classes peuvent être:
       a) un fichier direct dans Subclasses/ (p.ex. "Sous-classe - X.md", "X.md"),
       b) un dossier Subclasses/<dossier> contenant un README.md ou <Nom>.md.
*/

export type AbilitySection = {
  level: number;
  title: string;
  content: string;
  origin: "class" | "subclass";
};

const RAW_BASE =
  "https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Classes";

// Harmonisation des noms (insensible à la casse)
const CLASS_NAME_MAP: Record<string, string> = {
  "ensorceleur": "Ensorceleur",
  "moine": "Moine",
  // ajoute ici d’autres classes si besoin
};

// Normalisation simple: sans accents
function stripDiacritics(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const SUBCLASS_NAME_MAP: Record<string, string> = {
  // clé en minuscules -> nom exact utilisé dans les fichiers/dossiers

  // Ensorceleur
  "magie draconique": "Sorcellerie draconique",
  "sorcellerie draconique": "Sorcellerie draconique",

  // Moine — Credo de la paume (alias FR/EN)
  "credo de la paume": "Credo de la paume",
  "crédo de la paume": "Credo de la paume",
  "voie de la paume": "Credo de la paume",
  "voie de la main ouverte": "Credo de la paume",
  "way of the open hand": "Credo de la paume",
  "open hand": "Credo de la paume",
};

function normalizeName(name: string): string {
  return (name || "").trim();
}

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/([\s\-’']+)/) // conserver séparateurs
    .map((part) => (/[\s\-’']+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function mapClassName(appClassName: string): string {
  const key = normalizeName(appClassName).toLowerCase();
  return CLASS_NAME_MAP[key] ?? normalizeName(appClassName);
}

function mapSubclassName(subclassName: string): string {
  const raw = normalizeName(subclassName);
  const key = raw.toLowerCase();
  const keyNoAcc = stripDiacritics(key);
  return SUBCLASS_NAME_MAP[key] ?? SUBCLASS_NAME_MAP[keyNoAcc] ?? raw;
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

async function loadClassMarkdown(className: string): Promise<string | null> {
  const c = mapClassName(className);
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
  const sBase = mapSubclassName(subclassName); // ex: "Credo de la paume"
  const sTitle = titleCase(sBase);            // ex: "Credo De La Paume"

  const baseSub = urlJoin(RAW_BASE, c, "Subclasses");

  // 1) CAS FICHIER DIRECT (ex: "Sous-classe - Sorcellerie draconique.md" ou "Sorcellerie draconique.md")
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

  // 2) CAS DOSSIER + FICHIER INTERNE
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

  return null;
}

function parseMarkdownToSections(mdText: string, origin: "class" | "subclass"): AbilitySection[] {
  const lines = mdText.replace(/\r\n/g, "\n").split("\n");

  const sections: AbilitySection[] = [];
  let currentTitle: string | null = null;
  let currentLevel: number | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (typeof currentLevel === "number") {
      const title = currentTitle && currentTitle.trim().length > 0 ? currentTitle.trim() : `Capacité de niveau ${currentLevel}`;
      const content = currentBuffer.join("\n").trim();
      sections.push({
        level: currentLevel,
        title,
        content,
        origin,
      });
    }
    currentTitle = null;
    currentLevel = null;
    currentBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimRight();

    // Détection d’un titre de section (### ... )
    const h3Match = line.match(/^###\s+(.+)\s*$/);
    if (h3Match) {
      // Nouveau bloc => flush précédent
      flush();

      const heading = h3Match[1].trim();
      // Accepte séparateurs -, –, —, : ou rien après le niveau
      const m =
        heading.match(/^Niveau\s+(\d+)\s*(?:[-–—:]\s*(.+))?$/i) ||
        heading.match(/^Niv\.\s*(\d+)\s*(?:[-–—:]\s*(.+))?$/i) ||
        heading.match(/^NIVEAU\s+(\d+)\s*(?:[-–—:]\s*(.+))?$/); // tolère "NIVEAU" explicite

      if (m) {
        currentLevel = parseInt(m[1], 10);
        currentTitle = m[2] ? m[2].trim() : "";
      } else {
        // Titre non conforme => on ignore ce bloc
        currentLevel = null;
        currentTitle = null;
      }
      continue;
    }

    // Sinon, accumuler dans le contenu courant si on est dans un bloc valide
    if (typeof currentLevel === "number") {
      currentBuffer.push(raw);
    }
  }

  // Dernier flush
  flush();

  return sections;
}

export async function loadAbilitySections(options: {
  className: string;
  subclassName?: string | null;
  characterLevel: number;
}): Promise<{
  sections: AbilitySection[];
  filtered: Map<number, AbilitySection[]>;
  hadClassContent: boolean;
  hadSubclassContent: boolean;
}> {
  const classText = await loadClassMarkdown(options.className);
  const subclassText =
    options.subclassName ? await loadSubclassMarkdown(options.className, options.subclassName) : null;

  const classSections = classText ? parseMarkdownToSections(classText, "class") : [];
  const subclassSections = subclassText ? parseMarkdownToSections(subclassText, "subclass") : [];

  // Fusion, tri par niveau puis par titre
  const all = [...classSections, ...subclassSections].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.title.localeCompare(b.title, "fr");
  });

  // Filtrage par niveau du personnage
  const filtered = new Map<number, AbilitySection[]>();
  for (const s of all) {
    if (s.level <= options.characterLevel) {
      if (!filtered.has(s.level)) filtered.set(s.level, []);
      filtered.get(s.level)!.push(s);
    }
  }

  return {
    sections: all,
    filtered,
    hadClassContent: !!classText,
    hadSubclassContent: !!subclassText,
  };
}