

## Multi-area UI improvements

### 1. Google avatar as default Bitplace avatar
- In `usePlayerProfile.ts`: fetch `google_avatar_url` from `public_user_profiles` or `public_pixel_owner_info`, and use it as fallback when `avatar_url` is null
- In `PlayerProfileModal.tsx`: check `google_avatar_url` as fallback for avatar display
- In `LeaderboardModal.tsx` (`PlayerRow`): check `google_avatar_url` from entry data as avatar fallback
- The user can still override by uploading a custom avatar in Settings (existing flow unchanged)

### 2. Remove brush icon from wallet button panel
- In `WalletButton.tsx` (Google auth state, line ~133-134): remove `<PixelBalanceIcon size="xs" />` from the display, keep just `{virtualPeAvailable.toLocaleString()} Pixels`

### 3. Change "available to paint" text in UserMenuPanel
- In `UserMenuPanel.tsx` line ~172-174: change the available pixels display to `{number} * Available to use` format (dot separator + "Available to use")

### 4. Pixel Control Center improvements
- Remove redundant info (repetition between stats and countdown text)
- Add status colors: emerald background for "all safe" countdown, amber for "soon", red for "urgent"
- Change "to earn PE" to "to get PE" in wallet section text (line ~254)
- Improve PE section text to explain: "$BIT holdings determine your PE capacity based on their dollar value. PE makes your drawings permanent and protectable."

### 5. Player Profile tooltips
- Add `TooltipProvider` wrapper to `PlayerProfileModal`
- Wrap each `StatCard` label with tooltip explaining:
  - Pixels Painted: "Total number of pixels this player has painted across all time"
  - Pixels Owned: "Pixels currently owned by this player on the map"
  - PE Used: "Paint Energy currently locked in pixel stakes" (was "PE Staked")
  - PE Value: "Dollar value of staked PE at $0.001 per PE" (was "Staked Value")
- Rename "PE Staked" to "PE Used" and "Staked Value" to "PE Value"

### 6. Starter badge in leaderboard
- Replace `<StarterBadge />` component in `LeaderboardModal.tsx` (`PlayerRow`) with the same inline `<span>` chip used in `UserMenuPanel` (matching proportions: `px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-foreground/10 text-foreground border border-border`)
- Add shine animation to match PRO badge

### 7. WalletSelectModal revamp as 3-tier account system
- Redesign as 3 clear tiers with visual hierarchy:
  1. **Google** (Tier 1 - Starter): Use real Google "G" logo SVG (multicolor), subtitle "300,000 free Pixels -- draw anywhere, expire after 72h"
  2. **Phantom** (Tier 2 - Pro): Use the uploaded Phantom ghost logo (copy `Phantom_logo.png` to `src/assets/phantom-logo.png`), subtitle "Permanent PE from $BIT holdings -- full ownership"
  3. **Try Free** (Tier 3 - Demo): Keep sparkles icon, "Preview only -- 10,000 test Pixels, nothing saved"
- Update description text to remove old "Paint Energy" references and use current terminology
- Improve visual styling: each tier gets a subtle numbered badge or label ("Starter", "Pro", "Demo")
- Fix copy: replace outdated text mentioning "PE" where it should say "Pixels" for Google tier

### 8. Copy Phantom logo asset
- Copy `user-uploads://Phantom_logo.png` to `src/assets/phantom-logo.png`
- Import and use in `WalletSelectModal` as a rounded image instead of inline SVG

### Technical details per file

| File | Changes |
|------|---------|
| `src/assets/phantom-logo.png` | New file: copy from user upload |
| `src/components/wallet/WalletButton.tsx` | Remove PixelBalanceIcon from Google auth display |
| `src/components/modals/UserMenuPanel.tsx` | Change available text to "{n} * Available to use" |
| `src/components/modals/PixelControlPanel.tsx` | Add status colors to countdown, fix PE section copy, remove redundancies |
| `src/components/modals/PlayerProfileModal.tsx` | Add tooltips to stat cards, rename PE Staked/Staked Value, add TooltipProvider |
| `src/components/modals/LeaderboardModal.tsx` | Improve StarterBadge styling + shine animation |
| `src/components/modals/WalletSelectModal.tsx` | Full revamp: 3-tier design, real Google logo SVG, Phantom logo image, updated copy |
| `src/hooks/usePlayerProfile.ts` | Fetch google_avatar_url, use as avatar fallback |
| `src/components/ui/starter-badge.tsx` | Update styling to match UserMenuPanel chip + add shine |

