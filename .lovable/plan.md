

## Remaining Implementation: Phases 4-6

### What's Already Done
- Database schema (users + pixels new columns, cleanup function, views)
- `auth-google` edge function (token exchange, user creation)
- `game-validate` + `game-commit` updated for virtual PE logic
- `pixels-cleanup-expired` edge function
- Lovable OAuth module configured

### What Remains

---

### Phase 4: Cron Job + Edge Function Updates

**4A. Schedule cron job for expired pixel cleanup**
- Use the SQL insert tool (not migration) to schedule `pixels-cleanup-expired` every 5 minutes via `pg_cron` + `pg_net`

**4B. Update `energy-refresh` edge function**
- Add dual-auth support (custom JWT + Supabase Auth fallback)
- For Google-only users (`auth_provider = 'google'`): skip Solana RPC entirely, return virtual PE stats:
  - `peTotal = virtual_pe_total`, `peUsed = virtual_pe_used`, `peAvailable = virtual_pe_total - virtual_pe_used`
  - `nativeBalance = 0`, `usdPrice = 0`, `walletUsd = 0`
- For `auth_provider = 'both'`: fetch wallet balance normally AND include virtual PE info

**4C. Update `pe-status` edge function**
- Same dual-auth support
- For Google users: return virtual PE stats alongside (or instead of) real PE stats
- Add `virtual_pe_total`, `virtual_pe_used`, `virtual_pe_available` fields to response

**4D. Update `notifications-manage` edge function**
- Add dual-auth support so Google users can read/manage their notifications

**4E. Update `user-update` edge function**
- Add dual-auth support so Google users can update their profile

---

### Phase 5: WalletContext + Auth Flow

**5A. Update `WalletContext.tsx`** (largest change)
- Add new state: `isGoogleAuth`, `isVirtualPe`
- Add `googleSignIn()` method:
  1. Call `lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })`
  2. On callback (detected via `supabase.auth.onAuthStateChange`), call `auth-google` edge function with the Supabase access token
  3. Store custom JWT in localStorage (same as wallet flow)
  4. Set user state, energy state with virtual PE
- Add `linkWallet()` method for Google users to connect Phantom wallet (transitions to `auth_provider = 'both'`)
- Update `EnergyState` interface: add `isVirtualPe: boolean`, `virtualPeTotal`, `virtualPeUsed`, `virtualPeAvailable`
- Update `refreshEnergy` / `refreshPeStatus` to handle Google auth responses
- Listen for Supabase Auth state changes on mount to detect Google OAuth callback

**5B. Update `authHelpers.ts`**
- Extend `parseJwtPayload` to include `authProvider` field
- Add helper to detect if current session is Google-based

**5C. Update `useWalletGate.ts`**
- Handle Google auth state: if `isGoogleAuth && isAuthenticated`, allow PAINT
- For DEF/ATK/REINFORCE: check if wallet is connected (not just Google)

---

### Phase 6: UI Components

**6A. Update `WalletSelectModal.tsx`**
- Add "Sign in with Google" button above the Phantom option
- Style with Google branding (Google icon + text)
- On click: call `googleSignIn()` from WalletContext

**6B. Update `WalletButton.tsx`**
- Add Google authenticated state: show Google avatar + email/name + virtual PE balance with a clock/starter badge
- For `auth_provider = 'both'`: show wallet info as primary, with Google badge

**6C. Update `MobileWalletButton.tsx`**
- Same Google auth states as desktop WalletButton

**6D. Update `UserMenuPanel.tsx`**
- For Google users: show Google avatar, email, "Starter Account" badge
- Show "Connect Wallet" CTA button to upgrade to real PE
- Show virtual PE balance with clock icon to distinguish from real PE
- For `both` users: show both wallet and Google info

**6E. Update `usePixelDetails.ts`**
- Fetch `expires_at` and `is_virtual_stake` from pixels query (add to select)
- Add `expiresAt: Date | null` and `isVirtualStake: boolean` to `PixelDetails` interface
- Also fetch `auth_provider` from the `public_pixel_owner_info` view (already available)

**6F. Update `PixelTab.tsx`**
- For pixels with `expires_at IS NOT NULL`: show countdown timer "Expires in XXh XXm" with amber clock icon
- Use `setInterval` (every 60s) to update countdown
- For pixels with `is_virtual_stake = true` and `expires_at = NULL`: show "Protected" badge in green
- Style: amber/orange background card with clock icon, similar to the existing "Stake Decaying" section

**6G. Update `ActionTray.tsx`**
- Accept `isGoogleOnly` prop from parent (MapPage)
- For Google-only users: disable DEF/ATK/REINFORCE mode buttons
- Show tooltip "Connect wallet to use this action" on disabled buttons
- PAINT and ERASE remain enabled

**6H. Update `ActionBox.tsx`**
- When mode is DEF/ATK/REINFORCE and user is Google-only: show a CTA card instead of the normal action UI
- CTA: "Connect your wallet to defend/attack pixels" with a button linking to wallet connection

---

### Implementation Order

Given the dependencies, the implementation order should be:

1. **Cron job** (4A) -- independent, can be done first
2. **Edge function updates** (4B-4E) -- `energy-refresh`, `pe-status`, `notifications-manage`, `user-update`
3. **WalletContext + auth helpers** (5A-5C) -- core frontend state management for Google auth
4. **UI components** (6A-6H) -- all UI changes depend on WalletContext being ready

### Technical Details

**Google OAuth callback detection in WalletContext:**
```text
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.access_token) {
      // Call auth-google edge function with the Supabase access token
      // Store custom JWT, set user state
    }
  });
  return () => subscription.unsubscribe();
}, []);
```

**Pixel expiry countdown in PixelTab:**
```text
// New section between Stake/Value and DEF/ATK breakdown
if (pixel.expiresAt) {
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
    <PixelIcon name="clock" /> "Expires in {countdown}"
    <p>Stake real PE to make this pixel permanent</p>
  </div>
}
```

**ActionTray mode restriction:**
```text
// DEF/ATK/REINFORCE buttons get disabled={isGoogleOnly}
// Tooltip: "Connect wallet to use this action"
```

### Files to Create/Modify

**Edge functions (modify):**
- `supabase/functions/energy-refresh/index.ts`
- `supabase/functions/pe-status/index.ts`
- `supabase/functions/notifications-manage/index.ts`
- `supabase/functions/user-update/index.ts`

**Frontend (modify):**
- `src/contexts/WalletContext.tsx` -- Google auth state + methods
- `src/lib/authHelpers.ts` -- authProvider in JWT parsing
- `src/hooks/useWalletGate.ts` -- Google auth handling
- `src/hooks/usePixelDetails.ts` -- fetch expires_at, is_virtual_stake
- `src/components/wallet/WalletButton.tsx` -- Google state UI
- `src/components/wallet/MobileWalletButton.tsx` -- Google state UI
- `src/components/modals/WalletSelectModal.tsx` -- Google sign-in button
- `src/components/modals/UserMenuPanel.tsx` -- Google user display
- `src/components/map/inspector/PixelTab.tsx` -- expiry countdown
- `src/components/map/ActionTray.tsx` -- disable modes for Google-only
- `src/components/map/inspector/ActionBox.tsx` -- CTA for Google-only

This is a large set of changes. I recommend implementing in 2-3 batches: first the edge functions + cron, then WalletContext + auth, then all UI components together.

