import React, { useState } from 'react';
import { Backpack, Plus, Trash2, Shield, Sword, Settings, FlaskRound as Flask, Star, Coins } from 'lucide-react';
import { Player, InventoryItem } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;
  // Champs spécifiques
  armor_bonus?: number | null;   // pour Armure
  shield_bonus?: number | null;  // pour Bouclier
  proficiency?: string | null;   // uniquement pour Armure
}

interface EquipmentModalProps {
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry';
  equipment: Equipment | null;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  setIsEditing: (value: boolean) => void;
}

/* Modal Armure: Nom, Description, Bonus d'armure, Maîtrise */
function ArmorEditModal({
  equipment,
  onClose,
  onSave,
  setIsEditing,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  setIsEditing: (value: boolean) => void;
}) {
  const [name, setName] = useState<string>(equipment?.name || 'Armure');
  const [description, setDescription] = useState<string>(equipment?.description || '');
  const [armorBonus, setArmorBonus] = useState<string>(
    equipment?.armor_bonus != null ? String(equipment.armor_bonus) : ''
  );
  const [proficiency, setProficiency] = useState<string>(equipment?.proficiency || '');

  const handleSave = () => {
    const bonus = armorBonus.trim() === '' ? null : Number.parseInt(armorBonus, 10);
    if (armorBonus.trim() !== '' && Number.isNaN(bonus)) {
      toast.error("Le bonus d'armure doit être un nombre");
      return;
    }
    onSave({
      name: name.trim() || 'Armure',
      description: description.trim(),
      isTextArea: false,
      armor_bonus: bonus,
      proficiency: proficiency.trim() || null,
    });
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Shield size={20} className="text-purple-500" />
          Armure
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom de l'objet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              placeholder="Ex: Cuir clouté"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={4}
              placeholder="Détails, propriétés, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Bonus d'armure</label>
              <input
                type="number"
                inputMode="numeric"
                value={armorBonus}
                onChange={(e) => setArmorBonus(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md"
                placeholder="Ex: 1, 2, 3..."
              />
              <p className="text-xs text-gray-500 mt-1">S'ajoute à la CA de base.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Maîtrise</label>
              <input
                type="text"
                value={proficiency || ''}
                onChange={(e) => setProficiency(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md"
                placeholder="Ex: Légère, Intermédiaire, Lourde..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="btn-primary flex-1 px-4 py-2 rounded-lg">
            Sauvegarder
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              onClose();
            }}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* Modal Bouclier: Nom, Description, Bonus de bouclier (pas de Maîtrise) */
function ShieldEditModal({
  equipment,
  onClose,
  onSave,
  setIsEditing,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  setIsEditing: (value: boolean) => void;
}) {
  const [name, setName] = useState<string>(equipment?.name || 'Bouclier');
  const [description, setDescription] = useState<string>(equipment?.description || '');
  const [shieldBonus, setShieldBonus] = useState<string>(
    equipment?.shield_bonus != null ? String(equipment.shield_bonus) : ''
  );

  const handleSave = () => {
    const bonus = shieldBonus.trim() === '' ? null : Number.parseInt(shieldBonus, 10);
    if (shieldBonus.trim() !== '' && Number.isNaN(bonus)) {
      toast.error("Le bonus de bouclier doit être un nombre");
      return;
    }
    onSave({
      name: name.trim() || 'Bouclier',
      description: description.trim(),
      isTextArea: false,
      shield_bonus: bonus,
    });
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Shield size={20} className="text-blue-500" />
          Bouclier
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom de l'objet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              placeholder="Ex: Bouclier en acier"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={4}
              placeholder="Détails, propriétés, etc."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Bonus de bouclier</label>
            <input
              type="number"
              inputMode="numeric"
              value={shieldBonus}
              onChange={(e) => setShieldBonus(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              placeholder="Ex: 1, 2..."
            />
            <p className="text-xs text-gray-500 mt-1">S'ajoute à la CA de base.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="btn-primary flex-1 px-4 py-2 rounded-lg">
            Sauvegarder
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              onClose();
            }}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

const EquipmentModal = ({ type, equipment, onClose, onSave, setIsEditing }: EquipmentModalProps) => {
  const [text, setText] = useState(
    type === 'armor' ? equipment?.description || '' :
    type === 'potion' ? equipment?.description || '' :
    type === 'weapon' ? equipment?.description || '' :
    type === 'shield' ? equipment?.description || '' :
    type === 'shoes' ? equipment?.description || '' :
    type === 'bag' ? equipment?.description || '' :
    type === 'jewelry' ? equipment?.description || '' : ''
  );

  // On n'utilise plus ce petit modal pour armure et bouclier
  if (type === 'armor' || type === 'shield') return null;

  const handleSave = () => {
    onSave({
      name: getTitle(type),
      description: text,
      isTextArea: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
        <div className="flex items-center gap-2">
          {type === 'potion' ? <Flask size={20} className="text-green-500" /> : null}
          {type === 'weapon' ? <Sword size={20} className="text-red-500" /> : null}
          <h3 className="text-lg font-semibold text-gray-100">
            {getTitle(type)}
          </h3>
        </div>

        <textarea
          placeholder={`Liste des ${getTitle(type).toLowerCase()} en votre possession...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-dark w-full px-3 py-2 rounded-md"
          rows={8}
        />

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            className="btn-primary flex-1 px-4 py-2 rounded-lg"
          >
            Sauvegarder
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              onClose();
            }}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry') => {
  switch (type) {
    case 'potion': return 'Potions';
    case 'shield': return 'Bouclier';
    case 'armor': return 'Armure';
    case 'weapon': return 'Armes';
    case 'shoes': return 'Chaussures';
    case 'bag': return 'Sac à dos';
    case 'jewelry': return 'Bijoux';
    default: return '';
  }
};

interface InfoBubbleProps {
  equipment: Equipment | null;
  position: string;
  onClose: () => void;
  setIsEditing: (value: boolean) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'jewelry';
  onDelete?: () => void;
}

const InfoBubble = ({ equipment, position, onClose, setIsEditing, type, onDelete }: InfoBubbleProps) => {
  if (!equipment) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[61]" onClick={onClose} />
      <div className="relative p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-96 border border-gray-700/50 z-[62]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
          <div className="flex items-center gap-1">
            {(type === 'armor' || type === 'shield') && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Supprimer l'objet ?")) {
                    onDelete();
                  }
                }}
                className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors hover:text-red-500"
                title="Supprimer l'objet"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors hover:text-red-500"
              title="Modifier"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Rendu type "Sac": nom + description + infos */}
        <div className="space-y-1">
          {equipment.name && (
            <h5 className="font-medium text-gray-100">{equipment.name}</h5>
          )}
          {equipment.description && (
            <p className="text-sm text-gray-400">{equipment.description}</p>
          )}

          {/* Détails spécifiques */}
          {type === 'armor' && (
            <div className="mt-2 text-sm text-gray-300 space-y-1">
              {equipment.armor_bonus != null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bonus d'armure</span>
                  <span className="font-medium text-gray-100">+{equipment.armor_bonus}</span>
                </div>
              )}
              {equipment.proficiency && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Maîtrise</span>
                  <span className="font-medium text-gray-100">{equipment.proficiency}</span>
                </div>
              )}
            </div>
          )}

          {type === 'shield' && (
            <div className="mt-2 text-sm text-gray-300 space-y-1">
              {equipment.shield_bonus != null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bonus de bouclier</span>
                  <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  onEquip: (equipment: Equipment | null) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'jewelry';
  bubblePosition: string;
}

const EquipmentSlot = ({ icon, position, equipment, onEquip, type, bubblePosition }: EquipmentSlotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 

  const handleClick = () => {
    if (isOpen) return;
    setShowInfo(prev => !prev);
  };

  const handleClose = () => {
    setShowInfo(false);
  };

  const handleEdit = () => {
    setShowInfo(false);
    setIsEditing(true);
  };

  return (<>
    <button
      onClick={handleClick}
      className={`absolute ${position} ${type === 'bag' ? 'w-24 h-24' : 'w-12 h-12'} rounded-lg hover:bg-gray-700/20 transition-all duration-200 ${
        showInfo ? 'border-red-500/50 shadow-lg shadow-red-900/20' : 'border-gray-600/50'
      } hover:border-gray-500/50 flex items-center justify-center cursor-pointer`}
      style={{ zIndex: showInfo ? 50 : 10 }}
    >
      <div className="w-full h-full flex items-center justify-center">
        {type === 'bag' ? icon : React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
    </button>
    
    {showInfo && (
      <>
        <InfoBubble
          equipment={equipment}
          position={bubblePosition}
          onClose={handleClose}
          setIsEditing={handleEdit}
          type={type}
          onDelete={
            (type === 'armor' || type === 'shield')
              ? () => onEquip(null)
              : undefined
          }
        />
      </>
    )}
    
    {isEditing && (
      type === 'armor' ? (
        <ArmorEditModal
          equipment={equipment}
          onClose={() => setIsEditing(false)}
          onSave={(eq) => onEquip(eq)}
          setIsEditing={setIsEditing}
        />
      ) : type === 'shield' ? (
        <ShieldEditModal
          equipment={equipment}
          onClose={() => setIsEditing(false)}
          onSave={(eq) => onEquip(eq)}
          setIsEditing={setIsEditing}
        />
      ) : (
        <EquipmentModal
          type={type}
          equipment={equipment}
          onClose={() => {
            setIsEditing(false);
          }}
          onSave={(eq) => onEquip(eq)}
          setIsEditing={setIsEditing}
        />
      )
    )}
  </>
  );
};

interface EquipmentTabProps {
  player: Player;
  inventory: InventoryItem[];
  onPlayerUpdate: (player: Player) => void;
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
}

type Currency = 'gold' | 'silver' | 'copper';

interface CurrencyInputProps {
  currency: Currency;
  value: number;
  onAdd: (amount: number) => void;
  onSpend: (amount: number) => void;
}

const CurrencyInput = ({ currency, value, onAdd, onSpend }: CurrencyInputProps) => {
  const [amount, setAmount] = useState<string>('');

  const getCurrencyColor = (curr: Currency) => {
    switch (curr) {
      case 'gold': return 'text-yellow-500';
      case 'silver': return 'text-gray-300';
      case 'copper': return 'text-orange-400';
      default: return 'text-gray-300';
    }
  };

  const getCurrencyName = (curr: Currency) => {
    switch (curr) {
      case 'gold': return 'Or';
      case 'silver': return 'Argent';
      case 'copper': return 'Cuivre';
      default: return curr;
    }
  };

  const handleAction = (isAdding: boolean) => {
    const numAmount = parseInt(amount) || 0;
    if (numAmount > 0) {
      isAdding ? onAdd(numAmount) : onSpend(numAmount);
      setAmount('');
    }
  };

  return (
    <div className="flex items-center gap-2 h-11 relative">
      <div className={`w-16 text-center font-medium ${getCurrencyColor(currency)}`}>
        {getCurrencyName(currency)}
      </div>
      <div className="w-16 h-full text-center bg-gray-800/50 rounded-md flex items-center justify-center font-bold">
        {value}
      </div>
      <div className="flex-1 flex items-center justify-end gap-1">
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-dark w-20 h-11 px-2 rounded-md text-center text-base"
          placeholder="0"
        />
        <button
          onClick={() => handleAction(true)}
          className="h-11 w-[72px] text-base text-green-500 hover:bg-green-900/30 rounded-md transition-colors whitespace-nowrap border border-green-500/20 hover:border-green-500/40 flex items-center justify-center"
          title="Ajouter"
        >
          Ajouter
        </button>
        <button
          onClick={() => handleAction(false)}
          className="h-11 w-[72px] text-base text-red-500 hover:bg-red-900/30 rounded-md transition-colors whitespace-nowrap border border-red-500/20 hover:border-red-500/40 flex items-center justify-center"
          title="Retirer"
        >
          Dépenser
        </button>
      </div>
    </div>
  );
};

export function EquipmentTab({ 
  player, 
  inventory,
  onPlayerUpdate,
  onInventoryUpdate
}: EquipmentTabProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [weapon, setWeapon] = useState<Equipment | null>(player.equipment?.weapon || null);
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  const [potion, setPotion] = useState<Equipment | null>(player.equipment?.potion || null);
  const [shoes, setShoes] = useState<Equipment | null>(player.equipment?.shoes || null);
  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);
  const [jewelry, setJewelry] = useState<Equipment | null>(player.equipment?.jewelry || null);

  const saveEquipment = async (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'shoes' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const nextEquipment = {
        ...player.equipment,
        [type]: equipment
      };

      const { error } = await supabase
        .from('players')
        .update({
          equipment: nextEquipment
        })
        .eq('id', player.id);

      if (error) throw error;

      onPlayerUpdate({
        ...player,
        equipment: nextEquipment
      });

      const label =
        type === 'armor' ? 'Armure'
        : type === 'weapon' ? 'Armes'
        : type === 'shield' ? 'Bouclier'
        : type === 'potion' ? 'Potions'
        : type === 'shoes' ? 'Chaussures'
        : type === 'bag' ? 'Sac à dos'
        : 'Bijoux';

      toast.success(`${label} ${equipment ? 'mis à jour' : 'supprimé'}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const addItemToInventory = async () => {
    if (!newItemName.trim()) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([
          {
            player_id: player.id,
            name: newItemName.trim(),
            description: newItemDescription.trim() || null
          }
        ]);

      if (error) throw error;

      const { data: newInventory } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', player.id);

      if (newInventory) {
        onInventoryUpdate(newInventory);
      }

      setNewItemName('');
      setNewItemDescription('');
      toast.success('Objet ajouté à l\'inventaire');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet:', error);
      toast.error('Erreur lors de l\'ajout de l\'objet');
    }
  };

  const removeItemFromInventory = async (itemId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet objet ?')) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        onInventoryUpdate(inventory.filter(item => item.id !== itemId));
        toast.success('Objet supprimé');
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'objet:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const updatePlayerMoney = async (currency: Currency, amount: number, isAdding: boolean) => {
    const newAmount = Math.max(0, player[currency] + (isAdding ? amount : -amount));
    
    try {
      const { error } = await supabase
        .from('players')
        .update({ [currency]: newAmount })
        .eq('id', player.id);

      if (error) throw error;

      onPlayerUpdate({
        ...player,
        [currency]: newAmount
      });

      toast.success(`${isAdding ? 'Ajout' : 'Retrait'} de ${amount} ${currency}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'argent:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Inventaire</h2>
        </div>
        <div className="p-4">
          <div className="relative w-full mx-auto aspect-[2/3] bg-gray-800/50 rounded-lg overflow-hidden">
            <img
              src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//Silouete.png"
              alt="Character silhouette"
              className="absolute inset-0 w-full h-full object-contain opacity-30"
              style={{ mixBlendMode: 'luminosity' }}
            />
            
            {/* Armor slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-purple-500" />}
              position="top-[25%] left-1/2 -translate-x-1/2 bg-gray-800/50"
              equipment={armor || { name: 'Armure', description: '', isTextArea: false }}
              onEquip={(equipment) => {
                setArmor(equipment);
                saveEquipment('armor', equipment);
              }}
              type="armor"
              bubblePosition="right-[5%] top-[15%]"
            />
            
            {/* Shield slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-blue-500" />}
              position="top-[45%] left-[15%] bg-gray-800/50"
              equipment={shield || { name: 'Bouclier', description: '', isTextArea: false }}
              onEquip={(equipment) => {
                setShield(equipment as Equipment);
                saveEquipment('shield', equipment as Equipment);
              }}
              type="shield"
              bubblePosition="left-[5%] top-[15%]"
            />
            
            {/* Weapon slot */}
            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[45%] right-[15%] bg-gray-800/50"
              equipment={weapon || { name: 'Aucune arme', description: '' }}
              onEquip={(equipment) => {
                setWeapon(equipment as Equipment);
                saveEquipment('weapon', equipment as Equipment);
              }}
              type="weapon"
              bubblePosition="right-[5%] top-[15%]"
            />
            
            {/* Potion slot */}
            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" title="Potions et poisons" />}
              position="top-[5%] right-[5%] bg-gray-800/50" 
              equipment={potion || { name: 'Potions et poisons', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setPotion(equipment as Equipment);
                saveEquipment('potion', equipment as Equipment);
              }}
              type="potion"
              bubblePosition="right-[5%] top-[5%]"
            />
            
            {/* Jewelry slot */}
            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%] bg-gray-800/50"
              equipment={jewelry || { name: 'Bijoux', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setJewelry(equipment as Equipment);
                saveEquipment('jewelry', equipment as Equipment);
              }}
              type="jewelry"
              bubblePosition="right-[5%] top-[15%]"
            />

            {/* Shoes slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-yellow-500" />}
              position="bottom-[5%] left-1/2 -translate-x-1/2 bg-gray-800/50"
              equipment={shoes || { name: 'Chaussures', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setShoes(equipment as Equipment);
                saveEquipment('shoes', equipment as Equipment);
              }}
              type="shoes"
              bubblePosition="right-[5%] bottom-[15%]"
            />

            {/* Bag slot */}
            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              onEquip={(equipment) => {
                setBag(equipment as Equipment);
                saveEquipment('bag', equipment as Equipment);
              }}
              type="bag"
              bubblePosition="left-[5%] bottom-[5%]"
            />
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Coins className="text-green-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Mon argent</h2>
        </div>
        <div className="p-4 space-y-2">
          {(['gold', 'silver', 'copper'] as Currency[]).map(currency => (
            <CurrencyInput
              key={currency}
              currency={currency}
              value={player[currency]}
              onAdd={(amount) => updatePlayerMoney(currency, amount, true)}
              onSpend={(amount) => updatePlayerMoney(currency, amount, false)}
            />
          ))}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Sac</h2>
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-3 mb-6">
            <input
              type="text"
              placeholder="Nom de l'objet"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
            />
            <textarea
              placeholder="Description (optionnelle)"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg resize-none"
              rows={2}
            />
            <button
              onClick={addItemToInventory}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
            >
              <Plus size={20} />
              Ajouter à l'inventaire
            </button>
          </div>

          <div className="space-y-2">
            {inventory.map((item) => (
              <div key={item.id} className="inventory-item flex items-start justify-between">
                <div className="flex-1 mr-2">
                  <h5 className="font-medium text-gray-100">{item.name}</h5>
                  {item.description && (
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() => removeItemFromInventory(item.id)}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
                  title="Supprimer l'objet"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}