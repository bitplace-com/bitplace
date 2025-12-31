import { useState } from 'react';
import { Wallet, LogOut, ChevronDown, Loader2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@/contexts/WalletContext';

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { isConnected, isConnecting, walletAddress, connect, disconnect, energy } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  if (isConnecting) {
    return (
      <Button variant="outline" size="sm" disabled className="rounded-xl">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && walletAddress) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted/50">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs">{shortenAddress(walletAddress)}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium">{energy.nativeBalance.toFixed(2)} {energy.nativeSymbol}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl bg-popover/95 backdrop-blur-md border-border/50">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total PE</span>
              <span className="font-medium">{energy.peTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">{energy.nativeSymbol} Balance</span>
              <span className="font-medium">{energy.nativeBalance.toFixed(4)}</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={connect} size="sm" className="gap-2 rounded-xl shadow-md">
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
