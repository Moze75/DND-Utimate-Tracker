import React from 'react';
import { X, Check, Sword, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../../types/dnd';
// ✅ AJOUT : Imports pour la vérification des maîtrises
import { checkWeaponProficiency, getPlayerWeaponProficiencies, WeaponProficiencyCheck } from '../../utils/weaponProficiencyChecker';
import { WeaponProficiencyWarningModal } from './WeaponProficiencyWarningModal';

const META_PREFIX = '#meta:';

type WeaponMeta = {
  damageDice: string;
  damageType: 'Tranchant' | 'Perforant' | 'Contondant';
  properties: string;
  range: string;
};
type ItemMeta = {
  type: 'weapon' | string;
  equipped?: boolean;
  weapon?: WeaponMeta;
  quantity?: number;
};

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try { return JSON.parse(metaLine.slice(META_PREFIX.length)); } catch { return null; }
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter(l => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}
function smartCapitalize(s: string) {
  const base = (s || '').trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function WeaponsManageModal({
  inventory,
  onClose,
  onEquip,
  onUnequip,
  // ✅ AJOUT : Prop player pour vérifier les maîtrises
  player,
}: {
  inventory: InventoryItem[];
  onClose: () => void;
  onEquip: (item: InventoryItem) => Promise<void> | void;
  onUnequip: (item: InventoryItem) => Promise<void> | void;
  // ✅ AJOUT : Type pour le player
  player: any;
}) {
  const [q, setQ] = React.useState('');
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  
  // ✅ AJOUT : États pour la modal d'avertissement
  const [showProficiencyWarning, setShowProficiencyWarning] = React.useState(false);
  const [proficiencyCheck, setProficiencyCheck] = React.useState<WeaponProficiencyCheck | null>(null);
  const [pendingWeaponEquip, setPendingWeaponEquip] = React.useState<InventoryItem | null>(null);
  
  const weapons = React.useMemo(() => {
    return inventory
      .map(it => ({ it, meta: parseMeta(it.description) }))
      .filter(({ meta }) => (meta?.type === 'weapon'));
  }, [inventory]);

  const equipped = weapons.filter(w => w.meta?.equipped === true);
  const others = weapons.filter(w => w.meta?.equipped !== true);

  const filterByQuery = (arr: { it: InventoryItem; meta: ItemMeta | null }[]) => {
    const query = q.trim().toLowerCase();
    if (!query) return arr;
    return arr.filter(({ it, meta }) => {
      const name = (it.name || '').toLowerCase();
      const desc = visibleDescription(it.description).toLowerCase();
      const props = (meta?.weapon?.properties || '').toLowerCase();
      return name.includes(query) || desc.includes(query) || props.includes(query);
    });
  };

  // ✅ AJOUT : Fonction pour équiper avec vérification des maîtrises
  const handleEquipWithProficiencyCheck = async (item: InventoryItem) => {
    const playerProficiencies = getPlayerWeaponProficiencies(player);
    const meta = parseMeta(item.description);
    const explicitCategory = meta?.weapon?.category;
    const weaponProperties = meta?.weapon?.properties;
    const proficiencyResult = checkWeaponProficiency(item.name, playerProficiencies, explicitCategory, weaponProperties);

    if (!proficiencyResult.isProficient) {
      // Arme non maîtrisée : afficher l'avertissement
      setPendingWeaponEquip(item);
      setProficiencyCheck(proficiencyResult);
      setShowProficiencyWarning(true);
      // Ne pas réinitialiser pendingId ici car la modal va s'afficher
      return { needsConfirmation: true };
    } else {
      // Arme maîtrisée : équiper directement
      await onEquip(item);
      return { needsConfirmation: false };
    }
  };

  // ✅ AJOUT : Gestionnaires pour la modal d'avertissement
  const handleProficiencyWarningConfirm = async () => {
    setShowProficiencyWarning(false);
    if (pendingWeaponEquip) {
      try {
        await onEquip(pendingWeaponEquip);
      } catch (error) {
        console.error('Erreur lors de l\'\u00e9quipement:', error);
      } finally {
        setPendingWeaponEquip(null);
        setProficiencyCheck(null);
        setPendingId(null); // Réinitialiser l'état de pending
      }
    }
  };

  const handleProficiencyWarningCancel = () => {
    setShowProficiencyWarning(false);
    setPendingWeaponEquip(null);
    setProficiencyCheck(null);
    setPendingId(null); // Réinitialiser l'état de pending
  };

  // ✅ AJOUT : Fonction pour vérifier les maîtrises et afficher un indicateur
  const getProficiencyStatus = (weaponName: string, meta: ItemMeta | null) => {
    const playerProficiencies = getPlayerWeaponProficiencies(player);
    const explicitCategory = meta?.weapon?.category;
    const weaponProperties = meta?.weapon?.properties;
    const proficiencyResult = checkWeaponProficiency(weaponName, playerProficiencies, explicitCategory, weaponProperties);
    return proficiencyResult;
  };

  const Section = ({ title, list, showEquipped }: { 
    title: string; 
    list: { it: InventoryItem; meta: ItemMeta | null }[];
    showEquipped: boolean;
  }) => (
    <div className="space-y-2">
      <h4 className="text-gray-200 font-semibold text-sm">{title}</h4>
      {list.length === 0 ? (
        <div className="text-sm text-gray-500">Aucune arme</div>
      ) : (
        list.map(({ it, meta }) => {
          const w = meta?.weapon;
          const isPending = pendingId === it.id;
          const isEquipped = meta?.equipped === true;

          // ✅ AJOUT : Vérification des maîtrises pour l'affichage
          const proficiencyStatus = getProficiencyStatus(it.name, meta);
          
          return (
            <div key={it.id} className="rounded-md border border-gray-700/50 bg-gray-800/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sword size={16} className="text-red-400 shrink-0" />
                    <div className="font-medium text-gray-100 truncate">{smartCapitalize(it.name)}</div>
                    {/* ✅ AJOUT : Indicateur de maîtrise */}
                    {!proficiencyStatus.isProficient && (
                      <AlertTriangle 
                        size={14} 
                        className="text-yellow-500 shrink-0" 
                        title={`Non maîtrisé : ${proficiencyStatus.reason}`}
                      />
                    )}
                  </div>
                  {w && (
                    <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                      <div>Dés: {w.damageDice} {w.damageType}</div>
                      {w.properties && <div>Propriété: {w.properties}</div>}
                      {w.range && <div>Portée: {w.range}</div>}
                      {/* ✅ AJOUT : Affichage du statut de maîtrise */}
                    <div className={proficiencyStatus.shouldApplyProficiencyBonus ? 'text-green-400' : 'text-yellow-400'}>
                      {proficiencyStatus.shouldApplyProficiencyBonus ? '✓ Maîtrisé (bonus +2)' : '○ Non maîtrisé (pas de bonus)'}
                      {proficiencyStatus.category && ` (${proficiencyStatus.category})`}
                    </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {showEquipped ? (
                    // Section "Armes équipées" : Badge vert + bouton déséquiper
                    <>
                      <span className="px-2 py-1 rounded text-xs border border-green-500/40 text-green-300 bg-green-900/20">
                        Équipé
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isPending) return;
                          setPendingId(it.id);
                          try { 
                            await onUnequip(it); 
                          } catch (error) {
                            console.error('Erreur déséquipement:', error);
                          } finally { 
                            setPendingId(null); 
                          }
                        }}
                        disabled={isPending}
                        className={`px-2 py-1 rounded text-xs border ${
                          isPending 
                            ? 'border-gray-500 text-gray-500 bg-gray-800/50 cursor-not-allowed'
                            : 'border-red-500/40 text-red-300 hover:bg-red-900/20'
                        }`}
                        title={isPending ? "Traitement en cours..." : "Déséquiper"}
                      >
                        {isPending ? 'En cours...' : 'Déséquiper'}
                      </button>
                    </>
                  ) : (
                    // Section "Autres armes" : Badge gris + bouton équiper
                    <>
                      <span className="px-2 py-1 rounded text-xs border border-gray-600 text-gray-300 bg-gray-800/20">
                        Non équipé
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isPending) return;
                          setPendingId(it.id);
                          try {
                            // ✅ MODIFICATION : Utiliser la fonction avec vérification
                            const result = await handleEquipWithProficiencyCheck(it);
                            // Si une confirmation est nécessaire, ne pas réinitialiser pendingId
                            // car l'équipement se fera après confirmation
                            if (!result?.needsConfirmation) {
                              setPendingId(null);
                            }
                          } catch (error) {
                            console.error('Erreur équipement:', error);
                            setPendingId(null);
                          }
                        }}
                        disabled={isPending}
                        className={`px-2 py-1 rounded text-xs border ${
                          isPending 
                            ? 'border-gray-500 text-gray-500 bg-gray-800/50 cursor-not-allowed'
                            : proficiencyStatus.isProficient
                              ? 'border-green-500/40 text-green-300 bg-green-900/20 hover:border-green-400/60'
                              : 'border-yellow-500/40 text-yellow-300 bg-yellow-900/20 hover:border-yellow-400/60'
                        }`}
                        title={
                          isPending 
                            ? "Traitement en cours..." 
                            : proficiencyStatus.isProficient 
                              ? "Équiper" 
                              : "Équiper (non maîtrisé - désavantage aux attaques)"
                        }
                      >
                        {isPending ? 'En cours...' : (
                          <>
                            <Check size={12} />
                            {proficiencyStatus.isProficient ? 'Équiper' : 'Équiper ⚠'}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[10050]"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 rounded-lg border border-gray-700 shadow-xl">
          <div className="flex items-center justify-between p-3 border-b border-gray-800 sticky top-0 bg-gray-900/95">
            <h3 className="text-gray-100 font-semibold">Mes armes</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg" aria-label="Fermer">
              <X />
            </button>
          </div>

          <div className="p-3 space-y-4">
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher une arme (nom, description, propriété)…"
                className="input-dark px-3 py-2 rounded-md w-full"
              />
            </div>

            {/* ✅ AJOUT : Légende des indicateurs */}
              <div className="text-xs text-gray-400 bg-gray-800/30 p-2 rounded border border-gray-700/50">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="text-green-400">✓</span> Maîtrisé (bonus de maîtrise)
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={12} className="text-yellow-500" />
                    Non maîtrisé (pas de bonus)
                  </span>
                </div>
              </div>

            <Section title="Armes équipées" list={filterByQuery(equipped)} showEquipped={true} />
            <Section title="Autres armes dans le sac" list={filterByQuery(others)} showEquipped={false} />
          </div>
        </div>
      </div>

      {/* ✅ AJOUT : Modal d'avertissement pour les maîtrises */}
      <WeaponProficiencyWarningModal
        isOpen={showProficiencyWarning}
        weaponName={pendingWeaponEquip?.name || ''}
        proficiencyCheck={proficiencyCheck!}
        onConfirm={handleProficiencyWarningConfirm}
        onCancel={handleProficiencyWarningCancel}
      />
    </>
  );
}