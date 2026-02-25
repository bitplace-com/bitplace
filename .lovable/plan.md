

## Phase 6 Completion: UI Components + Cron Job

### 1. WalletSelectModal -- Add Google Sign-In Button (6A)
**File:** `src/components/modals/WalletSelectModal.tsx`

- Import `useWallet` and call `googleSignIn()` 
- Add a "Sign in with Google" button **above** the Phantom option, styled with a Google icon (inline SVG "G" logo) and descriptive text
- On click: call `googleSignIn()` and close modal
- Below the Google button, add a subtle "or" divider before Phantom

### 2. WalletButton -- Google Authenticated State (6B)
**File:** `src/components/wallet/WalletButton.tsx`

- Add a new render branch after the trial mode check: `if (isGoogleAuth && isConnected && !isTrialMode)`
- Show Google avatar (from `user.google_avatar_url` or `user.avatar_url`) + display name + "Starter" badge with clock icon
- Show virtual PE available: `{energy.peAvailable.toLocaleString()} PE` with clock icon
- Wrap in `UserMenuPanel` like other authenticated states

### 3. MobileWalletButton -- Google State (6C)
**File:** `src/components/wallet/MobileWalletButton.tsx`

- Import `isGoogleAuth` from `useWallet`
- When Google-authenticated and collapsed, show a blue dot (instead of green) to distinguish
- Expanded state delegates to `WalletButton` which already handles it

### 4. UserMenuPanel -- Google User Display (6D)
**File:** `src/components/modals/UserMenuPanel.tsx`

- Import `isGoogleAuth`, `isGoogleOnly` from `useWallet()`
- For Google users: show `user.google_avatar_url` as avatar, display email below name
- Show "Starter Account" badge (clock icon + amber background) instead of trial badge
- In the Wallet section: for Google-only users, show virtual PE stats with clock icon distinction instead of wallet balance
- Add "Connect Wallet" CTA button (calls `linkWallet()`) when `isGoogleOnly`
- In disconnect area: for Google-only, show "Connect Real Wallet" + "Sign Out" (instead of "Disconnect")

### 5. usePixelDetails -- Fetch expires_at and is_virtual_stake (6E)
**File:** `src/hooks/usePixelDetails.ts`

- Add `expiresAt: Date | null` and `isVirtualStake: boolean` to `PixelDetails` interface
- Update the pixels query select to include `expires_at, is_virtual_stake`
- Map `expires_at` to `expiresAt` (as Date) and `is_virtual_stake` to `isVirtualStake` (boolean) in the result
- Also fetch `auth_provider` from `public_pixel_owner_info` view and add to `OwnerProfile`

### 6. PixelTab -- Expiry Countdown (6F)
**File:** `src/components/map/inspector/PixelTab.tsx`

- Import `PixelClock` icon (already exists at `src/components/icons/custom/PixelClock.tsx`)
- After the Stake/Value grid and before DEF/ATK breakdown, add a new section:
  - If `pixel.expiresAt` is set: show amber card with clock icon and countdown "Expires in XXh XXm"
  - Use `useState` + `setInterval(60000)` to update countdown every minute
  - Show hint text: "Stake real PE (DEF) to make this pixel permanent"
- If `pixel.isVirtualStake && !pixel.expiresAt`: show green "Protected" badge (someone DEFed it)

### 7. MapToolbar -- Disable DEF/ATK/REINFORCE for Google-Only (6G)
**File:** `src/components/map/MapToolbar.tsx`

- Accept `isGoogleOnly` prop
- For modes `defend`, `attack`, `reinforce`: wrap in `TooltipTrigger` with "Connect wallet to use" message, and set `disabled` when `isGoogleOnly`
- Pass `isGoogleOnly` from `BitplaceMap.tsx` (read from `useWallet()`)

**File:** `src/components/map/BitplaceMap.tsx`
- Import `isGoogleOnly` from `useWallet()`
- Pass `isGoogleOnly` to `<MapToolbar>`

### 8. ActionBox -- Google-Only CTA (6H)
**File:** `src/components/map/inspector/ActionBox.tsx`

- Accept optional `isGoogleOnly` prop
- When `isGoogleOnly` and mode is DEF/ATK/REINFORCE/WITHDRAW_*: render a CTA card instead of normal action UI
- CTA: "Connect your wallet to defend/attack pixels" with a "Connect Wallet" button

### 9. Cron Job for pixels-cleanup-expired (4A)
- Use SQL insert tool (not migration) to schedule `pixels-cleanup-expired` every 5 minutes via `pg_cron` + `pg_net`
- Uses the project URL and anon key

---

### Technical Details

**Google sign-in button SVG** (inline):
A simple colored "G" logo matching Google branding guidelines, sized 24x24.

**Countdown logic in PixelTab:**
```text
const [now, setNow] = useState(Date.now());
useEffect(() => {
  if (!pixel?.expiresAt) return;
  const interval = setInterval(() => setNow(Date.now()), 60000);
  return () => clearInterval(interval);
}, [pixel?.expiresAt]);

const remaining = pixel.expiresAt.getTime() - now;
const hours = Math.floor(remaining / 3600000);
const minutes = Math.floor((remaining % 3600000) / 60000);
```

**MapToolbar disabled modes:**
The `ToggleGroupItem` for defend/attack/reinforce gets `disabled={isGoogleOnly}` and a wrapping Tooltip with message "Connect wallet to use this action".

**Cron SQL:**
```sql
select cron.schedule(
  'cleanup-expired-pixels',
  '*/5 * * * *',
  $$ select net.http_post(
    url:='https://thghyespvzejcveiqdhk.supabase.co/functions/v1/pixels-cleanup-expired',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"time":"' || now() || '"}'::jsonb
  ) as request_id; $$
);
```

### Files Modified (Summary)
- `src/components/modals/WalletSelectModal.tsx` -- Google sign-in button
- `src/components/wallet/WalletButton.tsx` -- Google authenticated state
- `src/components/wallet/MobileWalletButton.tsx` -- Google collapsed indicator
- `src/components/modals/UserMenuPanel.tsx` -- Google user display + CTA
- `src/hooks/usePixelDetails.ts` -- expires_at, is_virtual_stake fields
- `src/components/map/inspector/PixelTab.tsx` -- expiry countdown
- `src/components/map/MapToolbar.tsx` -- disabled modes for Google-only
- `src/components/map/BitplaceMap.tsx` -- pass isGoogleOnly to toolbar
- `src/components/map/inspector/ActionBox.tsx` -- Google-only CTA
- Cron job SQL via insert tool

