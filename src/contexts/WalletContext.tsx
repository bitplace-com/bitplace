import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { ENERGY_ASSET, ENERGY_CONFIG } from '@/config/energy';
import { useBalance } from '@/hooks/useBalance';
import { soundEngine } from '@/lib/soundEngine';
import { TOKEN_EXPIRED_EVENT } from '@/lib/authHelpers';
import { warmupAuthenticatedFunctions } from '@/hooks/useEdgeFunctionWarmup';

// ── Timeout helpers ──────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function invokeWithTimeout(
  fnName: string,
  options: Parameters<typeof supabase.functions.invoke>[1],
  ms: number,
): Promise<{ data: any; error: any }> {
  return withTimeout(supabase.functions.invoke(fnName, options), ms, `invoke(${fnName})`);
}

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  request(args: { method: string; params: Record<string, unknown> }): Promise<{ signature: Uint8Array | string }>;
  on(event: string, callback: () => void): void;
  off(event: string, callback: () => void): void;
}

interface User {
  id: string;
  wallet_address: string;
  display_name: string | null;
  country_code: string | null;
  alliance_tag: string | null;
  avatar_url: string | null;
  pe_total_pe: number;
  created_at: string;
  energy_asset?: string;
  native_symbol?: string;
  native_balance?: number;
  usd_price?: number;
  wallet_usd?: number;
  last_energy_sync_at?: string;
  sol_cluster?: string;
  bio?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_discord?: string | null;
  social_website?: string | null;
  auth_provider?: string;
  email?: string | null;
  google_avatar_url?: string | null;
}

interface EnergyState {
  energyAsset: 'BIT';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
  peUsed: number;
  peAvailable: number;
  pixelsOwned: number;
  pixelStakeTotal: number;
  cluster: 'mainnet' | null;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  isStale: boolean;
  paintCooldownUntil: Date | null;
  isVirtualPe: boolean;
  virtualPeTotal: number;
  virtualPeUsed: number;
  virtualPeAvailable: number;
}

export type WalletState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTH_REQUIRED'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'ERROR';

