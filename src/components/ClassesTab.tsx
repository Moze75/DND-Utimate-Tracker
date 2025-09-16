import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Music,
  Cross,
  Leaf,
  Wand2,
  Swords,
  Footprints,
  HandHeart,
  Target,
  Skull,
  BookOpen,
  Settings,
  Trash2,
  Save,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { loadAbilitySections } from '../services/classesContent';
import { loadFeatureChecks, upsertFeatureCheck } from '../services/featureChecks';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { ClassResources } from '../types/dnd';

type AbilitySection = {
  level: number;
  title: string;
  content: string;
  origin: 'class' | 'subclass';
};

type PlayerLike = {
  id?: string | null;       // id du personnage (pour persister les cases côté Supabase)
  class?: string | null;
  subclass?: string | null;
  level?: number | null;

  // pour afficher/mettre à jour les ressources de classe
  class_resources?: ClassResources | null;
};

type Props = {
  player?: PlayerLike;
  playerClass?: string;       // si pas de player
  className?: string;         // rétrocompatibilité
  subclassName?: string | null;
  characterLevel?: number;
};

// Active des logs de debug dans la console si window.UT_DEBUG === true
const DEBUG = typeof window !== 'undefined' && (window as any).UT_DEBUG === true;

/* Alias FR/EN pour compenser les divergences de nommage du contenu (chargement de sections) */
const CLASS_ALIASES: Record<string, string[]> = {
  // normalisé -> candidats possibles dans les données
  'moine': ['Moine', 'Monk'],
  'ensorceleur': ['Ensorceleur', 'Sorcier', 'Sorcerer'],
  'barbare': ['Barbare', 'Barbarian'],
  'barde': ['Barde', 'Bard'],
  'clerc': ['Clerc', 'Cleric'],
  'druide': ['Druide', 'Druid'],
  'guerrier': ['Guerrier', 'Fighter'],
  'paladin': ['Paladin'],
  'rodeur': ['Rôdeur', 'Rodeur', 'Ranger'],
  'voleur': ['Voleur', 'Rogue', 'Roublard'],
  'magicien': ['Magicien', 'Wizard'],
  // ajoute si besoin
};

const SUBCLASS_ALIASES: Record<string, string[]> = {
  // moine
  'voie de la paume': [
    'Voie de la Paume',
    'Voie de la Main Ouverte',
    'Way of the Open Hand',
    'Open Hand',
    'Way Of The Open Hand',
  ],
  'voie de la main ouverte': [
    'Voie de la Main Ouverte',
    'Voie de la Paume',
    'Way of the Open Hand',
    'Open Hand',
  ],
  // quelques alias génériques utiles
  'credo de la paume': ['Voie de la Paume', 'Voie de la Main Ouverte', 'Way of the Open Hand'],
};

