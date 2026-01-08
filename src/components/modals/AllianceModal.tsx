import { useState } from "react";
import { Users, Shield, Copy, LogOut, Crown, Loader2 } from "lucide-react";
import { GameModal } from "./GameModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useAlliance, Alliance, AllianceMember } from "@/hooks/useAlliance";
import { supabase } from "@/integrations/supabase/client";

const SESSION_TOKEN_KEY = 'bitplace_session_token';

interface AllianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function AllianceModal({ open, onOpenChange }: AllianceModalProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useWallet();
  const { alliance, members, isLoading, refetch } = useAlliance(user?.id);

  const [joinCode, setJoinCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createTag, setCreateTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast({ title: "Enter an invite code", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "join", inviteCode: joinCode.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Failed to join", variant: "destructive" });
        return;
      }

      toast({ title: `Joined ${data.alliance.name}!` });
      setJoinCode("");
      await refetch();
      await refreshUser();
    } catch (err) {
      toast({ title: "Failed to join alliance", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const copyInviteCode = () => {
    if (alliance?.invite_code) {
      navigator.clipboard.writeText(alliance.invite_code);
      toast({ title: "Invite code copied!" });
    }
  };

  if (isLoading) {
    return (
      <GameModal
        open={open}
        onOpenChange={onOpenChange}
        title="Alliances"
        description="Join forces with other players"
        icon={<Users className="h-5 w-5" />}
        size="md"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </GameModal>
    );
  }

  // Not in alliance - show join/create UI
  if (!alliance) {
    return (
      <GameModal
        open={open}
        onOpenChange={onOpenChange}
        title="Alliances"
        description="Join forces with other players"
        icon={<Users className="h-5 w-5" />}
        size="md"
      >
        <div className="space-y-6">
          {/* Join Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Join an Alliance</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123XY"
                  maxLength={8}
                  className="font-mono uppercase"
                />
                <Button onClick={handleJoin} disabled={isSubmitting} size="sm">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

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
        </div>
      </GameModal>
    );
  }

  // In alliance - show details
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="My Alliance"
      description="You're part of an alliance"
      icon={<Users className="h-5 w-5" />}
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
            <Users className="inline h-3.5 w-3.5 mr-1" />
            {alliance.memberCount} member{alliance.memberCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Invite Code */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Invite Code</Label>
          <div className="flex gap-2">
            <Input
              value={alliance.invite_code}
              readOnly
              className="font-mono text-center"
            />
            <Button onClick={copyInviteCode} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
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
                      {member.displayName || shortenAddress(member.walletAddress)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Lv.{member.level}
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
    </GameModal>
  );
}
