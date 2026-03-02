
# Fix multiple issues: toast copy, wallet address, alert persistence, display name priority, Pixel Control Center

## Issues identified and fixes

### 1. Toast alerts use "VPE" instead of "Pixels"

**File: `src/contexts/WalletContext.tsx`**

- Line 330: `toast.success('Balance updated', { description: \`${data.peAvailable.toLocaleString()} VPE available\` })` -- Change "VPE" to "Pixels"
- Line 500: `const toastMsg = googleUser.auth_provider === 'both' ? 'Google linked! Wallet + VPE active' : \`${virtualPeAvailable.toLocaleString()} VPE ready to use\`` -- Change "VPE" to "Pixels"

### 2. Wallet address shows "google:..." in UserMenuPanel

**File: `src/components/modals/UserMenuPanel.tsx`**

The wallet section (line 183) checks `walletAddress` which for Google-only users is `google:XXXX`. The wallet section should only show the address + copy button when `walletAddress` exists AND does NOT start with `google:`. Otherwise show the "Connect Wallet" prompt.

Change the condition on line 183 from:
```
{walletAddress ? (
```
to:
```
{walletAddress && !walletAddress.startsWith('google:') ? (
```

### 3. Pixel expiry alert reappears on every open

**File: `src/components/modals/UserMenuPanel.tsx`**

`pixelAlertDismissed` is `useState(false)` -- resets every time the component remounts. Use `localStorage` to persist the dismissed state.

- Initialize from `localStorage.getItem('bitplace_pixel_alert_dismissed') === '1'`
- On dismiss, also write to `localStorage`

### 4. Display name priority in WalletButton header

**File: `src/components/wallet/WalletButton.tsx`**

Line 78-86: when `isBoth && walletAddress && !walletAddress.startsWith('google:')` it shows `shortenAddress(walletAddress)`. The priority should be:
1. `user?.display_name`
2. `user?.email?.split('@')[0]`  
3. `shortenAddress(walletAddress)` (only real wallet, not google:)

Update the display logic to always prioritize display_name first, then Google name, then wallet address.

### 5. Pixel Control Center shows "Connect Wallet" after wallet already linked

**File: `src/components/modals/PixelControlPanel.tsx`**

Line 26: `const hasWallet = !isGoogleOnly` -- This is correct for `auth_provider === 'both'`. However, the issue might be that after linking a wallet, the `isGoogleOnly` flag isn't updating properly because the `walletAddress` still starts with `google:`.

Looking at `WalletContext.tsx` line 449: after `linkWallet`, it does `setWalletAddress(wallet)` with the real wallet address. And `isGoogleOnly = authProvider === 'google'`. After link, `auth_provider` becomes `'both'`, so `isGoogleOnly` should be false.

The real issue: during session restore (line 624), if `auth_provider === 'both'`, `storedWallet` might be `google:XXXX` from the initial Google sign-in. The restore logic sets `setWalletAddress(storedWallet || ...)` which could be the old `google:` value.

**Fix in `src/contexts/WalletContext.tsx`** (session restore, line 624):
When restoring a `both` user, prefer `cachedUser.wallet_address` over the stored `google:` wallet:
```
const realWallet = cachedUser?.wallet_address && !cachedUser.wallet_address.startsWith('google:') 
  ? cachedUser.wallet_address 
  : storedWallet;
setWalletAddress(realWallet || `google:${payload.userId.substring(0, 8)}`);
```

Also in the Google auth callback (line 486):
```
setWalletAddress(googleUser.wallet_address || `google:${googleUser.id.substring(0, 8)}`);
```
For `both` users, `googleUser.wallet_address` should be the real wallet. But we should also update localStorage (line 487) accordingly.

### 6. Pixel Control Center PE info box improvements

**File: `src/components/modals/PixelControlPanel.tsx`**

Lines 226-256: The "What is Paint Energy?" box needs better copy for the 4 actions. Currently lists Paint, Defend (DEF), Attack (ATK) but misses Reinforce and has vague descriptions.

Updated list:
- **Paint** -- Place pixels permanently on the map. They stay yours unless someone uses more PE.
- **Reinforce** -- Add extra PE to your own pixels to make them harder to take over.
- **Defend (DEF)** -- Contribute PE to another player's pixel to strengthen its value.
- **Attack (ATK)** -- Spend PE against a pixel to weaken it and attempt a takeover.

### 7. Add "View Public Profile" link in Pixel Control Center

**File: `src/components/modals/PixelControlPanel.tsx`**

Add a button below the sections that opens the PlayerProfileModal with the current user's ID. This lets users see their public profile, view their painted pixels on the minimap, and navigate to them on the map.

Import `PlayerProfileModal` and add state + button:
```tsx
const [profileOpen, setProfileOpen] = useState(false);

// After the main content div, before closing GamePanel:
<Button variant="ghost" className="w-full justify-start gap-3 h-10" onClick={() => setProfileOpen(true)}>
  <PixelIcon name="user" className="h-4 w-4" />
  View Public Profile
</Button>

<PlayerProfileModal open={profileOpen} onOpenChange={setProfileOpen} playerId={user?.id || null} />
```

### 8. WalletButton: use StarterBadge text instead of icon for STARTER badge

Looking at the screenshot and user request -- the user doesn't want the pencil icon that shines as STARTER badge. They want the text-based STARTER badge that shines.

**File: `src/components/wallet/WalletButton.tsx`**

Line 90: Replace `<StarterBadge shine size="sm" />` with the text-based badge:
```tsx
<span className="text-[10px] font-bold tracking-wider text-slate-400 bg-slate-400/10 px-1.5 py-0.5 rounded animate-shine">STARTER</span>
```

Wait -- the user said they don't want the pencil badge and want the STARTER text badge that shines. But the existing `StarterBadge` component uses `PixelStarter` SVG icon. Let me check if there's a CSS `animate-shine`...

The user wants the text STARTER badge to "brillare" (shine). We can add a subtle shine animation using a gradient similar to the SVG approach. The simplest is to use a CSS shimmer effect on the text badge.

## Summary of files to edit

1. **`src/contexts/WalletContext.tsx`** -- Fix VPE toast copy, fix session restore wallet address for 'both' users
2. **`src/components/modals/UserMenuPanel.tsx`** -- Hide google: wallet, persist alert dismiss in localStorage
3. **`src/components/wallet/WalletButton.tsx`** -- Display name priority, text STARTER badge
4. **`src/components/modals/PixelControlPanel.tsx`** -- Improve PE info box copy, add View Public Profile link
