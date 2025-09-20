import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, ScrollText, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Player } from '../types/dnd';

/**
 * Profil tab: renders Race, Historique, Dons by parsing remote markdown files.
 *
 * Parsing rules:
 * - Sections start with a heading line "### <TITLE>"
 * - Titles are normalized for matching (NFC, case-insensitive, spaces collapsed, apostrophes and hyphens unified).
 * - We keep accents and punctuation for display; normalization is for matching only.
 * - Duplicate titles in a same source are logged and the first occurrence is kept.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main';

const URLS = {
  races: `${RAW_BASE}/RACES/DESCRIPTION_DES_RACES.md`,
  historiques: `${RAW_BASE}/HISTORIQUES/HISTORIQUES.md`,
  donsOrigine: `${RAW_BASE}/DONS/DONS_D_ORIGINE.md`,
  donsGeneraux: `${RAW_BASE}/DONS/DONS_GENERAUX.md`,
  stylesCombat: `${RAW_BASE}/DONS/STYLES_DE_COMBAT.md`,
};

// Unicode helpers: normalize text for matching
function normalizeKey(input: string): string {
  // NFC normalization
  let s = input.normalize('NFC').trim();

  // unify apostrophes and quotes
  s = s.replace(/[\u2019\u2018\u2032]/g, "'"); // ’ ‘ ′ -> '
  // unify hyphens/dashes to ASCII hyphen-minus
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-'); // hyphen, non-breaking hyphen, figure dash, en dash, em dash, minus

  // collapse multiple spaces (including non-breaking)
  s = s.replace(/[\u00A0]/g, ' ').replace(/\s+/g, ' ');

  // case-insensitive compare -> use lower
  s = s.toLowerCase();

  return s;
}

// Parse a markdown file into a map: normalizedTitle -> { title, content }
function parseMarkdownByH3(md: string): Record<string, { title: string; content: string }> {
  const lines = md.split(/\r?\n/);
  const result: Record<string, { title: string; content: string }> = {};
  let currentTitle: string | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      const normalized = normalizeKey(currentTitle);
      if (result[normalized]) {
        // Duplicate heading detected; keep the first, warn once.
        // You may decide to merge instead.
        // eslint-disable-next-line no-console
        console.warn('[ProfilTab] Duplicate section title:', currentTitle);
      } else {
        result[normalized] = { title: currentTitle, content: currentBuffer.join('\n').trim() };
      }
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      // new section
      flush();
      currentTitle = m[1];
      currentBuffer = [];
    } else {
      if (currentTitle !== null) currentBuffer.push(line);
    }
  }
  // last section
  flush();

  return result;
}

// Simple in-memory cache for fetched markdown
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

// Render helpers
function SectionContainer(props: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-header flex items-center gap-2">
        {props.icon}
        <h3 className="text-lg font-semibold text-gray-100">{props.title}</h3>
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
  // Selections from player
  const race = player.race || '';
  const historique = (player.background as string) || '';

  // Feats
  const feats: any = (player.stats as any)?.feats || {};
  const originFeats: string[] = Array.isArray(feats.origins)
    ? feats.origins
    : typeof feats.origin === 'string' && feats.origin
    ? [feats.origin]
    : [];
  const generalFeats: string[] = Array.isArray(feats.generals) ? feats.generals : [];
  const styleFeats: string[] = Array.isArray(feats.styles) ? feats.styles : [];

  // Indexes
  const racesIdx = useMarkdownIndex(URLS.races);
  const histIdx = useMarkdownIndex(URLS.historiques);
  const donsOrigIdx = useMarkdownIndex(URLS.donsOrigine);
  const donsGenIdx = useMarkdownIndex(URLS.donsGeneraux);
  const stylesIdx = useMarkdownIndex(URLS.stylesCombat);

  // Lookup helpers with normalization (preserve display name)
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

  // Dons: build list of {source, name, hit}
  type DonItem = { name: string; hit: { title: string; content: string } | null; kind: 'origine' | 'general' | 'style' };
  const donsList: DonItem[] = useMemo(() => {
    const out: DonItem[] = [];
    // Origins
    for (const n of originFeats) {
      out.push({ name: n, hit: findSection(donsOrigIdx, n), kind: 'origine' });
    }
    // Generals
    for (const n of generalFeats) {
      out.push({ name: n, hit: findSection(donsGenIdx, n), kind: 'general' });
    }
    // Styles
    for (const n of styleFeats) {
      out.push({ name: n, hit: findSection(stylesIdx, n), kind: 'style' });
    }
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
            <div className="text-base font-semibold mb-2">{raceSection.title}</div>
            <MarkdownBlock content={raceSection.content} />
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
            <div className="text-base font-semibold mb-2">{historiqueSection.title}</div>
            <MarkdownBlock content={historiqueSection.content} />
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
                <div className="text-base font-semibold mt-1 mb-2">{item.name}</div>
                {item.hit ? (
                  <MarkdownBlock content={item.hit.content} />
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