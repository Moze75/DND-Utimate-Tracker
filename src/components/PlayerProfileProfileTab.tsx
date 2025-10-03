import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, ScrollText, Sparkles, Loader2, ChevronDown, Check, Sword, Wrench } from 'lucide-react';
import type { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import MarkdownLite from './MarkdownLite';

const RAW_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main';

const URLS = {
  races: `${RAW_BASE}/RACES/DESCRIPTION_DES_RACES.md`,
  historiques: `${RAW_BASE}/HISTORIQUES/HISTORIQUES.md`,
  donsOrigine: `${RAW_BASE}/DONS/DONS_D_ORIGINE.md`,
  donsGeneraux: `${RAW_BASE}/DONS/DONS_GENERAUX.md`,
  stylesCombat: `${RAW_BASE}/DONS/STYLES_DE_COMBAT.md`,
};

// Normalisation pour clé de lookup
function normalizeKey(input: string): string {
  let s = (input || '').normalize('NFC').trim();
  s = s.replace(/[\u2019\u2018\u2032]/g, "'"); // apostrophes typographiques -> '
  s = s.replace(/[\u2010-\u2014\u2212]/g, '-'); // tirets variés -> -
  s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' '); // espaces
  s = s.toLowerCase();
  return s;
}

// Indexe le Markdown en sections par titres ### ...
function parseMarkdownByH3(md: string): Record<string, { title: string; content: string }> {
  const lines = (md || '').split(/\r?\n/);
  const result: Record<string, { title: string; content: string }> = {};
  let currentTitle: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      const key = normalizeKey(currentTitle);
      if (!result[key]) {
        result[key] = { title: currentTitle, content: buf.join('\n').trim() };
      }
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentTitle = m[1];
      buf = [];
    } else if (currentTitle !== null) {
      buf.push(line);
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

/* ---------- Inline rendering (pour titres/labels courts) ---------- */

// Nettoyage simple: retirer les crochets autour d'un segment [texte] -> texte
function stripBrackets(s: string): string {
  return (s || '').replace(/\[([^\]]+)\]/g, '$1');
}

// Rendu gras+italique minimal pour titres
function renderInline(text: string): React.ReactNode {
  if (!text) return null;
  const cleaned = stripBrackets(text);

  // 1) Découpe par **...** (gras)
  const boldRe = /\*\*(.+?)\*\*/g;
  const parts: Array<{ type: 'text' | 'bold'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = boldRe.exec(cleaned)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: cleaned.slice(last, m.index) });
    parts.push({ type: 'bold', value: m[1] });
    last = boldRe.lastIndex;
  }
  if (last < cleaned.length) parts.push({ type: 'text', value: cleaned.slice(last) });

  // 2) Italique _..._ dans chaque segment
  const toItalicNodes = (str: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = [];
    const italicRe = /_(.+?)_/g;
    let idx = 0;
    let mm: RegExpExecArray | null;
    let cursor = 0;
    while ((mm = italicRe.exec(str)) !== null) {
      if (mm.index > cursor) nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{str.slice(cursor, mm.index)}</span>);
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
    out.push(
      p.type === 'bold' ? (
        <strong key={`b-${k++}`} className="font-semibold">
          {toItalicNodes(p.value, `b${k}`)}
        </strong>
      ) : (
        <span key={`t-${k++}`}>{toItalicNodes(p.value, `t${k}`)}</span>
      )
    );
  }
  return out;
}

/* ---------- UI ---------- */

type SectionContainerProps = {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  subtitle?: string | React.ReactNode;
  defaultOpen?: boolean;
};

