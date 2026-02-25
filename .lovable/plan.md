

## Google Auth + Virtual PE Integration

This is a large feature that introduces Google authentication as an alternative to wallet connection, with a "virtual PE" system that allows non-wallet users to paint pixels that expire after 72 hours.

---

### Phase 1: Database Schema Changes

**Migration 1 - Users table updates:**
- Add `auth_provider` TEXT DEFAULT 'wallet' -- values: 'wallet', 'google', 'both'
- Add `email` TEXT (nullable) -- Google email
- Add `google_avatar_url` TEXT (nullable) -- Google profile picture
- Add `google_user_id` TEXT (nullable) -- Supabase Auth UID for linking
- Add `virtual_pe_total` BIGINT DEFAULT 0 -- 300,000 for Google users
- Add `virtual_pe_used` BIGINT DEFAULT 0 -- consumed virtual PE

**Migration 2 - Pixels table updates:**
- Add `expires_at` TIMESTAMPTZ (nullable) -- NULL = permanent, set = countdown active
- Add `is_virtual_stake` BOOLEAN DEFAULT false -- true for Google-painted pixels
- Create index: `CREATE INDEX idx_pixels_expires_at ON pixels(expires_at) WHERE expires_at IS NOT NULL`

**Migration 3 - Expired pixel cleanup function:**
- Create a DB function `cleanup_expired_pixels()` that deletes pixels where `expires_at < NOW()` and returns the virtual PE back to users by decrementing their `virtual_pe_used`
- This function also inserts notifications for expired pixels

**Migration 4 - Update `public_pixel_owner_info` view:**
- Add `auth_provider` and `email` to the view so pixel inspector can show Google user info

---

### Phase 2: Google OAuth Setup

**Configure Social Login:**
- Use the Lovable Cloud managed Google OAuth (no API keys needed)
- Call the configure-social-auth tool to generate the `src/integrations/lovable/` module

**New Edge Function: `auth-google`**
- Receives Supabase Auth session token after Google OAuth callback
- Verifies the Supabase Auth token using `supabase.auth.getUser()`
- Creates or finds user in `users` table (matching by `google_user_id` or email)
- Sets `auth_provider = 'google'`, `virtual_pe_total = 300000`, `virtual_pe_used = 0`
- Issues a custom JWT (same format as wallet auth) with `{ userId, wallet: null, exp, authProvider: 'google' }`
- Returns the custom JWT + user data (same shape as `auth-verify`)

---

### Phase 3: Dual Auth in Edge Functions

**Shared auth helper pattern for all edge functions:**

Currently every edge function verifies tokens via `verifyToken()` which expects `{ wallet, userId, exp }`. We need to extend this:

1. Try custom JWT first (existing `verifyToken`)
2. If no custom JWT match, try Supabase Auth token via `supabase.auth.getUser()` (for Google users who may also use Supabase session directly)
3. Return `{ userId, wallet: string | null, authProvider: 'wallet' | 'google' }`

**Edge functions to update:**
- `game-validate` -- check `auth_provider` and use `virtual_pe_total - virtual_pe_used` for Google users
- `game-commit` -- set `owner_stake_pe = 0`, `expires_at = NOW() + 72h`, `is_virtual_stake = true` for Google users; increment `virtual_pe_used` instead of relying on triggers
- `energy-refresh` -- skip Solana RPC for Google users, return virtual PE stats
- `pe-status` -- return virtual PE stats for Google users
- `user-update` -- accept Google auth tokens
- `notifications-manage` -- accept Google auth tokens

**Game logic changes in `game-validate` (PAINT):**
- For Google users (`auth_provider = 'google'`): 
  - `peTotal = virtual_pe_total`, `peUsed = virtual_pe_used`
  - `peAvailable = virtual_pe_total - virtual_pe_used`
  - Validation proceeds identically (thresholds, color checks, etc.)
  - Response includes `isVirtualPe: true`

**Game logic changes in `game-commit` (PAINT):**
- For Google users:
  - `owner_stake_pe = 0` (not the threshold)
  - `expires_at = NOW() + 72h`
  - `is_virtual_stake = true`
  - Increment `virtual_pe_used` on the user row by the sum of thresholds
  - DB trigger `update_pe_used_on_pixel_change` won't fire meaningfully (stake is 0), so this is handled manually

**Game logic changes in `game-commit` (DEFEND):**
- When a wallet user DEFs a pixel that has `expires_at IS NOT NULL`:
  - Set `expires_at = NULL` (pixel saved)
  - Optionally set `is_virtual_stake = false`

**Game logic changes in contribution withdrawal:**
- When DEF is withdrawn from a pixel owned by a Google user (`is_virtual_stake = true`, `owner_stake_pe = 0`):
  - If no real PE contributions remain (DEF total = 0), set `expires_at = NOW() + 72h`

**Google users CANNOT perform:**
- DEFEND, ATTACK, REINFORCE, WITHDRAW_DEF, WITHDRAW_ATK, WITHDRAW_REINFORCE
- These modes return error `WALLET_REQUIRED` for Google-only users
- If user has `auth_provider = 'both'`, these modes use real PE (wallet path)

---

### Phase 4: Expired Pixel Cleanup

**New Edge Function: `pixels-cleanup-expired`**
- Queries `SELECT * FROM pixels WHERE expires_at IS NOT NULL AND expires_at < NOW()`
- For each expired pixel:
  - Find the owner's `virtual_pe_used` and decrement by the threshold that was originally consumed (we store 0 as stake, so we need to track the original cost -- or simply decrement by 1 since empty pixels cost 1 PE and Google pixels always have stake 0)
  - Actually: since all Google pixels have `owner_stake_pe = 0`, and the virtual PE was consumed at paint time, when the pixel expires, the virtual PE cost must be refunded. The cost was the threshold at paint time. We need to store this.
  
