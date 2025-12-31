import { User, LogOut, Settings, BarChart3, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";

interface UserMenuPanelProps {
  children: React.ReactNode;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function UserMenuPanel({ children }: UserMenuPanelProps) {
  const navigate = useNavigate();
  const { user, walletAddress, disconnect, energy } = useWallet();
  const peBalance = usePeBalance(user?.id);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-0 bg-[hsl(0_0%_97%/0.90)] backdrop-blur-[20px] backdrop-saturate-[140%] border-[hsl(0_0%_70%/0.35)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
      >
        {/* User Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {user?.display_name || "Anonymous"}
              </p>
              {walletAddress && (
                <p className="text-xs text-muted-foreground font-mono">
                  {shortenAddress(walletAddress)}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">Total PE</p>
            <p className="text-sm font-semibold text-foreground">
              {peBalance.total.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">Free PE</p>
            <p className="text-sm font-semibold text-foreground">
              {peBalance.free.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">{energy.nativeSymbol}</p>
            <p className="text-sm font-semibold text-foreground">
              {energy.nativeBalance.toFixed(4)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">USD Value</p>
            <p className="text-sm font-semibold text-foreground">
              ${energy.walletUsd.toFixed(2)}
            </p>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Quick Links */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/50"
            onClick={() => navigate("/profile")}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/50"
            onClick={() => navigate("/leaderboard")}
          >
            <BarChart3 className="h-4 w-4" />
            Leaderboard
          </Button>
        </div>

        <Separator className="bg-border/50" />

        {/* Disconnect */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={disconnect}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
