import { useState } from "react";
import { Crown, LogOut, Loader2, Search, UserPlus, Check } from "lucide-react";
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useAlliance } from "@/hooks/useAlliance";
import { supabase } from "@/integrations/supabase/client";

const SESSION_TOKEN_KEY = 'bitplace_session_token';

interface AllianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  displayName: string | null;
  walletShort: string | null;
}

export function AllianceModal({ open, onOpenChange }: AllianceModalProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useWallet();
  const { alliance, members, isLoading, refetch } = useAlliance(user?.id);

  const [createName, setCreateName] = useState("");
  const [createTag, setCreateTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!createName.trim() || !createTag.trim()) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "create", name: createName.trim(), tag: createTag.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Failed to create", variant: "destructive" });
        return;
      }

      toast({ title: `Created ${data.alliance.name}!` });
      setCreateName("");
      setCreateTag("");
      await refetch();
      await refreshUser();
    } catch (err) {
      toast({ title: "Failed to create alliance", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "leave" },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Failed to leave", variant: "destructive" });
        return;
      }

      toast({ title: "Left alliance" });
      await refetch();
      await refreshUser();
    } catch (err) {
      toast({ title: "Failed to leave alliance", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast({ title: "Enter at least 2 characters", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "invite", searchQuery: searchQuery.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Search failed", variant: "destructive" });
        return;
      }

      setSearchResults(data.users || []);
      if (data.users?.length === 0) {
        toast({ title: "No users found" });
      }
    } catch (err) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async (targetUserId: string, displayName: string | null) => {
    setInvitingId(targetUserId);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "send-invite", targetUserId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Failed to send invite", variant: "destructive" });
        return;
      }

      toast({ title: `Invite sent to ${displayName || "user"}!` });
      setSearchResults(prev => prev.filter(u => u.id !== targetUserId));
      setSearchQuery("");
    } catch (err) {
      toast({ title: "Failed to send invite", variant: "destructive" });
    } finally {
      setInvitingId(null);
    }
  };

  if (isLoading) {
    return (
      <GamePanel
        open={open}
        onOpenChange={onOpenChange}
        title="Alliance"
        icon={<PixelIcon name="usersCrown" size="md" />}
        size="md"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </GamePanel>
    );
  }

  // Not in alliance - show create UI only
  if (!alliance) {
    return (
      <GamePanel
        open={open}
        onOpenChange={onOpenChange}
        title="Alliance"
        icon={<PixelIcon name="usersCrown" size="md" />}
        size="md"
      >
        <div className="space-y-6">
          {/* Create Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Create an Alliance</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Alliance Name</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My Alliance"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tag (2-5 letters)</Label>
                <Input
                  value={createTag}
                  onChange={(e) => setCreateTag(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                  placeholder="ABC"
                  maxLength={5}
                  className="font-mono uppercase"
                />
              </div>
              <Button onClick={handleCreate} disabled={isSubmitting} className="w-full" size="sm">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Alliance"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Create an alliance and invite other players to join.
          </p>
        </div>
      </GamePanel>
    );
  }

  // In alliance - show details + invite player
  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Alliance"
      icon={<PixelIcon name="usersCrown" size="md" />}
      size="md"
    >
      <div className="space-y-4">
        {/* Alliance Info */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
          <h3 className="font-semibold text-lg">{alliance.name}</h3>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono font-medium">
            [{alliance.tag}]
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            <PixelIcon name="usersCrown" size="sm" className="inline mr-1" />
            {alliance.memberCount} member{alliance.memberCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Invite Player */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" />
            Invite Player
          </Label>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or wallet..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} size="icon" variant="outline" disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-1">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">
                      {result.displayName || result.walletShort || "Unknown"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => handleSendInvite(result.id, result.displayName)}
                    disabled={invitingId === result.id}
                  >
                    {invitingId === result.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Invite
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Members</Label>
          <ScrollArea className="h-[140px] rounded-lg border border-border/50 bg-muted/20">
            <div className="p-2 space-y-1">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {member.role === "leader" && (
                      <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    )}
                    <span className="text-sm truncate">
                      {member.displayName || "Unknown"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Leave Button */}
        <Button
          onClick={handleLeave}
          disabled={isSubmitting}
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-2" />
              Leave Alliance
            </>
          )}
        </Button>
      </div>
    </GamePanel>
  );
}
