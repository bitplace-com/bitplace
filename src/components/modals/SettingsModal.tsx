import { useState, useEffect, useRef } from "react";
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CountryPicker } from "@/components/ui/country-picker";
import { useSettings } from "@/hooks/useSettings";
import { useWallet } from "@/contexts/WalletContext";
import { generateAvatarGradient } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MAX_BIO_LENGTH = 160;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, isAuthenticated } = useWallet();
  const { 
    settings, 
    soundEnabled, 
    toggleSound,
    hapticsEnabled,
    toggleHaptics,
    hapticsSupported,
    saveProfile,
    uploadAvatar,
    isSaving,
    isUploading,
  } = useSettings();

  // Form state
  const [displayName, setDisplayName] = useState(settings.display_name);
  const [countryCode, setCountryCode] = useState<string | null>(settings.country_code);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatar_url || '');
  const [bio, setBio] = useState(settings.bio || '');
  const [socialX, setSocialX] = useState(settings.social_x || '');
  const [socialInstagram, setSocialInstagram] = useState(settings.social_instagram || '');
  const [socialDiscord, setSocialDiscord] = useState(settings.social_discord || '');
  const [socialWebsite, setSocialWebsite] = useState(settings.social_website || '');
  
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form with settings when modal opens or settings change
  useEffect(() => {
    if (open) {
      setDisplayName(settings.display_name);
      setCountryCode(settings.country_code);
      setAvatarUrl(settings.avatar_url || '');
      setBio(settings.bio || '');
      setSocialX(settings.social_x || '');
      setSocialInstagram(settings.social_instagram || '');
      setSocialDiscord(settings.social_discord || '');
      setSocialWebsite(settings.social_website || '');
      setAvatarPreview(null);
      setUsernameError(null);
    }
  }, [open, settings]);

  const validateUsername = (value: string): boolean => {
    if (!value) {
      setUsernameError(null);
      return true;
    }
    if (value.length < 3 || value.length > 20) {
      setUsernameError('Must be 3-20 characters');
      return false;
    }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameError('Only letters, numbers, underscores');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleUsernameChange = (value: string) => {
    setDisplayName(value);
    validateUsername(value);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload a JPG, PNG, or WebP image.'
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: `Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const url = await uploadAvatar(file);
    if (url) {
      setAvatarUrl(url);
    } else {
      setAvatarPreview(null);
    }
  };

  const hasChanges = () => {
    return (
      displayName !== settings.display_name ||
      countryCode !== settings.country_code ||
      avatarUrl !== (settings.avatar_url || '') ||
      bio !== (settings.bio || '') ||
      socialX !== (settings.social_x || '') ||
      socialInstagram !== (settings.social_instagram || '') ||
      socialDiscord !== (settings.social_discord || '') ||
      socialWebsite !== (settings.social_website || '')
    );
  };

  const handleSave = async () => {
    if (!validateUsername(displayName)) return;
    
    const success = await saveProfile({
      display_name: displayName || null,
      country_code: countryCode,
      avatar_url: avatarUrl || null,
      bio: bio || null,
      social_x: socialX || null,
      social_instagram: socialInstagram || null,
      social_discord: socialDiscord || null,
      social_website: socialWebsite || null,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  // Avatar display
  const avatarGradient = generateAvatarGradient(user?.wallet_address || '');
  const avatarInitial = (displayName?.[0] || user?.wallet_address?.[0] || '?').toUpperCase();
  const displayAvatarUrl = avatarPreview || avatarUrl || settings.avatar_url;

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      icon={<PixelIcon name="settings" className="h-5 w-5" />}
      size="md"
    >
      <div className="space-y-8">
        {/* Identity Section */}
        <section className="space-y-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PixelIcon name="user" className="h-4 w-4" />
            Identity
          </h3>
          
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div 
              className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border"
              style={!displayAvatarUrl ? { background: avatarGradient } : undefined}
            >
              {displayAvatarUrl ? (
                <img 
                  src={displayAvatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                  {avatarInitial}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isAuthenticated || isUploading}
                className="gap-2"
              >
                <PixelIcon name="upload" className="h-4 w-4" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP. Max 10MB.
              </p>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={displayName}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Your nickname"
              disabled={!isAuthenticated}
              className={cn(usernameError && "border-destructive")}
            />
            {usernameError ? (
              <p className="text-xs text-destructive">{usernameError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">3-20 chars, letters, numbers, underscores</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2.5">
            <Label>Country</Label>
            <CountryPicker
              value={countryCode || undefined}
              onChange={setCountryCode}
              placeholder="Select country"
            />
          </div>
        </section>

        <Separator className="my-2" />

        {/* About Section */}
        <section className="space-y-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PixelIcon name="book" className="h-4 w-4" />
            About
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className={cn(
                "text-xs",
                bio.length > MAX_BIO_LENGTH ? "text-destructive" : "text-muted-foreground"
              )}>
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="Tell us about yourself..."
              disabled={!isAuthenticated}
              rows={3}
              className="resize-none"
            />
          </div>
        </section>

        <Separator className="my-2" />

        {/* Links Section */}
        <section className="space-y-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PixelIcon name="link" className="h-4 w-4" />
            Links
          </h3>
          
          {/* X/Twitter */}
          <div className="space-y-2.5">
            <Label htmlFor="social-x" className="flex items-center gap-2">
              <PixelIcon name="twitter" className="h-4 w-4" />
              X / Twitter
            </Label>
            <Input
              id="social-x"
              value={socialX}
              onChange={(e) => setSocialX(e.target.value)}
              placeholder="@username or https://x.com/username"
              disabled={!isAuthenticated}
            />
          </div>

          {/* Instagram */}
          <div className="space-y-2.5">
            <Label htmlFor="social-instagram" className="flex items-center gap-2">
              <PixelIcon name="instagram" className="h-4 w-4" />
              Instagram
            </Label>
            <Input
              id="social-instagram"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
              placeholder="@username or https://instagram.com/username"
              disabled={!isAuthenticated}
            />
          </div>

          {/* Discord */}
          <div className="space-y-2.5">
            <Label htmlFor="social-discord" className="flex items-center gap-2">
              <PixelIcon name="discord" className="h-4 w-4" />
              Discord
            </Label>
            <Input
              id="social-discord"
              value={socialDiscord}
              onChange={(e) => setSocialDiscord(e.target.value)}
              placeholder="discord.gg/invite or username"
              disabled={!isAuthenticated}
            />
          </div>

          {/* Website */}
          <div className="space-y-2.5">
            <Label htmlFor="social-website" className="flex items-center gap-2">
              <PixelIcon name="globe" className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="social-website"
              value={socialWebsite}
              onChange={(e) => setSocialWebsite(e.target.value)}
              placeholder="https://yoursite.com"
              disabled={!isAuthenticated}
            />
          </div>
        </section>

        <Separator className="my-2" />

        {/* Preferences Section */}
        <section className="space-y-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Preferences
          </h3>
          
          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PixelIcon name={soundEnabled ? "volumeOn" : "volumeOff"} className="h-4 w-4" />
              <Label>Sound Effects</Label>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

        </section>

        <Separator className="my-2" />

        {/* Legal Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PixelIcon name="shield" className="h-4 w-4" />
            Legal
          </h3>
          
          <div className="flex flex-col gap-2">
            <a 
              href="#" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.preventDefault()}
            >
              <PixelIcon name="book" className="h-4 w-4" />
              Terms & Conditions
              <PixelIcon name="externalLink" className="h-3 w-3" />
            </a>
            <a 
              href="#" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.preventDefault()}
            >
              <PixelIcon name="shield" className="h-4 w-4" />
              Privacy Policy
              <PixelIcon name="externalLink" className="h-3 w-3" />
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            v1.0.0 • Made with ❤️ by Bitplace Team
          </p>
        </section>

        {/* Save Button */}
        {isAuthenticated && (
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges() || !!usernameError || bio.length > MAX_BIO_LENGTH}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </GamePanel>
  );
}
