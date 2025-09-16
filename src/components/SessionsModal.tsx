import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Filter, Check, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react';

type Spell = {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: { V: boolean; S: boolean; M: string | null };
  duration: string;
  description: string;
  higher_levels?: string;
  classes: string[]; // Noms FR
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  playerClass?: string | null;
  // Mode “sélection” pour KnownSpellsSection
  selectionMode?: boolean;
  onSpellSelect?: (spell: Spell) => void;
  selectedSpells?: Spell[];
  onConfirm?: (spells: Spell[]) => void;
};

// ===================== Canonicalisation de classe =====================

function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function normalize(s: string) {
  return stripDiacritics((s || '').toLowerCase().trim());
}

// Renvoie la forme canonique FR des noms de classe dans l’app
function canonicalizeClass(name: string): string {
  const n = normalize(name);

  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric', 'pretre', 'prêtre'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';
  if (['ensorceleur', 'sorcerer', 'sorceror'].includes(n)) return 'Ensorceleur';
  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  if (['magicien', 'wizard', 'mage'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue', 'thief'].includes(n)) return 'Roublard';

  // Occultiste (Warlock) — alias “Sorcier” historique
  if (['occultiste', 'warlock', 'sorcier'].includes(n)) return 'Occultiste';

  return name || '';
}

// Helper: test d’appartenance à une classe en tolérant les alias FR/EN
function classesInclude(list: string[], cls: string): boolean {
  const target = canonicalizeClass(cls);
  return list.some((c) => canonicalizeClass(c) === target);
}

// ===================== Jeu de sorts d’exemple (fallback) =====================
// Note: remplace “Sorcier” par “Occultiste” pour conformité 2024

const SAMPLE_SPELLS: Spell[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Détection de la magie',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Concentration, jusqu’à 10 minutes',
    description: 'Pendant la durée du sort, vous ressentez la présence de magie dans un rayon de 9 mètres autour de vous.',
    classes: ['Barde', 'Clerc', 'Druide', 'Magicien', 'Paladin', 'Rôdeur', 'Ensorceleur', 'Occultiste'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'Lumière',
    level: 0,
    school: 'Évocation',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: false, M: 'une luciole ou de la mousse phosphorescente' },
    duration: '1 heure',
    description:
      'Vous touchez un objet qui ne fait pas plus de 3 mètres dans chaque dimension. Jusqu’à la fin du sort, l’objet émet une lumière vive dans un rayon de 6 mètres.',
    classes: ['Barde', 'Clerc', 'Ensorceleur', 'Magicien'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    casting_time: '1 action',
    range: '3 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Jusqu’à 1 heure',
    description:
      'Ce sort est un tour de magie mineur que les lanceurs de sorts novices utilisent pour s’entraîner.',
    classes: ['Barde', 'Ensorceleur', 'Occultiste', 'Magicien'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Flèche acide',
    level: 2, // corrige un niveau incohérent fréquent dans les échantillons
    school: 'Invocation',
    casting_time: '1 action',
    range: '27 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Instantané',
    description: "Une flèche scintillante d'énergie acide file vers une créature à portée.",
    classes: ['Ensorceleur', 'Magicien'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Bénédiction',
    level: 1,
    school: 'Enchantement',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: "une aspersion d'eau bénite" },
    duration: 'Concentration, jusqu’à 1 minute',
    description: 'Vous bénissez jusqu’à trois créatures de votre choix à portée.',
    classes: ['Clerc', 'Paladin'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Charme-personne',
    level: 1,
    school: 'Enchantement',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: null },
    duration: '1 heure',
    description: 'Vous tentez de charmer un humanoïde que vous pouvez voir à portée.',
    classes: ['Barde', 'Druide', 'Ensorceleur', 'Occultiste', 'Magicien'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Invisibilité',
    level: 2,
    school: 'Illusion',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: true, M: 'un cil enrobé de gomme arabique' },
    duration: 'Concentration, jusqu’à 1 heure',
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 3 ou supérieur, vous pouvez cibler une créature supplémentaire pour chaque niveau d'emplacement au-delà du niveau 2.",
    description:
      'Une créature que vous touchez devient invisible jusqu’à la fin du sort.',
    classes: ['Barde', 'Ensorceleur', 'Occultiste', 'Magicien'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    name: "Toile d'araignée",
    level: 2,
    school: 'Invocation',
    casting_time: '1 action',
    range: '18 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Concentration, jusqu’à 1 heure',
    description: 'Vous conjurez une toile épaisse qui entrave vos adversaires.',
    classes: ['Ensorceleur', 'Magicien'],
  },
];

// ===================== UI utilitaires =====================

const ALL_SCHOOLS = [
  'Abjuration',
  'Divination',
  'Enchantement',
  'Évocation',
  'Illusion',
  'Invocation',
  'Nécromancie',
  'Transmutation',
];

const LEVEL_OPTIONS = ['Tous', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// ===================== Composant =====================

export function SpellbookModal({
  isOpen,
  onClose,
  playerClass,
  selectionMode = false,
  onSpellSelect,
  selectedSpells = [],
  onConfirm,
}: Props) {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('Tous');
  const [schoolFilter, setSchoolFilter] = useState<string>('Toutes');
  const [onlyPlayerClass, setOnlyPlayerClass] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Conserver la préférence “Filtrer par classe du personnage”
  useEffect(() => {
    setOnlyPlayerClass(true);
  }, [playerClass]);

  const canonicalPlayerClass = useMemo(
    () => (playerClass ? canonicalizeClass(playerClass) : ''),
    [playerClass]
  );

  // Filtrage des sorts
  const filteredSpells = useMemo(() => {
    const q = normalize(query);
    const wantLevel = levelFilter === 'Tous' ? null : parseInt(levelFilter, 10);
    const wantSchool = schoolFilter === 'Toutes' ? null : schoolFilter;

    return SAMPLE_SPELLS.filter((s) => {
      // 1) Filtre classe (par défaut: uniquement la classe du perso)
      if (onlyPlayerClass && canonicalPlayerClass) {
        if (!classesInclude(s.classes, canonicalPlayerClass)) return false;
      }

      // 2) Filtre niveau
      if (wantLevel !== null && s.level !== wantLevel) return false;

      // 3) Filtre école
      if (wantSchool !== null && s.school !== wantSchool) return false;

      // 4) Recherche plein texte: nom, école, description
      if (!q) return true;
      const hay =
        normalize(s.name) +
        ' ' +
        normalize(s.school) +
        ' ' +
        normalize(s.description) +
        ' ' +
        normalize(s.higher_levels || '');
      return hay.includes(q);
    }).sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name, 'fr'));
  }, [query, levelFilter, schoolFilter, onlyPlayerClass, canonicalPlayerClass]);

  const isSelected = (spell: Spell) => selectedSpells.some((s) => s.id === spell.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-[min(1024px,94vw)] max-h-[86vh] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-gray-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-100">Grimoire</h3>
            {canonicalPlayerClass && (
              <div className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                {canonicalPlayerClass}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-gray-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Recherche */}
            <div className="col-span-1 sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un sort (nom, description, école)..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-800/70 border border-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Filtres rapides */}
            <div className="flex items-center gap-2">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-white/10 text-gray-100 focus:outline-none"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Tous' ? 'Tous les niveaux' : `Niveau ${opt}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-white/10 text-gray-200 hover:bg-gray-800/90 transition flex items-center justify-center gap-2"
              >
                <Filter size={16} />
                Filtres avancés
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-gray-800/40 border border-white/10 rounded-lg p-2">
                <input
                  id="toggle-class"
                  type="checkbox"
                  checked={onlyPlayerClass}
                  onChange={(e) => setOnlyPlayerClass(e.currentTarget.checked)}
                  className="h-4 w-4 accent-violet-500 bg-black/40 border border-white/20 rounded"
                />
                <label htmlFor="toggle-class" className="text-sm text-gray-300">
                  Afficher seulement les sorts de ma classe
                  {canonicalPlayerClass ? ` (${canonicalPlayerClass})` : ''}
                </label>
              </div>

              <div>
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-white/10 text-gray-100 focus:outline-none"
                >
                  <option value="Toutes">Toutes les écoles</option>
                  {ALL_SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Placeholder pour futures options (durée, portée, composantes, etc.) */}
              <div className="hidden sm:block" />
            </div>
          )}
        </div>

        {/* Liste des sorts */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto" style={{ maxHeight: '66vh' }}>
          {filteredSpells.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              Aucun sort ne correspond à vos filtres.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSpells.map((spell) => {
                const selected = isSelected(spell);
                return (
                  <button
                    key={spell.id}
                    onClick={() => {
                      if (selectionMode && onSpellSelect) onSpellSelect(spell);
                    }}
                    className={`text-left rounded-xl p-3 border transition-all duration-200 bg-gray-900/40 hover:bg-gray-800/50 ${
                      selected ? 'border-green-500/50 ring-1 ring-green-500/30' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-gray-100 font-semibold">{spell.name}</h4>
                          {selected && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                              <Check size={12} />
                              Sélectionné
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                          <span className={spell.level === 0 ? 'text-blue-300' : 'text-purple-300'}>
                            {spell.level === 0 ? 'Tour de magie' : `Niveau ${spell.level}`}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{spell.school}</span>
                          <span>•</span>
                          <span className="truncate max-w-[14rem] sm:max-w-[18rem]">
                            {spell.range} • {spell.casting_time}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-300 line-clamp-3">{spell.description}</p>
                        {spell.higher_levels && (
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{spell.higher_levels}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          Composantes:{' '}
                          {[
                            spell.components.V ? 'V' : null,
                            spell.components.S ? 'S' : null,
                            spell.components.M ? `M (${spell.components.M})` : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400">
                      Classes: {spell.classes.map(canonicalizeClass).join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-gray-900/60 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {filteredSpells.length} résultat{filteredSpells.length > 1 ? 's' : ''}
          </div>

          <div className="flex items-center gap-2">
            {selectionMode && onConfirm && (
              <button
                onClick={() => onConfirm(selectedSpells)}
                disabled={selectedSpells.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedSpells.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Ajouter {selectedSpells.length > 0 ? `(${selectedSpells.length})` : ''}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-gray-800/80 text-gray-200 hover:bg-gray-700/80"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpellbookModal;