import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, ScrollText, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import type { Player } from '../types/dnd';

/**
 * Profil tab sans dépendances externes.
 * - Encadrés: <!-- BOX --> ... <!-- /BOX -->, avec option titre: <!-- BOX: Mon titre -->
 * - Gras **texte** ; Italique _texte_
 * - Sous-titres: ligne entièrement en **gras** -> uppercase + tracking
 * - Listes (-, *, 1.) ; Citations (>)
 * - Sections repliables (Race / Historique / Dons)
 * - Nettoyage des crochets: [texte] => texte
 */

const RAW_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main';

const URLS = {
  races: `${RAW_BASE}/RACES/DESCRIPTION_DES_RACES.md`,
  historiques: `${RAW_BASE}/HISTORIQUES/HISTORIQUES.md`,
  donsOrigine: `${RAW_BASE}/DONS/DONS_D_ORIGINE.md`,
  donsGeneraux: `${RAW_BASE}/DONS/DONS_GENERAUX.md`,
  stylesCombat: `${RAW_BASE}/DONS/STYLES_DE_COMBAT.md`,
};

// Normalisation pour la correspondance
function normalizeKey(input: string): string {
  let s = input.normalize('NFC').trim();
  s = s.replace(/[\u2019\u2018\u2032]/g, "'"); // apostrophes typographiques -> '
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-'); // tirets variés -> -
  s = s.replace(/[\u00A0]/g, ' ').replace(/\s+/g, ' '); // espaces
  s = s.toLowerCase();
  return s;
}

// Parse le Markdown en sections par titres ### ...
function parseMarkdownByH3(md: string): Record<string, { title: string; content: string }> {
  const lines = md.split(/\r?\\n/);
  const result: Record<string, { title: string; content: string }> = {};
  let currentTitle: string | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      const normalized = normalizeKey(currentTitle);
      if (!result[normalized]) {
        result[normalized] = { title: currentTitle, content: currentBuffer.join('\n').trim() };
      } else {
        // eslint-disable-next-line no-console
        console.warn('[ProfilTab] Duplicate section title:', currentTitle);
      }
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentTitle = m[1];
      currentBuffer = [];
    } else if (currentTitle !== null) {
      currentBuffer.push(line);
    }
  }
  flush();
  return result;
}

type IndexCache = {
  content?: string;
  index?: Record<string, { title: string; content: string }>;
  error?: string;
  loading?: boolean;
};

function useMarkdownIndex(url: string) {
  const cacheRef = useRef<Record<string, IndexCache>>({});
  const [state, setState] = useState<IndexCache>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const cached = cacheRef.current[url];
      if (cached?.index && !cached.error) {
        setState({ ...cached, loading: false });
        return;
      }
      setState({ loading: true });
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const index = parseMarkdownByH3(text);
        const next: IndexCache = { content: text, index, loading: false };
        cacheRef.current[url] = next;
        if (!cancelled) setState(next);
      } catch (e: any) {
        const next: IndexCache = { error: e?.message || 'Fetch error', loading: false };
        cacheRef.current[url] = next;
        if (!cancelled) setState(next);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

/* ---------- Inline rendering ---------- */

// Nettoyage simple: retirer les crochets autour d'un segment [texte] -> texte
function stripBrackets(s: string): string {
  return s.replace(/\[([^\]]+)\]/g, '$1');
}

// Rendu gras+italique
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  const cleaned = stripBrackets(text);

  // 1) Découpe par **...** (gras)
  const boldRe = /\*\*(.+?)\*\*/g;
  const parts: Array<{ type: 'text' | 'bold'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = boldRe.exec(cleaned)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', value: cleaned.slice(last, m.index) });
    }
    parts.push({ type: 'bold', value: m[1] });
    last = boldRe.lastIndex;
  }
  if (last < cleaned.length) parts.push({ type: 'text', value: cleaned.slice(last) });

  // 2) Dans chaque segment, appliquer l'italique _..._
  const toItalicNodes = (str: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = [];
    const italicRe = /_(.+?)_/g;
    let idx = 0;
    let mm: RegExpExecArray | null;
    let cursor = 0;

    while ((mm = italicRe.exec(str)) !== null) {
      if (mm.index > cursor) {
        nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{str.slice(cursor, mm.index)}</span>);
      }
      nodes.push(
        <em key={`${keyPrefix}-i${idx++}`} className="italic">
          {mm[1]}
        </em>
      );
      cursor = italicRe.lastIndex;
    }
    if (cursor < str.length) nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{str.slice(cursor)}</span>);
    return nodes;
  };

  const out: React.ReactNode[] = [];
  let k = 0;
  for (const p of parts) {
    if (p.type === 'bold') {
      out.push(
        <strong key={`b-${k++}`} className="font-semibold">
          {toItalicNodes(p.value, `b${k}`)}
        </strong>
      );
    } else {
      out.push(<span key={`t-${k++}`}>{toItalicNodes(p.value, `t${k}`)}</span>);
    }
  }
  return out;
}

