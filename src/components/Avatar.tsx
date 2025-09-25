import React, { useState, useRef } from 'react';
import { User, Upload } from 'lucide-react';
import { AvatarModal } from './AvatarModal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AvatarProps {
  url: string | null;
  playerId: string;
  onAvatarUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export function Avatar({ url, playerId, onAvatarUpdate, size = 'md', editable = false }: AvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-40 h-40',
    lg: 'w-56 h-56'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setIsUploading(true);
    try {
      if (url) {
        const oldPath = url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('avatars')
          .remove([oldPath]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${playerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar_url: publicUrl })
        .eq('id', playerId);

      if (updateError) throw updateError;

      onAvatarUpdate(publicUrl);
      toast.success('Avatar mis à jour');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', error);
      toast.error('Erreur lors de la mise à jour de l\'avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-800/50">
      {isUploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : url ? (
        <div 
          className={`relative w-full h-full ${
            url ? 'cursor-pointer hover:opacity-90 transition-opacity' : 
            editable ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'
          }`}
          onClick={() => {
            if (editable) {
              fileInputRef.current?.click();
            } else if (url) {
              setShowModal(true);
            }
          }}
        >
          <img
            src={url}
            alt="Avatar" 
            className="w-full h-full object-cover select-none"
          />
          {editable && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-gray-900/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Upload className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center ${
            editable ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'
          }`}
          onClick={() => {
            if (editable) {
              fileInputRef.current?.click();
            }
          }}
        >
          <User className="w-8 h-8 text-gray-400" />
          {editable && <Upload className="w-4 h-4 text-gray-500 mt-1" />}
        </div>
      )}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      )}
      {showModal && url && (
        <AvatarModal url={url} onClose={() => setShowModal(false)} />
      )}
    </div>
  ); 
}