

# Fix: Virtual PE not used for 'both' users when painting

## Problem
Users with `auth_provider: 'both'` (Google + Wallet) have both a virtual pixel budget and real PE. When they paint, the system incorrectly uses **real PE** instead of virtual pixels. This causes:
- Pixels saved with `owner_stake_pe: 1` instead of `0`
- `pe_used_pe` (real PE counter) incremented instead of `virtual_pe_used`
- Profile shows PE Used and PE Value even though no real PE should have been spent

## Root Cause
In `game-commit/index.ts` (line 1135-1136):
```
const isVirtualPe = user.auth_provider === 'google' || 
  (user.auth_provider === 'both' && !user.wallet_address);
```
For 'both' users WITH a wallet, `isVirtualPe` is `false`. Same logic exists in the streaming path (line 955-956).

## Solution

### 1. Fix backend: game-commit edge function
Change the `isVirtualPe` determination for PAINT mode. For 'both' users, painting should always use virtual PE regardless of wallet status. Real PE is only for DEFEND/ATTACK/REINFORCE.

Update both occurrences (non-streaming line ~1135 and streaming line ~955):
```
// For PAINT: 'both' users always use virtual PE
const isVirtualPe = mode === 'PAINT' 
  ? (user.auth_provider === 'google' || user.auth_provider === 'both')
  : (user.auth_provider === 'google' || (user.auth_provider === 'both' && !user.wallet_address));
```

### 2. Fix backend: game-validate edge function
Apply the same logic change so validation matches commit behavior.

### 3. Fix existing data: SQL cleanup
Run a migration to fix the 1000 pixels that were incorrectly saved as real PE:
- Set `owner_stake_pe = 0`, `is_virtual_stake = true`, `virtual_pe_cost = 1`, and add `expires_at` (72h from now) on those pixels
- Reset user's `pe_used_pe` back to 0
- Set `virtual_pe_used = 1000` to reflect actual virtual PE consumption

### 4. Fix profile display: usePlayerProfile hook
Update `totalStaked` calculation to exclude virtual pixels (`is_virtual_stake = true`) so PE Used/Value only reflects real PE stakes. Add `is_virtual_stake` to the pixel query select.

### 5. Fix other stats hooks
Update `usePeBalance.ts` and `usePixelStats.ts` to also filter out virtual stakes when calculating `totalStaked`.

## Impact
- 'Both' users will correctly use virtual pixels when painting
- Profile PE Used/Value will only reflect real PE consumption
- Existing incorrect data will be corrected