/* Normalisation forte (lookup interne) */
function norm(s: string) {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // sans accents
    .replace(/\s*\([^)]*\)\s*/g, ' ') // sans parenthèses
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* Canonicalise une classe (FR) pour le switch des ressources de classe */
function canonicalClass(name: string): string {
  const n = norm(name);
  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';
  if (['ensorceleur', 'sorcier', 'sorcerer'].includes(n)) return 'Ensorceleur';
  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  if (['magicien', 'wizard'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue'].includes(n)) return 'Roublard';
  return name || '';
}

/* Pour affichage seulement (majuscule initiale) */
function sentenceCase(s: string) {
  const t = (s || '').toLocaleLowerCase('fr-FR').trim();
  if (!t) return t;
  const first = t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1);
  return first.replace(/\b([A-Z]{2,})\b/g, '$1');
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function stripParentheses(s: string) {
  return (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slug(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function ClassesTab({
  player,
  playerClass,
  className,
  subclassName,
  characterLevel,
}: Props) {
  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);

  // État des cases cochées persistées (depuis markdown)
  const [checkedMap, setCheckedMap] = useState<Map<string, boolean>>(new Map());
  const [loadingChecks, setLoadingChecks] = useState(false);

  // État local pour les ressources de classe (pour retours UI immédiats)
  const [classResources, setClassResources] = useState<ClassResources | null | undefined>(player?.class_resources);

  // RAW (pour la recherche de markdown)
  const rawClass = (player?.class ?? playerClass ?? className ?? '').trim();
  const rawSubclass = (player?.subclass ?? subclassName) ?? null;

  // DISPLAY (pour l’UI uniquement)
  const displayClass = rawClass ? sentenceCase(rawClass) : '';
  const displaySubclass = rawSubclass ? sentenceCase(rawSubclass) : null;

  const finalLevelRaw = player?.level ?? characterLevel ?? 1;
  const finalLevel = Math.max(1, Number(finalLevelRaw) || 1);
  const characterId = player?.id ?? null;

  // Sync local resources si player change
  useEffect(() => {
    setClassResources(player?.class_resources);
  }, [player?.class_resources, player?.id]);

  // Chargement "smart" des sections avec variantes de normalisation + alias
  useEffect(() => {
    let mounted = true;

    if (!rawClass) {
      setSections([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await loadSectionsSmart({
          className: rawClass,
          subclassName: rawSubclass,
          level: finalLevel,
        });
        if (!mounted) return;
        setSections(res);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadSectionsSmart error:', e);
        if (!mounted) return;
        setSections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [rawClass, rawSubclass, finalLevel]);

  // Charger l’état des cases cochées (features markdown)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingChecks(true);
      try {
        const map = await loadFeatureChecks(characterId);
        if (!mounted) return;
        setCheckedMap(map);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadFeatureChecks error:', e);
        if (!mounted) return;
        setCheckedMap(new Map());
      } finally {
        if (mounted) setLoadingChecks(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [characterId]);

  // Toggle + persistance (cases cochées)
  async function handleToggle(featureKey: string, checked: boolean) {
    // Optimistic UI
    setCheckedMap(prev => {
      const next = new Map(prev);
      next.set(featureKey, checked);
      return next;
    });
    // Persist
    try {
      await upsertFeatureCheck({
        characterId,
        className: displayClass,          // stocke version affichée
        subclassName: displaySubclass ?? null,
        featureKey,
        checked,
      });
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] upsertFeatureCheck error:', e);
      // On peut rester optimiste
    }
  }

  // Mise à jour d'une ressource de classe (persist + UI locale)
  const updateClassResource = async (
    resource: keyof ClassResources,
    value: ClassResources[keyof ClassResources]
  ) => {
    if (!player?.id) return;
    const next = { ...(classResources || {}), [resource]: value };

    try {
      const { error } = await supabase
        .from('players')
        .update({ class_resources: next })
        .eq('id', player.id);

      if (error) throw error;

      setClassResources(next as ClassResources);

      // Toasts
      if (typeof value === 'boolean') {
        toast.success(`Récupération arcanique ${value ? 'utilisée' : 'disponible'}`);
      } else {
        const resourceNames: Record<string, string> = {
          rage: 'Rage',
          bardic_inspiration: 'Inspiration bardique',
          channel_divinity: 'Conduit divin',
          wild_shape: 'Forme sauvage',
          sorcery_points: 'Points de sorcellerie',
          action_surge: "Sursaut d'action",
          ki_points: 'Points de crédo', // renommage UI pour le Moine
          lay_on_hands: 'Imposition des mains',
          favored_foe: 'Ennemi juré',
          sneak_attack: 'Attaque sournoise',
        };

        const displayKey = (resource as string).replace('used_', '');
        const resourceName = resourceNames[displayKey] || displayKey;
        const isUsed = (resource as string).startsWith('used_');

        const previous = (classResources as any)?.[resource];
        const action =
          isUsed && typeof previous === 'number' && typeof value === 'number'
            ? value > previous
              ? 'utilisé'
              : 'récupéré'
            : 'mis à jour';

        if (isUsed && typeof previous === 'number' && typeof value === 'number') {
          const diff = Math.abs(value - previous);
          toast.success(`${diff} ${resourceName} ${action}`);
        } else {
          toast.success(`${resourceName} ${action}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des ressources:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const visible = useMemo(
    () =>
      sections
        .filter((s) => (typeof s.level === 'number' ? s.level <= finalLevel : true))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    [sections, finalLevel]
  );

  const hasClass = !!displayClass;

  return (
    <div className="space-y-4">
      {/* En-tête minimal: <Classe> - <Sous-classe> */}
      <div className="bg-gradient-to-r from-violet-700/30 via-fuchsia-600/20 to-amber-600/20 border border-white/10 rounded-2xl px-4 py-3 ring-1 ring-black/5 shadow-md shadow-black/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            {hasClass ? displayClass : '—'}{displaySubclass ? ` - ${displaySubclass}` : ''}
          </span>
          <span className="text-xs text-white/70">Niveau {finalLevel}</span>
        </div>
      </div>

      {/* RESSOURCES DE CLASSE — déplacées ici sous l'entête (avec alias FR/EN robustes) */}
      {hasClass && (
        <ClassResourcesCard
          playerClass={displayClass}
          resources={classResources || undefined}
          onUpdateResource={updateClassResource}
        />
      )}

      {!hasClass ? (
        <div className="text-center text-white/70 py-10">
          Sélectionne une classe pour afficher les aptitudes.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center text-white/70 py-10">
          Aucune aptitude trouvée pour “{displayClass}{displaySubclass ? ` - ${displaySubclass}` : ''}”.
          {DEBUG && <pre className="mt-3 text-xs text-white/60">Activez window.UT_DEBUG = true pour voir les tentatives de chargement dans la console.</pre>}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((s, i) => (
            <AbilityCard
              key={`${s.origin}-${s.level}-${i}`}
              section={s}
              defaultOpen={s.level === finalLevel}
              ctx={{
                characterId,
                className: displayClass,
                subclassName: displaySubclass,
                checkedMap,
                onToggle: handleToggle,
              }}
              disableContentWhileLoading={loadingChecks}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ———— Chargement "smart" des sections ————
   Essaie:
   - brut
   - sans parenthèses
   - sans accents
   - sentenceCase
   - alias FR/EN
   - fallback sans sous-classe
   Loggue les tentatives si UT_DEBUG = true.
*/
async function loadSectionsSmart(params: {
  className: string;
  subclassName: string | null;
  level: number;
}): Promise<AbilitySection[]> {
  const { className, subclassName, level } = params;

  const clsNorm = norm(className);
  const subNorm = subclassName ? norm(subclassName) : '';

  // Candidats de base
  const classCandidatesBase = uniq([
    className,
    stripDiacritics(className),
    stripParentheses(className),
    sentenceCase(className),
  ]).filter(Boolean) as string[];
  const subclassCandidatesBase = uniq([
    subclassName ?? '',
    stripParentheses(subclassName ?? ''),
    stripDiacritics(subclassName ?? ''),
    sentenceCase(subclassName ?? ''),
  ]).filter(Boolean) as string[];

  // Ajout des alias
  const classAlias = CLASS_ALIASES[clsNorm] ?? [];
  const subclassAlias = subNorm ? (SUBCLASS_ALIASES[subNorm] ?? []) : [];

  const classCandidates = uniq([...classCandidatesBase, ...classAlias]).filter(Boolean) as string[];
  const subclassCandidates = uniq([...subclassCandidatesBase, ...subclassAlias]).filter(Boolean) as string[];

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.debug('[ClassesTab] Tentatives de chargement', {
      input: { className, subclassName, level },
      normalized: { clsNorm, subNorm },
      classCandidates,
      subclassCandidates,
    });
  }

  // 1) Essayer toutes les combinaisons (classe x sous-classe)
  for (const c of classCandidates) {
    for (const sc of subclassCandidates) {
      try {
        if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try', { className: c, subclassName: sc, level });
        const res = await loadAbilitySections({
          className: c,
          subclassName: sc,
          characterLevel: level,
        });
        const secs = (res?.sections ?? []) as AbilitySection[];
        if (Array.isArray(secs) && secs.length > 0) {
          if (DEBUG) console.debug('[ClassesTab] -> OK', { className: c, subclassName: sc, count: secs.length });
          return secs;
        }
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] -> KO', { className: c, subclassName: sc, error: e });
      }
    }
  }

  // 2) Essayer avec la classe uniquement (sans sous-classe)
  for (const c of classCandidates) {
    try {
      if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try (class only)', { className: c, level });
      const res = await loadAbilitySections({
        className: c,
        subclassName: null,
        characterLevel: level,
      });
      const secs = (res?.sections ?? []) as AbilitySection[];
      if (Array.isArray(secs) && secs.length > 0) {
        if (DEBUG) console.debug('[ClassesTab] -> OK (class only)', { className: c, count: secs.length });
        return secs;
      }
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] -> KO (class only)', { className: c, error: e });
    }
  }

  // 3) Échec
  return [];
}

/* ———— Carte repliable, typo alignée, contenu bien visible ———— */

function AbilityCard({
  section,
  defaultOpen,
  ctx,
  disableContentWhileLoading,
}: {
  section: AbilitySection;
  defaultOpen?: boolean;
  ctx: MarkdownCtx;
  disableContentWhileLoading?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const contentId = `ability-${section.origin}-${section.level}-${slug(section.title)}`;

  return (
    <article
      className={[
        'rounded-xl border ring-1 ring-black/5 shadow-lg shadow-black/20',
        'border-amber-700/30',
        'bg-[radial-gradient(ellipse_at_top_left,rgba(120,53,15,.12),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(91,33,182,.10),transparent_45%)]',
      ].join(' ')}
    >
      {/* En-tête cliquable (toggle), sans étiquette texte */}
      <button
        type="button'
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="pt-0.5 shrink-0">
            <LevelBadge level={section.level} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                {sentenceCase(section.title)}
              </h3>
              <OriginPill origin={section.origin} />
            </div>
          </div>

          <div className="ml-2 mt-0.5 text-white/80">
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Contenu repliable — padding top léger, pas de marge négative */}
      <div
        id={contentId}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-[200vh] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pt-1 pb-4">
          {disableContentWhileLoading ? (
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          ) : (
            <div className="text-sm text-white/90 leading-relaxed space-y-2">
              <MarkdownLite
                text={section.content}
                ctx={{
                  ...ctx,
                  section: { level: section.level, origin: section.origin, title: section.title },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ———— Étiquettes ———— */

function LevelBadge({ level }: { level: number }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
        'bg-gradient-to-br from-violet-600/90 to-fuchsia-500/90 text-white',
        'ring-1 ring-inset ring-violet-300/30 shadow-sm shadow-black/20',
      ].join(' ')}
    >
      Niv. {level}
    </span>
  );
}

function OriginPill({ origin }: { origin: 'class' | 'subclass' }) {
  const isClass = origin === 'class';
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset',
        isClass
          ? 'bg-violet-500/15 text-violet-200 ring-violet-400/25'
          : 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
      ].join(' ')}
    >
      {isClass ? 'Classe' : 'Sous-classe'}
    </span>
  );
}

/* ———— Markdown léger avec support #### titres et ##### cases cochables ———— */

type MarkdownCtx = {
  characterId?: string | null;
  className: string;
  subclassName?: string | null;
  checkedMap?: Map<string, boolean>;
  onToggle?: (featureKey: string, checked: boolean) => void;
};

function MarkdownLite({ text, ctx }: { text: string; ctx: MarkdownCtx & { section: { level: number; origin: 'class' | 'subclass'; title: string } } }) {
  const nodes = useMemo(() => parseMarkdownLite(text, ctx), [text, ctx]);
  return <>{nodes}</>;
}

function parseMarkdownLite(
  md: string,
  ctx: MarkdownCtx & { section: { level: number; origin: 'class' | 'subclass'; title: string } }
): React.ReactNode[] {
  const lines = md.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushPara = (buff: string[]) => {
    const content = buff.join(' ').trim();
    if (!content) return;
    out.push(
      <p key={`p-${key++}`} className="text-sm">
        {formatInline(content)}
      </p>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      out.push(<div key={`sp-${key++}`} className="h-2" />);
      i++;
      continue;
    }

    // ##### -> case à cocher persistante
    const h5chk = line.match(/^\s*#####\s+(.*)$/);
    if (h5chk) {
      const rawLabel = h5chk[1];
      const label = sentenceCase(rawLabel);
      const featureKey = slug(`${ctx.section.level}-${ctx.section.origin}-${ctx.section.title}--${label}`);
      const checked = ctx.checkedMap?.get(featureKey) ?? false;
      const id = `chk-${key}`;

      out.push(
        <div key={`chk-${key++}`} className="flex items-start gap-2">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => ctx.onToggle?.(featureKey, e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500 bg-black/40 border border-white/20 rounded"
          />
          <label htmlFor={id} className="text-sm text-white/90">
            {formatInline(label)}
          </label>
        </div>
      );
      i++;
      continue;
    }

    // #### -> petit titre, légèrement augmenté en casse (small-caps)
    const h4small = line.match(/^\s*####\s+(.*)$/);
    if (h4small) {
      out.push(
        <h5
          key={`h4s-${key++}`}
          className="text-white font-semibold text-[13px]"
          style={{ fontVariant: 'small-caps' }}
        >
          {formatInline(sentenceCase(h4small[1]))}
        </h5>
      );
      i++;
      continue;
    }

    // ### / ## / #
    const h3 = line.match(/^\s*###\s+(.*)$/);
    if (h3) {
      out.push(
        <h4 key={`h3-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h3[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h2 = line.match(/^\s*##\s+(.*)$/);
    if (h2) {
      out.push(
        <h4 key={`h2-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h2[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h1 = line.match(/^\s*#\s+(.*)$/);
    if (h1) {
      out.push(
        <h4 key={`h1-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h1[1]))}
        </h4>
      );
      i++;
      continue;
    }

    // Table Markdown simple
    if (line.includes('|')) {
      const block: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        block.push(lines[i]);
        i++;
      }
      const tableNode = renderTable(block, key);
      if (tableNode) {
        out.push(tableNode);
        key++;
        continue;
      }
      out.push(
        <p key={`pf-${key++}`} className="text-sm">
          {formatInline(block.join(' '))}
        </p>
      );
      continue;
    }

    // Liste à puces
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`li-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Liste ordonnée
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`oli-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraphe (agrège jusqu’à ligne de rupture)
    const buff: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].includes('|') &&
      !/^\s*#{1,6}\s+/.test(lines[i])
    ) {
      buff.push(lines[i]);
      i++;
    }
    pushPara(buff);
  }

  return out;
}

function renderTable(block: string[], key: number): React.ReactNode | null {
  if (block.length < 2) return null;
  const rows = block.map(r =>
    r
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''))
  );

  const hasSep = rows[1] && rows[1].every(cell => /^:?-{3,}:?$/.test(cell));
  const header = hasSep ? rows[0] : null;
  const body = hasSep ? rows.slice(2) : rows;

  return (
    <div key={`tbl-${key}`} className="overflow-x-auto">
      <table className="min-w-[360px] w-full text-sm border-separate border-spacing-y-1">
        {header && (
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={`th-${i}`} className="text-left text-white font-semibold px-2 py-1 bg-white/5 rounded">
                  {formatInline(sentenceCase(h))}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((cells, r) => (
            <tr key={`tr-${r}`}>
              {cells.map((c, ci) => (
                <td key={`td-${ci}`} className="px-2 py-1 text-white/90 bg-white/0">
                  {formatInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inline: **gras**, *italique* ou _italique_
function formatInline(text: string): React.ReactNode[] {
  let parts: Array<string | React.ReactNode> = [text];

  // Gras **...**
  parts = splitAndMap(parts, /\*\*([^*]+)\*\*/g, (m, i) => <strong key={`b-${i}`} className="text-white">{m[1]}</strong>);

  // Italique *...*
  parts = splitAndMap(parts, /(^|[^*])\*([^*]+)\*(?!\*)/g, (m, i) => [m[1], <em key={`i-${i}`} className="italic">{m[2]}</em>]);

  // Italique _..._
  parts = splitAndMap(parts, /_([^_]+)_/g, (m, i) => <em key={`u-${i}`} className="italic">{m[1]}</em>);

  return parts.map((p, i) => (typeof p === 'string' ? <React.Fragment key={`t-${i}`}>{p}</React.Fragment> : p));
}

function splitAndMap(
  parts: Array<string | React.ReactNode>,
  regex: RegExp,
  toNode: (m: RegExpExecArray, idx: number) => React.ReactNode | React.ReactNode[]
): Array<string | React.ReactNode> {
  const out: Array<string | React.ReactNode> = [];

  for (const part of parts) {
    if (typeof part !== 'string') {
      out.push(part);
      continue;
    }
    let str = part;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const r = new RegExp(regex.source, regex.flags);

    while ((m = r.exec(str)) !== null) {
      out.push(str.slice(lastIndex, m.index));
      const node = toNode(m, out.length);
      if (Array.isArray(node)) out.push(...node);
      else out.push(node);
      lastIndex = m.index + m[0].length;
    }
    out.push(str.slice(lastIndex));
  }
  return out;
}

/* ———— Composants Ressources ———— */

function ResourceEditModal({
  label,
  total,
  onSave,
  onCancel,
}: {
  label: string;
  total: number;
  onSave: (newTotal: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<string>(total.toString());

  const handleSave = () => {
    const newValue = parseInt(value) || 0;
    if (newValue >= 0) onSave(newValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-dark w-full px-3 py-2 rounded-md"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <Save size={16} />
          Sauvegarder
        </button>
        <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <X size={16} />
          Annuler
        </button>
      </div>
    </div>
  );
}

function ResourceBlock({
  icon,
  label,
  total,
  used,
  onUse,
  onRestore,
  onUpdateTotal,
  onUpdateUsed,
  useNumericInput = false,
  color = 'purple',
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse: () => void;
  onRestore: () => void;
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  onDelete?: () => void;
}) {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30',
  };

  return (
    <div className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClasses[color]}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center">
            {remaining}/{total}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-blue-900/30 rounded-full transition-colors"
            title="Modifier"
          >
            <Settings size={16} />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {useNumericInput ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-dark flex-1 px-3 py-1 rounded-md text-center"
            placeholder="0"
          />
          <button
            onClick={() => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(used + value);
                setAmount('');
              }
            }}
            className="p-1 text-red-500 hover:bg-red-900/30 rounded-md transition-colors"
            title="Dépenser"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(Math.max(0, used - value));
                setAmount('');
              }
            }}
            className="p-1 text-green-500 hover:bg-green-900/30 rounded-md transition-colors"
            title="Récupérer"
          >
            <Plus size={18} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onUse}
            disabled={remaining <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              remaining > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Minus size={16} className="mx-auto" />
          </button>
          <button
            onClick={onRestore}
            disabled={used <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              used > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Plus size={16} className="mx-auto" />
          </button>
        </div>
      )}

      {isEditing && (
        <div className="mt-4 border-t border-gray-700/50 pt-4">
          <ResourceEditModal
            label={`Nombre total de ${label.toLowerCase()}`}
            total={total}
            onSave={(newTotal) => {
              onRestore(); // reset used
              onUpdateTotal(newTotal);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

function ClassResourcesCard({
  playerClass,
  resources,
  onUpdateResource,
}: {
  playerClass: string;
  resources?: ClassResources;
  onUpdateResource: (resource: keyof ClassResources, value: any) => void;
}) {
  if (!resources || !playerClass) return null;

  const cls = canonicalClass(playerClass);
  const items: React.ReactNode[] = [];

  switch (cls) {
    case 'Barbare':
      if (typeof resources.rage === 'number') {
        items.push(
          <ResourceBlock
            key="rage"
            icon={<Flame size={20} />}
            label="Rage"
            total={resources.rage}
            used={resources.used_rage || 0}
            onUse={() => onUpdateResource('used_rage', (resources.used_rage || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('rage', n)}
            onRestore={() => onUpdateResource('used_rage', Math.max(0, (resources.used_rage || 0) - 1))}
            color="red"
          />
        );
      }
      break;

    case 'Barde':
      if (typeof resources.bardic_inspiration === 'number') {
        items.push(
          <ResourceBlock
            key="bardic_inspiration"
            icon={<Music size={20} />}
            label="Inspiration bardique"
            total={resources.bardic_inspiration}
            used={resources.used_bardic_inspiration || 0}
            onUse={() => onUpdateResource('used_bardic_inspiration', (resources.used_bardic_inspiration || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('bardic_inspiration', n)}
            onRestore={() => onUpdateResource('used_bardic_inspiration', Math.max(0, (resources.used_bardic_inspiration || 0) - 1))}
            color="purple"
          />
        );
      }
      break;

    case 'Clerc':
      if (typeof resources.channel_divinity === 'number') {
        items.push(
          <ResourceBlock
            key="channel_divinity"
            icon={<Cross size={20} />}
            label="Conduit divin"
            total={resources.channel_divinity}
            used={resources.used_channel_divinity || 0}
            onUse={() => onUpdateResource('used_channel_divinity', (resources.used_channel_divinity || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('channel_divinity', n)}
            onRestore={() => onUpdateResource('used_channel_divinity', Math.max(0, (resources.used_channel_divinity || 0) - 1))}
            color="yellow"
          />
        );
      }
      break;

    case 'Druide':
      if (typeof resources.wild_shape === 'number') {
        items.push(
          <ResourceBlock
            key="wild_shape"
            icon={<Leaf size={20} />}
            label="Forme sauvage"
            total={resources.wild_shape}
            used={resources.used_wild_shape || 0}
            onUse={() => onUpdateResource('used_wild_shape', (resources.used_wild_shape || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('wild_shape', n)}
            onRestore={() => onUpdateResource('used_wild_shape', Math.max(0, (resources.used_wild_shape || 0) - 1))}
            color="green"
          />
        );
      }
      break;

    case 'Ensorceleur':
      if (typeof resources.sorcery_points === 'number') {
        items.push(
          <ResourceBlock
            key="sorcery_points"
            icon={<Wand2 size={20} />}
            label="Points de sorcellerie"
            total={resources.sorcery_points}
            used={resources.used_sorcery_points || 0}
            onUse={() => onUpdateResource('used_sorcery_points', (resources.used_sorcery_points || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('sorcery_points', n)}
            onRestore={() => onUpdateResource('used_sorcery_points', Math.max(0, (resources.used_sorcery_points || 0) - 1))}
            color="purple"
          />
        );
      }
      break;

    case 'Guerrier':
      if (typeof resources.action_surge === 'number') {
        items.push(
          <ResourceBlock
            key="action_surge"
            icon={<Swords size={20} />}
            label="Sursaut d'action"
            total={resources.action_surge}
            used={resources.used_action_surge || 0}
            onUse={() => onUpdateResource('used_action_surge', (resources.used_action_surge || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('action_surge', n)}
            onRestore={() => onUpdateResource('used_action_surge', Math.max(0, (resources.used_action_surge || 0) - 1))}
            color="red"
          />
        );
      }
      break;

    case 'Magicien':
      if (resources.arcane_recovery !== undefined) {
        items.push(
          <div key="arcane_recovery" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-300">Récupération arcanique</span>
              </div>
              <button
                onClick={() => onUpdateResource('used_arcane_recovery', !resources.used_arcane_recovery)}
                className={`h-8 px-3 flex items-center justify-center rounded-md transition-colors ${
                  resources.used_arcane_recovery ? 'bg-gray-800/50 text-gray-500' : 'text-blue-500 hover:bg-blue-900/30'
                }`}
              >
                {resources.used_arcane_recovery ? 'Utilisé' : 'Disponible'}
              </button>
            </div>
          </div>
        );
      }
      break;

    case 'Moine':
      if (typeof resources.ki_points === 'number') {
        items.push(
          <ResourceBlock
            key="ki_points"
            icon={<Footprints size={20} />}
            label="Points de crédo"
            total={resources.ki_points}
            used={resources.used_ki_points || 0}
            onUse={() => onUpdateResource('used_ki_points', (resources.used_ki_points || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('ki_points', n)}
            onRestore={() => onUpdateResource('used_ki_points', Math.max(0, (resources.used_ki_points || 0) - 1))}
            color="blue"
          />
        );
      }
      break;

    case 'Paladin':
      if (typeof resources.lay_on_hands === 'number') {
        items.push(
          <ResourceBlock
            key="lay_on_hands"
            icon={<HandHeart size={20} />}
            label="Imposition des mains"
            total={resources.lay_on_hands}
            used={resources.used_lay_on_hands || 0}
            onUpdateTotal={(n) => onUpdateResource('lay_on_hands', n)}
            onUpdateUsed={(v) => onUpdateResource('used_lay_on_hands', v)}
            color="yellow"
            useNumericInput
          />
        );
      }
      break;

    case 'Rôdeur':
      if (typeof resources.favored_foe === 'number') {
        items.push(
          <ResourceBlock
            key="favored_foe"
            icon={<Target size={20} />}
            label="Ennemi juré"
            total={resources.favored_foe}
            used={resources.used_favored_foe || 0}
            onUse={() => onUpdateResource('used_favored_foe', (resources.used_favored_foe || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('favored_foe', n)}
            onRestore={() => onUpdateResource('used_favored_foe', Math.max(0, (resources.used_favored_foe || 0) - 1))}
            color="green"
          />
        );
      }
      break;

    case 'Roublard':
      if (resources.sneak_attack) {
        items.push(
          <div key="sneak_attack" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull size={20} className="text-red-500" />
                <span className="text-sm font-medium text-gray-300">Attaque sournoise</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">
                {resources.sneak_attack}
              </div>
            </div>
          </div>
        );
      }
      break;
  }

  if (!items.length) return null;

  return (
    <div className="stats-card">
      <div className="stat-header flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-100">Ressources de classe</h3>
      </div>
      <div className="p-4 space-y-4">{items}</div>
    </div>
  );
}

export default ClassesTab;
export { ClassesTab };