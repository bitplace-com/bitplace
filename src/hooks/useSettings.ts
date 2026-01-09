import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useTheme } from 'next-themes';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileUpdates {
  display_name?: string | null;
  country_code?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_website?: string | null;
}

// Normalize social handle to full URL
function normalizeSocialHandle(input: string | null | undefined, domain: string): string | null {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  // If already a valid URL for this domain, return as-is
  if (trimmed.startsWith(`https://${domain}/`) || trimmed.startsWith(`https://www.${domain}/`)) {
    return trimmed;
  }
  
  // Remove @ prefix if present
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  
  // If it looks like a full URL to another domain, return as-is
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle;
  }
  
  // Build URL from handle
  return `https://${domain}/${handle}`;
}

// Validate website URL
function isValidWebsiteUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return true; // Empty is valid
  
  try {
    const parsed = new URL(url.trim());
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Normalize website URL
function normalizeWebsite(input: string | null | undefined): string | null {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  // Add https:// if no protocol
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

export function useSettings() {
  const { user, updateUser, refreshUser } = useWallet();
  const { theme, setTheme } = useTheme();
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Save profile changes
  const saveProfile = useCallback(async (updates: ProfileUpdates): Promise<boolean> => {
    if (!user) {
      toast.error('Not authenticated');
      return false;
    }

    setIsSaving(true);
    
    try {
      // Normalize social links before saving
      const normalizedUpdates: ProfileUpdates = { ...updates };
      
      if ('social_x' in updates) {
        normalizedUpdates.social_x = normalizeSocialHandle(updates.social_x, 'x.com');
      }
      
      if ('social_instagram' in updates) {
        normalizedUpdates.social_instagram = normalizeSocialHandle(updates.social_instagram, 'instagram.com');
      }
      
      if ('social_website' in updates) {
        const normalized = normalizeWebsite(updates.social_website);
        if (normalized && !isValidWebsiteUrl(normalized)) {
          toast.error('Invalid website URL');
          setIsSaving(false);
          return false;
        }
        normalizedUpdates.social_website = normalized;
      }

      await updateUser(normalizedUpdates);
      toast.success('Settings saved');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, updateUser]);

  // Upload avatar file
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('bitplace_session_token');
    if (!token) {
      toast.error('Not authenticated');
      return null;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('avatar-upload', {
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      // Refresh user to get updated avatar_url
      await refreshUser();
      
      toast.success('Avatar uploaded');
      return data.avatar_url;
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [refreshUser]);

  return {
    // User settings from context
    settings: {
      display_name: user?.display_name || '',
      country_code: user?.country_code || null,
      avatar_url: user?.avatar_url || null,
      bio: (user as any)?.bio || null,
      social_x: (user as any)?.social_x || null,
      social_instagram: (user as any)?.social_instagram || null,
      social_website: (user as any)?.social_website || null,
    },
    // Preferences (local)
    theme: theme as 'light' | 'dark' | 'system',
    setTheme,
    soundEnabled,
    toggleSound,
    // Actions
    saveProfile,
    uploadAvatar,
    isSaving,
    isUploading,
  };
}