/* ---------- Block-level rendering ---------- */

function MarkdownLite({ content }: { content: string }) {
  const elements = useMemo(() => {
    const lines = content.split(/\r?\n/);
    const out: React.ReactNode[] = [];

    let ulBuffer: string[] = [];
    let olBuffer: string[] = [];
    let quoteBuffer: string[] = [];

    // Encadré via <!-- BOX --> ... <!-- /BOX -->
    let inBox = false;
    let boxBuffer: string[] = [];
    let boxTitle: string | null = null;

    const flushUL = () => {
      if (ulBuffer.length > 0) {
        out.push(
          <ul className="list-disc pl-5 space-y-1" key={`ul-${out.length}`}>
            {ulBuffer.map((item, i) => (
              <li key={`uli-${i}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        ulBuffer = [];
      }
    };
    const flushOL = () => {
      if (olBuffer.length > 0) {
        out.push(
          <ol className="list-decimal pl-5 space-y-1" key={`ol-${out.length}`}>
            {olBuffer.map((item, i) => (
              <li key={`oli-${i}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        olBuffer = [];
      }
    };
    const flushQuote = () => {
      if (quoteBuffer.length > 0) {
        const text = quoteBuffer.join(' ').trim();
        out.push(
          <blockquote
            key={`q-${out.length}`}
            className="border-l-2 border-white/20 pl-3 ml-1 italic text-gray-300 bg-white/5 rounded-sm py-1"
          >
            {renderInline(text)}
          </blockquote>
        );
        quoteBuffer = [];
      }
    };
    const flushAllBlocks = () => {
      flushQuote();
      flushUL();
      flushOL();
    };

    const flushBox = () => {
      if (!boxBuffer.length) return;
      const inner = boxBuffer.join('\n');
      out.push(
        <div key={`box-${out.length}`} className="rounded-lg border border-white/15 bg-white/5 p-3">
          {boxTitle && (
            <div className="font-semibold uppercase tracking-wide text-[0.85rem] text-gray-200 mb-2">
              {renderInline(boxTitle)}
            </div>
          )}
          <MarkdownLite content={inner} />
        </div>
      );
      boxBuffer = [];
      boxTitle = null;
    };

    // Regex pour les balises de boîte
    const openBoxRe = /^\s*<!--\s*BOX(?:\s*:\s*(.*?))?\s*-->\s*$/; // capture éventuel titre
    const closeBoxRe = /^\s*<!--\s*\/\s*BOX\s*-->\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      // Gestion encadré: fermeture
      if (inBox) {
        if (closeBoxRe.test(raw)) {
          inBox = false;
          flushBox();
          continue;
        }
        boxBuffer.push(raw);
        continue;
      }

      // Ouverture encadré
      const open = raw.match(openBoxRe);
      if (open) {
        flushAllBlocks();
        inBox = true;
        boxBuffer = [];
        boxTitle = (open[1] || '').trim() || null;
        continue;
      }

      // Listes à puces
      const mUL = raw.match(/^\s*[-*]\s+(.*)$/);
      if (mUL) {
        flushQuote();
        flushOL();
        ulBuffer.push(mUL[1]);
        continue;
      }

      // Listes numérotées
      const mOL = raw.match(/^\s*\d+[.)]\s+(.*)$/);
      if (mOL) {
        flushQuote();
        flushUL();
        olBuffer.push(mOL[1]);
        continue;
      }

      // Citations
      const mQ = raw.match(/^\s*>\s+(.*)$/);
      if (mQ) {
        flushUL();
        flushOL();
        quoteBuffer.push(mQ[1]);
        continue;
      }

      // sortie de blocs
      if ((ulBuffer.length || olBuffer.length || quoteBuffer.length) && raw.trim() !== '') {
        flushAllBlocks();
      }

      // Sous-titres ####
      const h4 = raw.match(/^\s*####\s+(.*)$/);
      if (h4) {
        out.push(
          <div className="font-semibold mt-3 mb-1 tracking-wide" key={`h4-${out.length}`}>
            {renderInline(h4[1])}
          </div>
        );
        continue;
      }

      // Titres ### (internes)
      const h3 = raw.match(/^\s*###\s+(.*)$/);
      if (h3) {
        out.push(
          <div className="font-bold text-base mt-4 mb-2" key={`h3-${out.length}`}>
            {renderInline(h3[1])}
          </div>
        );
        continue;
      }

      // Ligne entièrement en **gras** => sous-titre stylé
      const fullBold = raw.match(/^\s*\*\*(.+?)\*\*\s*$/);
      if (fullBold) {
        out.push(
          <div className="mt-3 mb-2 uppercase tracking-wide text-[0.95rem] text-gray-200" key={`sub-${out.length}`}>
            {renderInline(fullBold[1])}
          </div>
        );
        continue;
      }

      // Ligne vide -> espace vertical
      if (raw.trim() === '') {
        flushAllBlocks();
        out.push(<div className="h-2" key={`sp-${out.length}`} />);
        continue;
      }

      // Paragraphe "Label: valeur"
      const labelMatch = raw.match(/^([\p{L}\p{N}'’ .\-\/+()]+?)\s*:\s+(.*)$/u);
      if (labelMatch) {
        out.push(
          <p className="mb-2 leading-relaxed" key={`kv-${out.length}`}>
            <span className="font-semibold">{labelMatch[1]}: </span>
            {renderInline(labelMatch[2])}
          </p>
        );
        continue;
      }

      // Paragraphe simple
      out.push(
        <p className="mb-2 leading-relaxed" key={`p-${out.length}`}>
          {renderInline(raw)}
        </p>
      );
    }

    // Fin: flush des blocs restants
    flushAllBlocks();
    if (inBox) {
      // Si fermeture manquante, on ferme proprement
      inBox = false;
      flushBox();
    }

    return out;
  }, [content]);

  if (!content) return null;
  return <div className="prose prose-invert max-w-none">{elements}</div>;
}

/* ---------- UI ---------- */

function SectionContainer(props: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="stat-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="stat-header w-full flex items-center justify-between gap-3 cursor-pointer"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {props.icon}
          <h3 className="text-lg font-semibold text-gray-100">{props.title}</h3>
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'} text-gray-300`}
        />
      </button>
      {open && <div className="p-4">{props.children}</div>}
    </div>
  );
}

function LoadingInline() {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <Loader2 className="animate-spin" size={16} /> Chargement…
    </div>
  );
}

function NotFound({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-sm text-gray-400">
      {value ? (
        <>
          {label} “{value}” introuvable dans la source.
        </>
      ) : (
        <>Aucune sélection.</>
      )}
    </div>
  );
}

export interface PlayerProfileProfileTabProps {
  player: Player;
}

export default function PlayerProfileProfileTab({ player }: PlayerProfileProfileTabProps) {
  // Sélections
  const race = player.race || '';
  const historique = (player.background as string) || '';

  // Dons (adapter si nécessaire selon ton type Player)
  const feats: any = (player.stats as any)?.feats || {};
  const originFeats: string[] = Array.isArray(feats.origins)
    ? feats.origins
    : typeof feats.origin === 'string' && feats.origin
    ? [feats.origin]
    : [];
  const generalFeats: string[] = Array.isArray(feats.generals) ? feats.generals : [];
  const styleFeats: string[] = Array.isArray(feats.styles) ? feats.styles : [];

  // Index des sources distantes
  const racesIdx = useMarkdownIndex(URLS.races);
  const histIdx = useMarkdownIndex(URLS.historiques);
  const donsOrigIdx = useMarkdownIndex(URLS.donsOrigine);
  const donsGenIdx = useMarkdownIndex(URLS.donsGeneraux);
  const stylesIdx = useMarkdownIndex(URLS.stylesCombat);

  // Recherche d’une section par nom choisi
  const findSection = (
    idx: IndexCache,
    name: string | undefined | null
  ): { title: string; content: string } | null => {
    if (!name || !idx.index) return null;
    const key = normalizeKey(name);
    const hit = idx.index[key];
    return hit || null;
  };

  const raceSection = useMemo(() => findSection(racesIdx, race), [racesIdx, race]);
  const historiqueSection = useMemo(() => findSection(histIdx, historique), [histIdx, historique]);

  type DonItem = {
    name: string;
    hit: { title: string; content: string } | null;
    kind: 'origine' | 'general' | 'style';
  };

  const donsList: DonItem[] = useMemo(() => {
    const out: DonItem[] = [];
    for (const n of originFeats) out.push({ name: n, hit: findSection(donsOrigIdx, n), kind: 'origine' });
    for (const n of generalFeats) out.push({ name: n, hit: findSection(donsGenIdx, n), kind: 'general' });
    for (const n of styleFeats) out.push({ name: n, hit: findSection(stylesIdx, n), kind: 'style' });
    return out;
  }, [originFeats, generalFeats, styleFeats, donsOrigIdx, donsGenIdx, stylesIdx]);

  return (
    <div className="space-y-6">
      {/* Race */}
      <SectionContainer icon={<Shield size={18} className="text-emerald-400" />} title="Race">
        {racesIdx.loading ? (
          <LoadingInline />
        ) : racesIdx.error ? (
          <div className="text-sm text-red-400">Erreur de chargement des races: {racesIdx.error}</div>
        ) : raceSection ? (
          <>
            <div className="text-base font-semibold mb-2">{renderInline(raceSection.title)}</div>
            <MarkdownLite content={raceSection.content} />
          </>
        ) : (
          <NotFound label="Race" value={race} />
        )}
      </SectionContainer>

      {/* Historique */}
      <SectionContainer icon={<ScrollText size={18} className="text-sky-400" />} title="Historique">
        {histIdx.loading ? (
          <LoadingInline />
        ) : histIdx.error ? (
          <div className="text-sm text-red-400">Erreur de chargement des historiques: {histIdx.error}</div>
        ) : historiqueSection ? (
          <>
            <div className="text-base font-semibold mb-2">{renderInline(historiqueSection.title)}</div>
            <MarkdownLite content={historiqueSection.content} />
          </>
        ) : (
          <NotFound label="Historique" value={historique} />
        )}
      </SectionContainer>

      {/* Dons */}
      <SectionContainer icon={<Sparkles size={18} className="text-amber-400" />} title="Dons">
        {(donsOrigIdx.loading || donsGenIdx.loading || stylesIdx.loading) && <LoadingInline />}
        {(donsOrigIdx.error || donsGenIdx.error || stylesIdx.error) && (
          <div className="text-sm text-red-400 space-y-1">
            {donsOrigIdx.error && <div>Erreur Dons d’origine: {donsOrigIdx.error}</div>}
            {donsGenIdx.error && <div>Erreur Dons généraux: {donsGenIdx.error}</div>}
            {stylesIdx.error && <div>Erreur Styles de combat: {stylesIdx.error}</div>}
          </div>
        )}

        {donsList.length === 0 ? (
          <NotFound label="Don" value={undefined} />
        ) : (
          <div className="space-y-6">
            {donsList.map((item, i) => (
              <div key={`${item.kind}-${item.name}-${i}`} className="border border-white/10 rounded-lg p-3 bg-gray-800/40">
                <div className="text-sm uppercase tracking-wide text-gray-400">
                  {item.kind === 'origine' ? 'Don d’origine' : item.kind === 'general' ? 'Don général' : 'Style de combat'}
                </div>
                <div className="text-base font-semibold mt-1 mb-2">{renderInline(item.name)}</div>
                {item.hit ? (
                  <MarkdownLite content={item.hit.content} />
                ) : (
                  <div className="text-sm text-gray-400">Non trouvé dans la source distante.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionContainer>
    </div>
  );
}