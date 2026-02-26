

## Fix: Virtual PE Accounting, Inspector Expiry Timer, Dual PE Icons

### Root Cause Analysis

**1. Counter drops 300,000 to 0 after painting**
The `updatePeStatus` callback (WalletContext line 596) always writes to `peTotal/peUsed/peAvailable`. For Google-only users, the game-commit correctly returns virtual PE values, but then `refreshUser()` is immediately called (usePaintQueue line 166, BitplaceMap line 1938), which invokes `energy-refresh` -- and that returns `peTotal: 0` (wallet PE) for Google-only users, overwriting the virtual PE values. Additionally, `updatePeStatus` doesn't distinguish between real and virtual PE.

**2. Inspector shows PE value for starter pixels**
The backend correctly sets `owner_stake_pe: 0` and `is_virtual_stake: true` for virtual pixels, but `PixelInfoPanel` displays `pixel.owner_stake_pe` and `pixel.vNow` without checking `isVirtualStake`. When `isVirtualStake` is true, both Owner Stake and Total Stake should show "0 PE" with "~$0.00".

**3. Missing expiry countdown**
`usePixelDetails` already returns `expiresAt` and `isVirtualStake` from the DB, but `PixelInfoPanel` never renders them.

---

### Changes

#### 1. Virtual PE Icon (`VPEIcon`)
**New file:** `src/components/ui/vpe-icon.tsx`

Create a `VPEIcon` component using a different icon for virtual/starter PE. Use the `clock` icon (already associated with STARTER badge) to visually distinguish from real PE (bolt icon).

#### 2. Fix `updatePeStatus` for virtual PE
**File:** `src/contexts/WalletContext.tsx`

- Extend `updatePeStatus` signature to accept an optional `isVirtualPe` flag
- When `isVirtualPe` is true, update `virtualPeTotal/Used/Available` instead of `peTotal/Used/Available`
- For Google-only users, also set `peTotal = virtualPeTotal` so the StatusStrip works
- Update the `WalletContextType` interface accordingly

#### 3. Fix `refreshUser`/`refreshEnergy` for Google-only users
**File:** `src/contexts/WalletContext.tsx`

- In `refreshEnergy`: when `data.isVirtualPe` is true, set virtual PE fields AND mirror them to `peTotal/peUsed/peAvailable` so the StatusStrip displays correctly
- In `refreshUser` (line 548): same fix -- check `isVirtualPe` in response

#### 4. Fix post-commit PE update flow
**File:** `src/components/map/BitplaceMap.tsx`

- After commit, pass `success.isVirtualPe` to `updatePeStatus`
- Avoid calling `refreshUser()` for Google-only users immediately after commit (the PE is already updated)

**File:** `src/components/map/hooks/usePaintQueue.ts`

- Same fix: pass `isVirtualPe` from commit result to `updatePeStatus`

#### 5. Inspector: show 0 PE for virtual stake pixels + expiry countdown
**File:** `src/components/map/PixelInfoPanel.tsx`

In the Pixel Economy section (lines 360-393):
- When `pixel.isVirtualStake` is true:
  - Show Owner Stake as "0 PE" and "~$0.00"
  - Show Total Stake as "0 PE" and "~$0.00"
  - Replace the PE icon with VPEIcon
  - Add a "Virtual" or "Starter" label

After the Pixel Economy section, add an expiry countdown block:
- When `pixel.expiresAt` is set and `pixel.isVirtualStake` is true:
  - Calculate remaining time from `pixel.expiresAt`
  - Show "Expires in XXh XXm" with amber styling (similar to rebalance block)
  - Show "Protected" badge if `pixel.defTotal > 0` (DEF clears `expires_at`)
  - Use `formatTimeUntil()` (already exists at line 34)

In the Owner Stats section (lines 342-357):
- When `pixel.isVirtualStake` is true, show "Staked" value as 0 and "Value" as $0.00

#### 6. StatusStrip: dual PE display
**File:** `src/components/map/StatusStrip.tsx`

For Google-only users (`isGoogleOnly` from WalletContext):
- Replace the wallet balance section with virtual PE info
- Show VPEIcon instead of PEIcon
- For 'both' users: show both real PE and virtual PE sections with respective icons

For the PE section (lines 172-182):
- If `energy.isVirtualPe` (Google-only): show virtual PE available with VPEIcon, hide wallet balance
- If 'both' user with virtual PE: show real PE with PEIcon + virtual PE with VPEIcon

#### 7. WalletButton dual PE display
**File:** `src/components/wallet/WalletButton.tsx`

For Google-only users (lines 83-128):
- Show VPEIcon instead of PEIcon next to the virtual PE counter

For 'both' users:
- Show both: real PE with PEIcon, virtual PE with VPEIcon

#### 8. UserMenuPanel PE sections
**File:** `src/components/modals/UserMenuPanel.tsx`

- Use VPEIcon in Starter PE sections (lines 154-171, 207-219)
- Use PEIcon in wallet PE sections
- In the stats grid (lines 244-277), show separate PE Total (real) and VPE Total (virtual) when applicable

---

### Technical Details

**`updatePeStatus` new signature:**
```text
updatePeStatus: (
  peStatus: { total: number; used: number; available: number },
  cooldownUntil?: string,
  isVirtualPe?: boolean
) => void;
```

**Virtual PE update logic:**
```text
if (isVirtualPe) {
  setEnergy(prev => ({
    ...prev,
    // Mirror to main fields for StatusStrip compatibility
    peTotal: peStatus.total,
    peUsed: peStatus.used,
    peAvailable: peStatus.available,
    // Also set virtual fields
    isVirtualPe: true,
    virtualPeTotal: peStatus.total,
    virtualPeUsed: peStatus.used,
    virtualPeAvailable: peStatus.available,
    paintCooldownUntil: cooldownUntil ? new Date(cooldownUntil) : prev.paintCooldownUntil,
  }));
} else {
  // existing logic
}
```

**Inspector expiry block (after Pixel Economy):**
```text
{pixel.isVirtualStake && pixel.expiresAt && (
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
    <div className="flex items-center justify-between text-xs">
      <span className="text-amber-600 flex items-center gap-1 font-medium">
        <VPEIcon size="xs" /> Starter Pixel
      </span>
      <span className="font-semibold text-amber-600">
        Expires in {formatTimeUntil(pixel.expiresAt)}
      </span>
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">
      No real PE staked. Anyone can paint over this pixel.
    </p>
  </div>
)}
```

### Files to modify

| File | Changes |
|------|---------|
| `src/components/ui/vpe-icon.tsx` | New: Virtual PE icon component |
| `src/contexts/WalletContext.tsx` | Fix `updatePeStatus`, `refreshEnergy`, `refreshUser` for virtual PE |
| `src/components/map/BitplaceMap.tsx` | Pass `isVirtualPe` to `updatePeStatus` |
| `src/components/map/hooks/usePaintQueue.ts` | Pass `isVirtualPe` to `updatePeStatus` |
| `src/components/map/PixelInfoPanel.tsx` | Virtual stake display, expiry countdown |
| `src/components/map/StatusStrip.tsx` | Dual PE icons, virtual PE display |
| `src/components/wallet/WalletButton.tsx` | VPEIcon for virtual PE counters |
| `src/components/modals/UserMenuPanel.tsx` | VPEIcon in Starter PE sections |