function SectionContainer({ icon, title, children, subtitle, defaultOpen = true }: SectionContainerProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="stat-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="stat-header w-full flex items-center justify-between gap-3 cursor-pointer"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold text-gray-100">
            {title}
            {!!subtitle && <span className="ml-2 font-normal text-gray-300">- {subtitle}</span>}
          </h3>
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'} text-gray-300`}
        />
      </button>
      {open && <div className="p-4">{children}</div>}
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
          {label} "{value}" introuvable dans la source.
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
  const characterHistoryProp = (player as any)?.character_history || '';

  // Dons (adapter si nécessaire selon ton type Player)
  const feats: any = (player.stats as any)?.feats || {};
  const originFeats: string[] = Array.isArray(feats.origins)
    ? feats.origins
    : typeof feats.origin === 'string' && feats.origin
    ? [feats.origin]
    : [];
  const generalFeats: string[] = Array.isArray(feats.generals) ? feats.generals : [];
  const styleFeats: string[] = Array.isArray(feats.styles) ? feats.styles : [];

  // Extraire les maîtrises depuis les stats
  const getPlayerProficiencies = () => {
    if (!player.stats || typeof player.stats !== 'object') {
      return { weapons: [], armors: [], tools: [] };
    }

    const stats = player.stats as any;
    const creatorMeta = stats.creator_meta || {};
    
    return {
      weapons: creatorMeta.weapon_proficiencies || stats.weapon_proficiencies || [],
      armors: creatorMeta.armor_proficiencies || stats.armor_proficiencies || [],
      tools: creatorMeta.tool_proficiencies || stats.tool_proficiencies || []
    };
  };

  const proficiencies = getPlayerProficiencies();

  // Index des sources distantes
  const racesIdx = useMarkdownIndex(URLS.races);
  const histIdx = useMarkdownIndex(URLS.historiques);
  const donsOrigIdx = useMarkdownIndex(URLS.donsOrigine);
  const donsGenIdx = useMarkdownIndex(URLS.donsGeneraux);
  const stylesIdx = useMarkdownIndex(URLS.stylesCombat);

  // Recherche d'une section par nom choisi
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

  // Etat local pour l'édition de l'histoire (autosave silencieux)
  const [historyDraft, setHistoryDraft] = useState<string>(characterHistoryProp || '');
  const [savingHistory, setSavingHistory] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Souviens-toi de la dernière valeur réellement enregistrée
  const lastSavedHistoryRef = useRef<string>(characterHistoryProp || '');
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setHistoryDraft(characterHistoryProp || '');
    lastSavedHistoryRef.current = characterHistoryProp || '';
  }, [player.id, characterHistoryProp]);

  // Sauvegarde "comme dans la modale": update direct sans .single(), puis relecture pour confirmer
  async function updateHistoryOnServer(nextValue: string): Promise<boolean> {
    const id = (player as any)?.id;
    if (!id) {
      const msg = '[ProfileTab] player.id manquant, impossible de sauvegarder';
      console.error(msg, { player });
      throw new Error('Identifiant du joueur manquant');
    }

    // Log session et user pour diagnostiquer RLS si besoin
    try {
      const { data: userData } = await supabase.auth.getUser();
      // eslint-disable-next-line no-console
      console.debug('[ProfileTab] updateCharacterHistory: user/session', { userId: userData?.user?.id, playerId: id });
    } catch {
      // ignore
    }

    // 1) Update direct (comme handleSave de la modale)
    const { error: upErr } = await supabase.from('players').update({ character_history: nextValue }).eq('id', id);
    if (upErr) {
      console.error('[ProfileTab] Supabase update error', upErr);
      throw new Error(upErr.message || 'Erreur update');
    }

    // 2) Relecture pour confirmer la persistance et diagnostiquer RLS
    const { data: row, error: readErr } = await supabase
      .from('players')
      .select('id, user_id, character_history')
      .eq('id', id)
      .maybeSingle();

    if (readErr) {
      console.error('[ProfileTab] Supabase read-back error', readErr);
      throw new Error(readErr.message || 'Erreur de relecture post-update');
    }

    // eslint-disable-next-line no-console
    console.debug('[ProfileTab] Read-back row after update', row);

    if (!row) {
      throw new Error("Ligne introuvable après update (RLS ?). Vérifiez que user_id de la ligne correspond à auth.uid().");
    }

    if (row.character_history !== nextValue) {
      throw new Error(
        "La valeur lue après update ne correspond pas à la valeur envoyée. RLS, trigger ou hook peut bloquer la modification."
      );
    }

    return true;
  }

  const saveHistory = async () => {
    if (savingHistory) return;
    if ((lastSavedHistoryRef.current || '') === (historyDraft || '')) return;

    setSavingHistory(true);
    setSaveErr(null);
    setSaveOk(false);
    try {
      const ok = await updateHistoryOnServer(historyDraft);
      if (!ok) throw new Error('Échec de la sauvegarde');
      lastSavedHistoryRef.current = historyDraft;
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e: any) {
      const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
      setSaveErr(msg);
    } finally {
      setSavingHistory(false);
    }
  };

  // Autosave debounced 1.2s après la dernière frappe
  useEffect(() => {
    if ((lastSavedHistoryRef.current || '') === (historyDraft || '')) return;
    if (savingHistory) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      saveHistory();
    }, 1200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDraft]);

  return (
    <div className="space-y-6">
      {/* Espèce */}
      <SectionContainer
        icon={<Shield size={18} className="text-emerald-400" />}
        title="Espèce"
        subtitle={race || undefined}
        defaultOpen={false}
      >
        {racesIdx.loading ? (
          <LoadingInline />
        ) : racesIdx.error ? (
          <div className="text-sm text-red-400">Erreur de chargement des espèces: {racesIdx.error}</div>
        ) : raceSection ? (
          <>
            <div className="text-base font-semibold mb-2">{renderInline(raceSection.title)}</div>
            <MarkdownLite content={raceSection.content} />
          </>
        ) : (
          <NotFound label="Espèce" value={race} />
        )}
      </SectionContainer>

      {/* Historique */}
      <SectionContainer
        icon={<ScrollText size={18} className="text-sky-400" />}
        title="Historique"
        subtitle={historique || undefined}
        defaultOpen={false}
      >
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
      <SectionContainer icon={<Sparkles size={18} className="text-amber-400" />} title="Dons" defaultOpen>
        {(donsOrigIdx.loading || donsGenIdx.loading || stylesIdx.loading) && <LoadingInline />}
        {(donsOrigIdx.error || donsGenIdx.error || stylesIdx.error) && (
          <div className="text-sm text-red-400 space-y-1">
            {donsOrigIdx.error && <div>Erreur Dons d'origine: {donsOrigIdx.error}</div>}
            {donsGenIdx.error && <div>Erreur Dons généraux: {donsGenIdx.error}</div>}
            {stylesIdx.error && <div>Erreur Styles de combat: {stylesIdx.error}</div>}
          </div>
        )}

        {donsList.length === 0 ? (
          <NotFound label="Don" value={undefined} />
        ) : (
          <div className="space-y-6">
            {donsList.map((item, i) => {
              const kindLabel = 
                item.kind === 'origine' ? "Don d'origine" : 
                item.kind === 'general' ? "Don général" : 
                "Style de combat";
              
              return (
                <div key={`${item.kind}-${item.name}-${i}`} className="border border-white/10 rounded-lg p-3 bg-gray-800/40">
                  <div className="text-sm uppercase tracking-wide text-gray-400">
                    {kindLabel}
                  </div>
                  <div className="text-base font-semibold mt-1 mb-2">{renderInline(item.name)}</div>
                  {item.hit ? (
                    <MarkdownLite content={item.hit.content} />
                  ) : (
                    <div className="text-sm text-gray-400">Non trouvé dans la source distante.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionContainer>

      {/* Maîtrises */}
      <SectionContainer icon={<Shield size={18} className="text-indigo-400" />} title="Maîtrises" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Maîtrises d'armes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sword className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-white">Armes</span>
            </div>
            {proficiencies.weapons.length > 0 ? (
              <div className="space-y-1">
                {proficiencies.weapons.map((weapon, i) => (
                  <span
                    key={i}
                    className="block px-2 py-1 text-xs bg-red-500/20 text-red-200 rounded border border-red-500/30"
                  >
                    {weapon}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Selon classe</p>
            )}
          </div>

          {/* Formation aux armures */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Armures</span>
            </div>
            {proficiencies.armors.length > 0 ? (
              <div className="space-y-1">
                {proficiencies.armors.map((armor, i) => (
                  <span
                    key={i}
                    className="block px-2 py-1 text-xs bg-blue-500/20 text-blue-200 rounded border border-blue-500/30"
                  >
                    {armor}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Selon classe</p>
            )}
          </div>

          {/* Maîtrises d'outils */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Outils</span>
            </div>
            {proficiencies.tools.length > 0 ? (
              <div className="space-y-1">
                {proficiencies.tools.map((tool, i) => (
                  <span
                    key={i}
                    className="block px-2 py-1 text-xs bg-yellow-500/20 text-yellow-200 rounded border border-yellow-500/30"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Aucune</p>
            )}
          </div>
        </div>
      </SectionContainer>

      {/* Histoire du personnage */}
      <SectionContainer
        icon={<ScrollText size={18} className="text-purple-400" />}
        title="Histoire du personnage"
        defaultOpen
      >
        <div className="space-y-2">
          <textarea
            value={historyDraft}
            onChange={(e) => setHistoryDraft(e.target.value)}
            onBlur={saveHistory}
            className="input-dark w-full px-3 py-2 rounded-md"
            rows={8}
            placeholder="Décrivez l'histoire de votre personnage..."
          />
          <div className="flex items-center gap-2 h-6">
            {savingHistory && (
              <span className="text-gray-400 flex items-center gap-1 text-sm">
                <Loader2 size={14} className="animate-spin" /> Sauvegarde…
              </span>
            )}
            {saveOk && (
              <span className="text-emerald-400 flex items-center gap-1 text-sm">
                <Check size={14} /> Enregistré
              </span>
            )}
            {saveErr && (
              <span className="text-red-400 text-sm" title={saveErr}>
                {saveErr}
              </span>
            )}
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}