import { useState } from "react";
import {
  Settings,
  Wallet,
  Loader2,
  Save,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import { GameModal } from "./GameModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CountryPicker } from "@/components/ui/country-picker";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useWallet } from "@/contexts/WalletContext";
import { useSound } from "@/hooks/useSound";
import { cn } from "@/lib/utils";
import { generateAvatarGradient, getAvatarInitial } from "@/lib/avatar";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]*$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    isConnected,
    walletAddress,
    user,
    connect,
    updateUser,
    isConnecting,
  } = useWallet();
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();
  
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [countryCode, setCountryCode] = useState<string | null>(user?.country_code || null);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Sync form state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && user) {
      setDisplayName(user.display_name || "");
      setCountryCode(user.country_code || null);
    }
    onOpenChange(newOpen);
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null;
    if (value.length < USERNAME_MIN) return `Min ${USERNAME_MIN} chars`;
    if (value.length > USERNAME_MAX) return `Max ${USERNAME_MAX} chars`;
    if (!USERNAME_REGEX.test(value)) return "Letters, numbers, _ only";
    return null;
  };

  const handleUsernameChange = (value: string) => {
    setDisplayName(value);
    setUsernameError(validateUsername(value));
  };

  const handleSave = async () => {
    const error = validateUsername(displayName);
    if (error) {
      setUsernameError(error);
      return;
    }
    setIsSaving(true);
    await updateUser({
      display_name: displayName || null,
      country_code: countryCode || null,
    });
    setIsSaving(false);
  };

  const hasChanges =
    user &&
    (displayName !== (user.display_name || "") ||
      countryCode !== (user.country_code || null));

  const avatarGradient = generateAvatarGradient(walletAddress || "default");
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

  return (
    <GameModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Settings"
      icon={<Settings className="h-5 w-5" />}
      size="sm"
    >
      <div className="space-y-5">
        {/* Profile Section */}
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Profile
          </h3>
          
          {!isConnected ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Connect wallet to edit profile
              </p>
              <Button onClick={connect} disabled={isConnecting} size="sm" className="rounded-lg">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Avatar + Username */}
              <div className="flex items-start gap-3">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover border border-border/50 shrink-0"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold border border-border/50 shrink-0"
                    style={{ background: avatarGradient }}
                  >
                    {avatarInitial}
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="username" className="text-xs">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      value={displayName}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      maxLength={USERNAME_MAX}
                      className={cn("h-8 rounded-lg text-sm", usernameError && "border-destructive")}
                    />
                    {usernameError && <p className="text-[10px] text-destructive">{usernameError}</p>}
                  </div>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <CountryPicker value={countryCode} onChange={setCountryCode} placeholder="Select country..." />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges || !!usernameError}
                className="w-full rounded-lg"
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </section>

        <Separator />

        {/* Preferences Section */}
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Preferences
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Theme</span>
            </div>
            <ThemeToggle />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Sound</span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </section>

        <Separator />

        {/* Legal Section */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Legal
          </h3>
          
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span>Terms & Conditions</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span>Privacy Policy</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      </div>
    </GameModal>
  );
}
