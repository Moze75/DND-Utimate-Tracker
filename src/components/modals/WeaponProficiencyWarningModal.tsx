import React from 'react';
import { AlertTriangle, X, Sword, Shield } from 'lucide-react';
import { WeaponProficiencyCheck } from '../../utils/weaponProficiencyChecker';

interface WeaponProficiencyWarningModalProps {
  isOpen: boolean;
  weaponName: string;
  proficiencyCheck: WeaponProficiencyCheck;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WeaponProficiencyWarningModal({
  isOpen,
  weaponName,
  proficiencyCheck,
  onConfirm,
  onCancel
}: WeaponProficiencyWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001]" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fixed inset-0 bg-black/70" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-yellow-500/50 rounded-lg p-6 w-[min(32rem,95vw)]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-white">Maîtrise d'arme manquante</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <Sword className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-yellow-200 mb-1">
                {weaponName}
              </div>
              <div className="text-sm text-yellow-300">
                {proficiencyCheck.reason}
              </div>
              {proficiencyCheck.category && (
                <div className="text-xs text-yellow-400 mt-1">
                  Catégorie : {proficiencyCheck.category}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-300 leading-relaxed">
            <p className="mb-2">
              <strong>Votre personnage ne maîtrise pas cette arme.</strong>
            </p>
            <div className="flex items-start gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <span>Le <span className="text-blue-400 font-medium">bonus de maîtrise ne s'appliquera pas</span> aux jets d'attaque avec cette arme.</span>
            </div>
            <p className="text-gray-400">
              Vous pouvez acquérir cette maîtrise via un don, une capacité de classe, ou l'accord du MJ.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
          >
            Équiper sans bonus
          </button>
        </div>
      </div>
    </div>
  );
}