interface WalletContextType {
  walletState: WalletState;
  walletAddress: string | null;
  user: User | null;
  energy: EnergyState;
  connect: () => Promise<void>;
  signIn: () => Promise<void>;
  disconnect: () => void;
  updateUser: (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url' | 'bio' | 'social_x' | 'social_instagram' | 'social_website'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshEnergy: () => Promise<void>;
  refreshPeStatus: () => Promise<void>;
  updatePeStatus: (peStatus: { total: number; used: number; available: number }, cooldownUntil?: string, isVirtualPe?: boolean) => void;
  googleSignIn: () => Promise<void>;
  linkWallet: () => Promise<void>;
  isGoogleAuth: boolean;
  isGoogleOnly: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  needsSignature: boolean;
  isWalletConnected: boolean;
  isAuthenticated: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Debug logger
const walletDebug = (stage: string, data?: unknown) => {
  const isDebug =
    typeof window !== 'undefined' && (
      localStorage.getItem('bitplace_debug') === '1' ||
      window.location.search.includes('debug=1') ||
      import.meta.env.DEV
    );
  if (isDebug) {
    console.log(`[Wallet:${stage}]`, data ?? '');
  }
};

const getPhantom = (): PhantomProvider | null => {
  if (typeof window === 'undefined') return null;
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const solana = (window as any).solana;
  if (solana?.isPhantom) return solana;
  return null;
};

const SESSION_TOKEN_KEY = 'bitplace_session_token';
const WALLET_ADDRESS_KEY = 'bitplace_wallet_address';
const USER_DATA_KEY = 'bitplace_user_data';
const ENERGY_STALE_THRESHOLD_MS = 60 * 1000;
const COOLDOWN_MS = 10000;

const defaultEnergyState: EnergyState = {
  energyAsset: ENERGY_ASSET,
  nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
  nativeBalance: 0,
  usdPrice: 0,
  walletUsd: 0,
  peTotal: 0,
  peUsed: 0,
  peAvailable: 0,
  pixelsOwned: 0,
  pixelStakeTotal: 0,
  cluster: null,
  lastSyncAt: null,
  isRefreshing: false,
  isStale: true,
  paintCooldownUntil: null,
  isVirtualPe: false,
  virtualPeTotal: 0,
  virtualPeUsed: 0,
  virtualPeAvailable: 0,
};

const parseJwtPayload = (token: string): { wallet: string; userId: string; exp: number; authProvider?: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1];
    const decoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(decoded));
    return { wallet: payload.wallet, userId: payload.userId, exp: payload.exp, authProvider: payload.authProvider };
  } catch { return null; }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>('DISCONNECTED');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [energy, setEnergy] = useState<EnergyState>(defaultEnergyState);
  const [lastError, setLastError] = useState<string | null>(null);

  // In-flight guards
  const connectInFlightRef = useRef(false);
  const signInFlightRef = useRef(false);
  const restoreInFlightRef = useRef(false);
  const googleSignInFlightRef = useRef(false);
  // Auth flow lock – prevents concurrent restore/connect/signIn/link
  const authFlowRef = useRef(false);
  const walletStateRef = useRef<WalletState>(walletState);
  const userRef = useRef<User | null>(user);

  const lastConnectAttemptRef = useRef<number>(0);
  const lastSignAttemptRef = useRef<number>(0);

  useEffect(() => { walletStateRef.current = walletState; }, [walletState]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Derived state
  const isConnected = walletState === 'AUTHENTICATED';
  const isConnecting = walletState === 'CONNECTING' || walletState === 'AUTHENTICATING';
  const needsSignature = walletState === 'AUTH_REQUIRED';
  const isWalletConnected = ['CONNECTED', 'AUTH_REQUIRED', 'AUTHENTICATING', 'AUTHENTICATED'].includes(walletState) && !!walletAddress;
  const isAuthenticated = walletState === 'AUTHENTICATED' && !!user;

  const authProvider = user?.auth_provider || (parseJwtPayload(localStorage.getItem(SESSION_TOKEN_KEY) || '')?.authProvider);
  const isGoogleAuth = authProvider === 'google' || authProvider === 'both';
  const isGoogleOnly = authProvider === 'google';

  const balance = useBalance({ walletAddress, enabled: walletState === 'AUTHENTICATED' && !isGoogleOnly });

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);
  const setSessionToken = (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token);
  const getCachedUser = (): User | null => { try { const c = localStorage.getItem(USER_DATA_KEY); return c ? JSON.parse(c) : null; } catch { return null; } };
  const setCachedUser = (userData: User) => { try { localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)); } catch {} };
  const clearSession = () => { localStorage.removeItem(SESSION_TOKEN_KEY); localStorage.removeItem(WALLET_ADDRESS_KEY); localStorage.removeItem(USER_DATA_KEY); };

  // Debug state logging
  useEffect(() => {
    walletDebug('state_change', {
      walletState,
      walletAddress: walletAddress?.substring(0, 8),
      hasUser: !!user,
      lastError,
      isGoogleAuth,
      isGoogleOnly,
      authFlowLocked: authFlowRef.current,
    });
  }, [walletState, walletAddress, user, lastError, isGoogleAuth, isGoogleOnly]);

  // Sync balance hook
  useEffect(() => {
    if (isGoogleOnly) return;
    if (balance.bitBalance > 0 || balance.peTotal > 0) {
      setEnergy(prev => ({
        ...prev,
        nativeBalance: balance.bitBalance,
        usdPrice: balance.bitUsdPrice,
        walletUsd: balance.walletUsd,
        peTotal: balance.peTotal,
        lastSyncAt: balance.lastSyncAt,
        isRefreshing: balance.isRefreshing,
        isStale: !balance.lastSyncAt || (Date.now() - balance.lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS),
      }));
      setUser(prev => prev ? { ...prev, pe_total_pe: balance.peTotal } : null);
    }
  }, [balance.bitBalance, balance.bitUsdPrice, balance.walletUsd, balance.peTotal, balance.lastSyncAt, balance.isRefreshing, isGoogleOnly]);

  const updateEnergyFromUser = useCallback((userData: User) => {
    const lastSyncAt = userData.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;
    const isStale = !lastSyncAt || (Date.now() - lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS);
    setEnergy(prev => ({
      energyAsset: 'BIT',
      nativeSymbol: userData.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
      nativeBalance: Number(userData.native_balance) || prev.nativeBalance,
      usdPrice: Number(userData.usd_price) || prev.usdPrice,
      walletUsd: Number(userData.wallet_usd) || prev.walletUsd,
      peTotal: Number(userData.pe_total_pe) || prev.peTotal,
      peUsed: prev.peUsed,
      peAvailable: prev.peAvailable,
      pixelsOwned: prev.pixelsOwned,
      pixelStakeTotal: prev.pixelStakeTotal,
      cluster: prev.cluster,
      lastSyncAt,
      isRefreshing: false,
      isStale,
      paintCooldownUntil: prev.paintCooldownUntil,
      isVirtualPe: prev.isVirtualPe,
      virtualPeTotal: prev.virtualPeTotal,
      virtualPeUsed: prev.virtualPeUsed,
      virtualPeAvailable: prev.virtualPeAvailable,
    }));
  }, []);

  const refreshPeStatus = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke('pe-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) { console.error('[WalletContext] PE status refresh error:', error); return; }
      if (data?.ok) {
        if (data.isVirtualPe) {
          setEnergy(prev => ({ ...prev, peTotal: data.pe_total || 0, peUsed: data.pe_used || 0, peAvailable: data.pe_available || 0, isVirtualPe: true, virtualPeTotal: data.virtual_pe_total || 0, virtualPeUsed: data.virtual_pe_used || 0, virtualPeAvailable: data.virtual_pe_available || 0 }));
        } else {
          setEnergy(prev => ({ ...prev, peUsed: data.pe_used || 0, peAvailable: data.pe_available || 0, virtualPeTotal: data.virtual_pe_total ?? prev.virtualPeTotal, virtualPeUsed: data.virtual_pe_used ?? prev.virtualPeUsed, virtualPeAvailable: data.virtual_pe_available ?? prev.virtualPeAvailable }));
        }
      }
    } catch (err) { console.error('[WalletContext] PE status refresh exception:', err); }
  }, []);

  const refreshEnergy = useCallback(async () => {
    const token = getSessionToken();
    if (!token) { if (!isGoogleOnly) balance.refresh(); return; }
    setEnergy(prev => ({ ...prev, isRefreshing: true }));
    try {
      const { data, error } = await supabase.functions.invoke('energy-refresh', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) { console.error('[WalletContext] Energy refresh error:', error); setEnergy(prev => ({ ...prev, isRefreshing: false })); return; }
      if (!data?.ok) { console.error('[WalletContext] Energy refresh failed:', data?.message); setEnergy(prev => ({ ...prev, isRefreshing: false })); return; }
      const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;
      const peUsed = data.peUsed ?? 0;
      const peAvailable = data.peAvailable ?? Math.max(0, (data.peTotal || 0) - peUsed);
      const paintCooldownUntil = data.paintCooldownUntil ? new Date(data.paintCooldownUntil) : null;
      setEnergy({
        energyAsset: 'BIT', nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
        nativeBalance: data.nativeBalance || 0, usdPrice: data.usdPrice || 0, walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0, peUsed, peAvailable,
        pixelsOwned: data.pixelsOwned ?? 0, pixelStakeTotal: data.pixelStakeTotal ?? 0,
        cluster: data.cluster || null, lastSyncAt, isRefreshing: false, isStale: data.stale ?? false,
        paintCooldownUntil,
        isVirtualPe: data.isVirtualPe ?? false, virtualPeTotal: data.virtualPeTotal ?? 0,
        virtualPeUsed: data.virtualPeUsed ?? 0, virtualPeAvailable: data.virtualPeAvailable ?? 0,
      });
      setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);
      if (!data.stale && !data.isVirtualPe) {
        toast.success('Balance updated', { description: `${data.nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${data.nativeSymbol} = ${data.peTotal.toLocaleString()} PE` });
      } else if (!data.stale && data.isVirtualPe) {
        toast.success('Balance updated', { description: `${data.peAvailable.toLocaleString()} Pixels available` });
      }
    } catch (err) { console.error('[WalletContext] Energy refresh exception:', err); setEnergy(prev => ({ ...prev, isRefreshing: false })); }
  }, [balance, isGoogleOnly]);

  const refreshUser = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke('energy-refresh', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!error && data?.ok) {
        const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;
        const peUsed = data.peUsed ?? 0;
        const peAvailable = data.peAvailable ?? Math.max(0, (data.peTotal || 0) - peUsed);
        const paintCooldownUntil = data.paintCooldownUntil ? new Date(data.paintCooldownUntil) : null;
        setEnergy({
          energyAsset: 'BIT', nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
          nativeBalance: data.nativeBalance || 0, usdPrice: data.usdPrice || 0, walletUsd: data.walletUsd || 0,
          peTotal: data.peTotal || 0, peUsed, peAvailable,
          pixelsOwned: data.pixelsOwned ?? 0, pixelStakeTotal: data.pixelStakeTotal ?? 0,
          cluster: data.cluster || null, lastSyncAt, isRefreshing: false, isStale: data.stale ?? false,
          paintCooldownUntil,
          isVirtualPe: data.isVirtualPe ?? false, virtualPeTotal: data.virtualPeTotal ?? 0,
          virtualPeUsed: data.virtualPeUsed ?? 0, virtualPeAvailable: data.virtualPeAvailable ?? 0,
        });
        setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);
      }
    } catch (err) { console.error('[WalletContext] refreshUser error:', err); }
  }, []);

  const updatePeStatus = useCallback(
    (
      peStatus: { total: number; used: number; available: number },
      cooldownUntil?: string,
      isVirtualPe?: boolean
    ) => {
      console.log('[WalletContext] updatePeStatus called:', peStatus, cooldownUntil, 'isVirtualPe:', isVirtualPe);
      if (isVirtualPe) {
        setEnergy(prev => ({ ...prev, peTotal: peStatus.total, peUsed: peStatus.used, peAvailable: peStatus.available, isVirtualPe: true, virtualPeTotal: peStatus.total, virtualPeUsed: peStatus.used, virtualPeAvailable: peStatus.available, paintCooldownUntil: cooldownUntil ? new Date(cooldownUntil) : prev.paintCooldownUntil }));
      } else {
        setEnergy(prev => ({ ...prev, peTotal: peStatus.total, peUsed: peStatus.used, peAvailable: peStatus.available, paintCooldownUntil: cooldownUntil ? new Date(cooldownUntil) : prev.paintCooldownUntil }));
      }
      setUser(prev => prev ? { ...prev, pe_total_pe: peStatus.total } : null);
    }, []);

  // ============ GOOGLE SIGN IN ============
  const googleSignIn = useCallback(async () => {
    if (googleSignInFlightRef.current) return;
    googleSignInFlightRef.current = true;
    walletDebug('google_signin_start');
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (error) { console.error('[WalletContext] Google sign-in error:', error); toast.error('Google sign-in failed', { description: error.message }); }
    } catch (err) { console.error('[WalletContext] Google sign-in exception:', err); toast.error('Google sign-in failed'); }
    finally { googleSignInFlightRef.current = false; }
  }, []);

  // Link wallet for Google-only users — with timeouts and auth flow lock
  const linkWallet = useCallback(async () => {
    if (!isGoogleOnly || !user) { toast.info('Wallet linking is only for Google-only accounts'); return; }
    if (authFlowRef.current) { walletDebug('link_wallet_skip', { reason: 'auth_flow_locked' }); return; }

    const phantom = getPhantom();
    if (!phantom) { toast.error('Phantom wallet not found', { description: 'Install Phantom to connect your wallet' }); return; }

    authFlowRef.current = true;
    try {
      setWalletState('CONNECTING');
      walletDebug('link_wallet_start');

      const response = await withTimeout(phantom.connect(), 10000, 'linkWallet:phantom.connect');
      const wallet = response.publicKey.toBase58();
      walletDebug('link_wallet_connected', { wallet: wallet.substring(0, 8) });

      const { data: nonceData, error: nonceError } = await invokeWithTimeout('auth-nonce', { body: { wallet } }, 10000);
      if (nonceError || !nonceData?.nonce) { toast.error('Authentication failed', { description: 'Could not get authentication nonce' }); setWalletState('AUTHENTICATED'); return; }

      setWalletState('AUTHENTICATING');
      const messageBytes = new TextEncoder().encode(nonceData.nonce);
      let signatureBytes: Uint8Array;

      if (typeof phantom.request === 'function') {
        const signResult = await withTimeout(
          phantom.request({ method: 'signMessage', params: { message: messageBytes, display: 'utf8' } }),
          30000, 'linkWallet:signMessage',
        );
        if (signResult.signature instanceof Uint8Array) { signatureBytes = signResult.signature; }
        else if (typeof signResult.signature === 'string') { signatureBytes = new Uint8Array(atob(signResult.signature).split('').map(c => c.charCodeAt(0))); }
        else { signatureBytes = new Uint8Array(signResult.signature as ArrayLike<number>); }
      } else if (typeof phantom.signMessage === 'function') {
        const signResult = await withTimeout(phantom.signMessage(messageBytes), 30000, 'linkWallet:signMessage');
        signatureBytes = signResult.signature;
      } else { throw new Error('Wallet does not support message signing'); }

      const signatureB64 = btoa(String.fromCharCode(...signatureBytes));
      const currentToken = getSessionToken();
      const { data: authData, error: authError } = await invokeWithTimeout('auth-verify', {
        body: { wallet, signature: signatureB64, nonce: nonceData.nonce },
        headers: currentToken ? { 'X-Link-Token': currentToken } : undefined,
      }, 15000);

      if (authError || !authData?.token) {
        let errMsg = 'Server could not verify your signature';
        try {
          if (authError && typeof authError === 'object' && 'context' in authError && authError.context instanceof Response) { const body = await authError.context.json(); errMsg = body?.error || errMsg; }
          else if (authError && typeof authError === 'object' && 'message' in authError) { errMsg = (authError as any).message || errMsg; }
          else if (authData?.error) { errMsg = authData.error; }
        } catch {}
        toast.error('Wallet linking failed', { description: errMsg });
        setWalletState('AUTHENTICATED');
        return;
      }

      setSessionToken(authData.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, wallet);
      const updatedUser = authData.user as User;
      setUser(updatedUser); setCachedUser(updatedUser);
      setWalletAddress(wallet); setWalletState('AUTHENTICATED');
      updateEnergyFromUser(updatedUser);
      walletDebug('link_wallet_complete', { wallet: wallet.substring(0, 8) });
      toast.success('Wallet linked!', { description: 'Your account now has both Google and wallet access' });
      soundEngine.play('wallet_connect');
      setTimeout(() => { refreshEnergy(); refreshPeStatus(); }, 500);

    } catch (err: any) {
      walletDebug('link_wallet_error', { error: err });
      if (err?.code === 4001 || err?.message?.includes('User rejected')) { toast.error('Signature cancelled'); }
      else { toast.error('Wallet linking failed', { description: err?.message || 'Unknown error' }); }
      // Always return to AUTHENTICATED for Google users on failure
      setWalletState('AUTHENTICATED');
    } finally {
      authFlowRef.current = false;
    }
  }, [isGoogleOnly, user, updateEnergyFromUser, refreshEnergy, refreshPeStatus]);

  // Listen for Supabase Auth state changes (Google OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        walletDebug('supabase_auth_signed_in', { provider: session.user?.app_metadata?.provider });
        const provider = session.user?.app_metadata?.provider;
        if (provider !== 'google') return;
        if (walletStateRef.current === 'AUTHENTICATED') {
          const currentProvider = userRef.current?.auth_provider || parseJwtPayload(getSessionToken() || '')?.authProvider;
          if (currentProvider === 'google' || currentProvider === 'both') { walletDebug('supabase_auth_skip', { reason: 'already_google_or_both' }); return; }
          walletDebug('supabase_auth_upgrade', { reason: 'wallet_to_both' });
        }
        try {
          setWalletState('AUTHENTICATING');
          const { data, error } = await invokeWithTimeout('auth-google', { headers: { Authorization: `Bearer ${session.access_token}` } }, 15000);
          if (error || !data?.token) { console.error('[WalletContext] auth-google error:', error, data); toast.error('Google authentication failed'); setWalletState('DISCONNECTED'); return; }
          setSessionToken(data.token);
          const googleUser = data.user as User;
          setUser(googleUser); setCachedUser(googleUser);
          const realWalletAddr = googleUser.wallet_address && !googleUser.wallet_address.startsWith('google:') ? googleUser.wallet_address : null;
          const effectiveAddr = realWalletAddr || `google:${googleUser.id.substring(0, 8)}`;
          setWalletAddress(effectiveAddr);
          localStorage.setItem(WALLET_ADDRESS_KEY, effectiveAddr);
          setWalletState('AUTHENTICATED'); setLastError(null);
          restoreInFlightRef.current = false;
          const virtualPeTotal = Number((googleUser as any).virtual_pe_total) || 300000;
          const virtualPeUsed = Number((googleUser as any).virtual_pe_used) || 0;
          const virtualPeAvailable = Math.max(0, virtualPeTotal - virtualPeUsed);
          if (googleUser.auth_provider === 'both') {
            updateEnergyFromUser(googleUser);
            setEnergy(prev => ({ ...prev, virtualPeTotal, virtualPeUsed, virtualPeAvailable, isVirtualPe: false, lastSyncAt: new Date(), isRefreshing: false, isStale: true }));
          } else {
            setEnergy({ ...defaultEnergyState, peTotal: virtualPeTotal, peUsed: virtualPeUsed, peAvailable: virtualPeAvailable, isVirtualPe: true, virtualPeTotal, virtualPeUsed, virtualPeAvailable, lastSyncAt: new Date(), isRefreshing: false, isStale: false });
          }
          walletDebug('google_auth_complete', { userId: googleUser.id, provider: googleUser.auth_provider });
          toast.success('Signed in with Google!');
          setTimeout(() => {
            if (googleUser.auth_provider === 'both') {
              toast.success('Google linked!', { description: 'Wallet + Pixels active' });
            } else {
              toast.success('300,000 Pixels credited!', {
                description: 'Free pixels to draw anywhere. They expire after 72h but you can renew them.'
              });
            }
          }, 800);
          soundEngine.play('wallet_connect');
          warmupAuthenticatedFunctions(data.token).catch(err => walletDebug('warmup_error', err));
          setTimeout(() => { refreshEnergy(); refreshPeStatus(); }, 500);
        } catch (err) { console.error('[WalletContext] Google auth callback error:', err); toast.error('Google authentication failed'); setWalletState('DISCONNECTED'); }
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshEnergy, refreshPeStatus]);

  // Attempt Phantom trusted reconnect (silent, no popup)
  const attemptTrustedReconnect = useCallback(async (): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom) return null;
    try {
      walletDebug('trusted_reconnect_start');
      const response = await withTimeout(phantom.connect({ onlyIfTrusted: true }), 5000, 'trustedReconnect');
      const wallet = response.publicKey.toBase58();
      walletDebug('trusted_reconnect_success', { wallet: wallet.substring(0, 8) });
      return wallet;
    } catch (err) { walletDebug('trusted_reconnect_failed', { error: err }); return null; }
  }, []);

  // Perform authentication with Phantom signature — with timeouts on every step
  const performAuthentication = useCallback(async (wallet: string): Promise<boolean> => {
    const phantom = getPhantom();
    if (!phantom) return false;

    const now = Date.now();
    if (now - lastSignAttemptRef.current < COOLDOWN_MS) { walletDebug('auth_cooldown'); toast.info('Please wait before trying again'); return false; }
    if (signInFlightRef.current) { walletDebug('auth_skip', { reason: 'in_flight' }); return false; }

    signInFlightRef.current = true;
    lastSignAttemptRef.current = now;
    setWalletState('AUTHENTICATING');

    try {
      walletDebug('auth_nonce_start');
      const { data: nonceData, error: nonceError } = await invokeWithTimeout('auth-nonce', { body: { wallet } }, 10000);
      if (nonceError || !nonceData?.nonce) { walletDebug('auth_nonce_error', { error: nonceError }); setLastError('nonce_fetch_failed'); setWalletState('AUTH_REQUIRED'); toast.error('Authentication failed', { description: 'Could not get authentication nonce' }); return false; }

      walletDebug('auth_sign_start');
      let signatureB64: string;
      try {
        const messageBytes = new TextEncoder().encode(nonceData.nonce);
        let signatureBytes: Uint8Array;
        if (typeof phantom.request === 'function') {
          const signResult = await withTimeout(
            phantom.request({ method: 'signMessage', params: { message: messageBytes, display: 'utf8' } }),
            30000, 'signMessage',
          );
          if (signResult.signature instanceof Uint8Array) { signatureBytes = signResult.signature; }
          else if (typeof signResult.signature === 'string') { signatureBytes = new Uint8Array(atob(signResult.signature).split('').map(c => c.charCodeAt(0))); }
          else { signatureBytes = new Uint8Array(signResult.signature as ArrayLike<number>); }
        } else if (typeof phantom.signMessage === 'function') {
          const signResult = await withTimeout(phantom.signMessage(messageBytes), 30000, 'signMessage');
          signatureBytes = signResult.signature;
        } else { throw new Error('Wallet does not support message signing'); }
        signatureB64 = btoa(String.fromCharCode(...signatureBytes));
        walletDebug('auth_sign_success');
      } catch (signError: any) {
        walletDebug('auth_sign_rejected', { code: signError?.code, message: signError?.message });
        setLastError('user_rejected_signature');
        setWalletState('AUTH_REQUIRED');
        if (signError?.code === 4001 || signError?.message?.includes('User rejected')) { toast.error('Signature cancelled', { description: 'You cancelled the signature request' }); }
        else { toast.error('Signature failed', { description: signError?.message || 'Could not sign message' }); }
        return false;
      }

      walletDebug('auth_verify_start');
      const { data: authData, error: authError } = await invokeWithTimeout('auth-verify', { body: { wallet, signature: signatureB64, nonce: nonceData.nonce } }, 15000);
      if (authError || !authData?.token) { walletDebug('auth_verify_error', { error: authError }); setLastError('verify_failed'); setWalletState('AUTH_REQUIRED'); toast.error('Authentication failed', { description: 'Server could not verify your signature' }); return false; }

      setSessionToken(authData.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, wallet);
      setWalletAddress(wallet);
      setUser(authData.user as User);
      setCachedUser(authData.user as User);
      setWalletState('AUTHENTICATED');
      setLastError(null);
      if (authData.user) { updateEnergyFromUser(authData.user as User); }
      walletDebug('auth_complete');
      toast.success('Signed in successfully');
      soundEngine.play('wallet_connect');
      warmupAuthenticatedFunctions(authData.token).catch(err => walletDebug('warmup_error', err));
      setTimeout(() => { refreshEnergy(); refreshPeStatus(); }, 500);
      return true;
    } catch (err) {
      walletDebug('auth_exception', { error: err });
      setLastError('auth_exception');
      setWalletState('AUTH_REQUIRED');
      return false;
    } finally {
      signInFlightRef.current = false;
    }
  }, [updateEnergyFromUser, refreshEnergy, refreshPeStatus]);

  const signIn = useCallback(async () => {
    if (walletState !== 'AUTH_REQUIRED' || !walletAddress) { walletDebug('signIn_invalid_state', { walletState, hasWallet: !!walletAddress }); return; }
    await performAuthentication(walletAddress);
  }, [walletState, walletAddress, performAuthentication]);

  // Session restore on mount (runs ONCE)
  useEffect(() => {
    if (restoreInFlightRef.current) { walletDebug('session_restore_skip', { reason: 'already_in_flight' }); return; }

    const restoreSession = async () => {
      // Acquire auth flow lock for restore
      if (authFlowRef.current) { walletDebug('session_restore_skip', { reason: 'auth_flow_locked' }); return; }
      authFlowRef.current = true;
      restoreInFlightRef.current = true;

      try {
        const token = getSessionToken();
        const storedWallet = localStorage.getItem(WALLET_ADDRESS_KEY);
        walletDebug('session_restore_start', { hasToken: !!token, hasWallet: !!storedWallet });

        // Google session restore
        if (token) {
          const payload = parseJwtPayload(token);
          if (payload && payload.exp > Date.now() && (payload.authProvider === 'google' || payload.authProvider === 'both')) {
            walletDebug('session_restore_google', { authProvider: payload.authProvider });
            setWalletState('AUTHENTICATED');
            const cachedUser = getCachedUser();
            // For 'both' users, prefer real wallet from cached user over stored google: placeholder
            const realWallet = cachedUser?.wallet_address && !cachedUser.wallet_address.startsWith('google:')
              ? cachedUser.wallet_address
              : storedWallet;
            setWalletAddress(realWallet || `google:${payload.userId.substring(0, 8)}`);
            if (cachedUser) { setUser(cachedUser); updateEnergyFromUser(cachedUser); }
            warmupAuthenticatedFunctions(token).catch(err => walletDebug('warmup_error', err));
            Promise.all([refreshUser(), refreshEnergy(), refreshPeStatus()]).catch(err => walletDebug('session_restore_refresh_error', { error: err }));
            return;
          }
        }

        // No stored wallet → skip Phantom entirely
        if (!storedWallet) {
          walletDebug('session_restore_skip_phantom', { reason: 'no_stored_wallet' });
          setWalletState('DISCONNECTED');
          return;
        }

        // Don't overwrite a user-initiated flow
        if (connectInFlightRef.current || signInFlightRef.current) {
          walletDebug('session_restore_skip', { reason: 'user_flow_active' });
          return;
        }

        setWalletState('CONNECTING');
        const phantomWallet = await attemptTrustedReconnect();
        if (!phantomWallet) {
          walletDebug('session_restore_no_phantom');
          // Only clear if no user flow started meanwhile
          if (walletStateRef.current === 'CONNECTING') {
            clearSession();
            setWalletState('DISCONNECTED');
          }
          return;
        }

        setWalletAddress(phantomWallet);
        if (token && storedWallet === phantomWallet) {
          const payload = parseJwtPayload(token);
          if (payload && payload.exp > Date.now()) {
            walletDebug('session_restore_valid_token', { expiresIn: payload.exp - Date.now() });
            setWalletState('AUTHENTICATED');
            const cachedUser = getCachedUser();
            if (cachedUser) { setUser(cachedUser); updateEnergyFromUser(cachedUser); }
            warmupAuthenticatedFunctions(token).catch(err => walletDebug('warmup_error', err));
            Promise.all([refreshUser(), refreshEnergy(), refreshPeStatus()]).catch(err => walletDebug('session_restore_refresh_error', { error: err }));
            return;
          }
        }

        walletDebug('session_restore_auth_required', { reason: !token ? 'no_token' : storedWallet !== phantomWallet ? 'wallet_mismatch' : 'token_expired' });
        const cachedUser = getCachedUser();
        if (cachedUser && cachedUser.wallet_address === phantomWallet) { setUser(cachedUser); updateEnergyFromUser(cachedUser); }
        setWalletState('AUTH_REQUIRED');
      } catch (err) {
        walletDebug('session_restore_error', { error: err });
        setWalletState('ERROR');
        setLastError('session_restore_failed');
      } finally {
        restoreInFlightRef.current = false;
        authFlowRef.current = false;
      }
    };

    restoreSession();
  }, []);

  // Listen for Phantom disconnect
  useEffect(() => {
    const phantom = getPhantom();
    if (!phantom) return;
    const handleDisconnect = () => {
      if (isGoogleAuth) { walletDebug('phantom_disconnect_ignored', { reason: 'google_auth_session' }); return; }
      setWalletState('DISCONNECTED'); setWalletAddress(null); setUser(null); setEnergy(defaultEnergyState); clearSession();
    };
    phantom.on('disconnect', handleDisconnect);
    return () => phantom.off('disconnect', handleDisconnect);
  }, [isGoogleAuth]);

  // Listen for token expired events
  useEffect(() => {
    const handleTokenExpired = () => {
      walletDebug('token_expired_event');
      if (walletState === 'AUTHENTICATED') { setWalletState('AUTH_REQUIRED'); toast.info('Session expired', { description: 'Please sign in again to continue' }); }
    };
    window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
    return () => window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
  }, [walletState]);

  // Periodically check if energy is stale
  useEffect(() => {
    if (walletState !== 'AUTHENTICATED') return;
    const interval = setInterval(() => {
      setEnergy(prev => {
        if (!prev.lastSyncAt) return prev;
        const isStale = Date.now() - prev.lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS;
        if (isStale !== prev.isStale) return { ...prev, isStale };
        return prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [walletState]);

  // ── connect() — with auth flow lock + timeouts ──
  const connect = async () => {
    const phantom = getPhantom();
    if (!phantom) { toast.error('Phantom wallet not found', { description: 'Please install Phantom wallet extension', action: { label: 'Install', onClick: () => window.open('https://phantom.app/', '_blank') } }); return; }

    const now = Date.now();
    if (now - lastConnectAttemptRef.current < COOLDOWN_MS) { toast.info('Please wait before trying again'); return; }
    if (connectInFlightRef.current || authFlowRef.current) { walletDebug('connect_skip', { reason: connectInFlightRef.current ? 'in_flight' : 'auth_flow_locked' }); return; }

    connectInFlightRef.current = true;
    authFlowRef.current = true;
    lastConnectAttemptRef.current = now;
    setWalletState('CONNECTING');
    walletDebug('connect_start');

    try {
      let publicKey;
      try {
        // Don't reuse stale publicKey — always do a fresh connect
        const response = await withTimeout(
          phantom.connect({ onlyIfTrusted: false }),
          10000,
          'connect:phantom.connect',
        );
        publicKey = response.publicKey;
        walletDebug('connect_success', { publicKey: publicKey.toBase58().substring(0, 8) });
      } catch (connectError: any) {
        walletDebug('connect_error', { code: connectError?.code, message: connectError?.message });
        if (connectError?.code === 4001 || connectError?.message?.includes('User rejected')) {
          toast.error('Connection cancelled', { description: 'You rejected the connection request' });
          setWalletState('DISCONNECTED');
          setLastError('user_rejected_connect');
          return;
        }
        throw connectError;
      }

      const wallet = publicKey.toBase58();
      setWalletAddress(wallet);
      walletDebug('wallet_address', { wallet: wallet.substring(0, 8) + '...' });

      const authSuccess = await performAuthentication(wallet);
      if (!authSuccess && walletStateRef.current === 'CONNECTING') {
        setWalletState('AUTH_REQUIRED');
      }
    } catch (error: any) {
      walletDebug('connect_exception', { error: error?.message || error });
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet', { description: error instanceof Error ? error.message : 'Unknown error occurred' });
      setWalletState('ERROR');
      setLastError('connect_exception');
    } finally {
      connectInFlightRef.current = false;
      authFlowRef.current = false;
    }
  };

  const disconnect = () => {
    const phantom = getPhantom();
    if (phantom && !isGoogleOnly) phantom.disconnect();
    if (isGoogleAuth) supabase.auth.signOut().catch(() => {});
    setWalletState('DISCONNECTED'); setWalletAddress(null); setUser(null); setEnergy(defaultEnergyState); setLastError(null); clearSession();
    toast.success('Disconnected');
  };

  const updateUser = async (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url' | 'bio' | 'social_x' | 'social_instagram' | 'social_website'>>) => {
    const token = getSessionToken();
    if (!token) { toast.error('Not authenticated'); return; }
    const { data, error } = await supabase.functions.invoke('user-update', { body: updates, headers: { Authorization: `Bearer ${token}` } });
    if (error || !data?.user) throw new Error(data?.error || 'Failed to update profile');
    setUser(data.user as User); setCachedUser(data.user as User);
  };

  return (
    <WalletContext.Provider
      value={{
        walletState, walletAddress, user, energy,
        connect, signIn, disconnect, updateUser, refreshUser, refreshEnergy, refreshPeStatus, updatePeStatus,
        googleSignIn, linkWallet, isGoogleAuth, isGoogleOnly,
        isConnected, isConnecting, needsSignature, isWalletConnected, isAuthenticated,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
}