**Key insight**: We need to store the virtual PE cost per pixel. Add `virtual_pe_cost` BIGINT DEFAULT 0 to the `pixels` table. For Google-painted pixels, this stores the PE that was deducted from `virtual_pe_used`.

- On expiry: `UPDATE users SET virtual_pe_used = GREATEST(0, virtual_pe_used - p.virtual_pe_cost) WHERE id = p.owner_user_id`
- Delete the expired pixel
- Delete associated contributions
- Insert notification: `type = 'PIXEL_EXPIRED'`, `title = 'Your pixel expired'`, `body = 'Pixel at (x, y) expired after 72h. Your PE has been returned.'`

**Cron job** (via pg_cron + pg_net):
- Schedule every 5 minutes: calls `pixels-cleanup-expired` edge function

---

### Phase 5: WalletContext + UI Changes

**WalletContext extensions:**
- Add `isGoogleAuth` boolean state
- Add `googleSignIn()` method -- calls `lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })`
- Add `linkWallet()` method -- for Google users to connect a Phantom wallet, transitioning `auth_provider` to 'both'
- On Google OAuth callback, detect the Supabase Auth session, call `auth-google` edge function, store the custom JWT
- Energy state for Google users: show `virtual_pe_total`, `virtual_pe_used`, `virtual_pe_available` mapped to the same `peTotal/peUsed/peAvailable` fields
- No wallet balance/price fields for Google-only users
- Add `isVirtualPe` flag to energy state

**WalletButton changes:**
- Disconnected state: Show "Connect Wallet" button + "Sign in with Google" button + "or try for free" link
- Google authenticated state: Show Google avatar + display name (email or name) + "300,000 PE" with clock/starter badge
- Google + wallet state: Show wallet info as primary, Google badge secondary

**Pixel Inspector changes (PixelTab.tsx):**
- For pixels with `expires_at`: Show countdown timer "Expires in XXh XXm" with amber clock icon
- For pixels with `is_virtual_stake = true` and `expires_at = NULL`: Show "Protected" badge in green (someone DEFed it)
- Countdown updates every minute via `setInterval`

**ActionBox / ActionTray:**
- For Google-only users: disable DEF/ATK/REINFORCE buttons with tooltip "Connect wallet to use this action"
- PAINT and ERASE work normally

**UserMenuPanel:**
- For Google users: show Google avatar, email, "Starter Account" badge
- Show "Connect Wallet" CTA to upgrade
- Show virtual PE balance with clock icon distinction

---

### Phase 6: Pixel Details Hook Updates

**usePixelDetails.ts:**
- Fetch `expires_at` and `is_virtual_stake` from pixels query
- Add `expiresAt: Date | null` and `isVirtualStake: boolean` to `PixelDetails` interface
- Pass these to PixelTab for rendering

**useGameActions / usePaintStateMachine:**
- After successful commit, if response includes `isVirtualPe: true`, update virtual PE in wallet context instead of real PE

---

### Summary of new/modified files

**New files:**
- `supabase/functions/auth-google/index.ts` -- Google OAuth token exchange
- `supabase/functions/pixels-cleanup-expired/index.ts` -- Cron job for expired pixels

**Modified edge functions (dual-auth + virtual PE logic):**
- `supabase/functions/game-validate/index.ts`
- `supabase/functions/game-commit/index.ts`
- `supabase/functions/energy-refresh/index.ts`
- `supabase/functions/pe-status/index.ts`
- `supabase/functions/user-update/index.ts`
- `supabase/functions/notifications-manage/index.ts`

**Modified frontend files:**
- `src/contexts/WalletContext.tsx` -- Google auth state, virtual PE
- `src/components/wallet/WalletButton.tsx` -- Google sign-in button, Google state UI
- `src/components/wallet/MobileWalletButton.tsx` -- Google sign-in on mobile
- `src/components/modals/WalletSelectModal.tsx` -- Add Google option
- `src/components/modals/UserMenuPanel.tsx` -- Google user display
- `src/components/map/inspector/PixelTab.tsx` -- Expiry countdown
- `src/hooks/usePixelDetails.ts` -- Fetch expires_at
- `src/hooks/useWalletGate.ts` -- Handle Google auth state
- `src/components/map/ActionTray.tsx` -- Disable DEF/ATK for Google-only
- `src/components/map/inspector/ActionBox.tsx` -- Virtual PE handling
- `src/lib/authHelpers.ts` -- Support Google auth tokens

**Database migrations:**
- 4 migrations for schema changes (users, pixels, cleanup function, view update)
- 1 cron job setup (via insert tool, not migration)

---

### Key Design Decisions

1. **Virtual PE is label "PE" everywhere** but visually distinguished by a clock/starter badge in the energy display
2. **`owner_stake_pe = 0`** for Google pixels ensures V = 0 + DEF - ATK, meaning takeover costs just 1 PE (making these pixels easy to claim for wallet users)
3. **Virtual PE is refunded on expiry** -- this closes the loop on the 300k budget being recyclable
4. **Google users who connect a wallet become `auth_provider = 'both'`** -- they keep virtual PE for painting but gain access to DEF/ATK/REINFORCE with real PE
5. **The custom JWT stays as primary auth mechanism** -- Google login just produces the same JWT format, so all edge functions work with minimal changes

