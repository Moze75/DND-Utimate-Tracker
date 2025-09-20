import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, ScrollText, Sparkles, Loader2 } from 'lucide-react';
import type { Player } from '../types/dnd';

/**
 * Profil tab sans dépendances externes (pas de react-markdown/remark-gfm).
 * Affiche Race, Historique, Dons en parsant les fichiers Markdown distants par titres ###
 * et rend le contenu en “lite” (titres, listes à puces, paragraphes).
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
  const lines = md.split(/\r?\n/);
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

// Rendu lite du “markdown” (sans librairies)
function MarkdownLite({ content }: { content: string }) {
  // On convertit les lignes en paragraphes/listes/titres basiques
  const elements = useMemo(() => {
    const lines = content.split(/\r?\n/);
    const out: React.ReactNode[] = [];
    let listBuffer: string[] = [];

    const flushList = () => {
      if (listBuffer.length > 0) {
        out.push(
          <ul className="list-disc pl-5 space-y-1" key={`ul-${out.length}`}>
            {listBuffer.map((item, i) => (
              <li key={`li-${i}`}>{item}</li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Regrouper listes "- " ou "* "
      const mList = line.match(/^\s*[-*]\s+(.*)$/);
      if (mList) {
        listBuffer.push(mList[1]);
        continue;
      }

      // Si on quitte une liste, on flush
      if (!mList && listBuffer.length > 0 && line.trim() !== '') {
        flushList();
      }

      const h4 = line.match(/^\s*####\s+(.*)$/);
      if (h4) {
        flushList();
        out.push(
          <div className="font-semibold mt-3 mb-1" key={`h4-${out.length}`}>
            {h4[1]}
          </div>
        );
        continue;
      }

      const h3 = line.match(/^\s*###\s+(.*)$/);
      if (h3) {
        flushList();
        out.push(
          <div className="font-bold text-base mt-4 mb-2" key={`h3-${out.length}`}>
            {h3[1]}
          </div>
        );
        continue;
      }

      // Ligne vide -> espace vertical
      if (line.trim() === '') {
        flushList();
        out.push(<div className="h-2" key={`sp-${out.length}`} />);
        continue;
      }

      // Paragraphe simple
      out.push(
        <p className="mb-2 leading-relaxed" key={`p-${out.length}`}>
          {line}
        </p>
      );
    }
    // Fin: si une liste est en cours
    if (listBuffer.length > 0) flushList();

    return out;
  }, [content]);

  if (!content) return null;
  return <div className="prose prose-invert max-w-none">{elements}</div>;
}

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
            <div className="text-base font-semibold mb-2">{raceSection.title}</div>
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
            <div className="text-base font-semibold mb-2">{historiqueSection.title}</div>
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
                <div className="text-base font-semibold mt-1 mb-2">{item.name}</div>
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