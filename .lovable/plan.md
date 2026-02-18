

# Deposit/Withdraw Toggle + Persistent Selection Rect

## Overview
Three changes: (1) keep the selection rectangle visible after releasing Space, (2) add a Deposit/Withdraw toggle to the ActionTray and InspectorPanel for DEFEND, ATTACK, and REINFORCE modes, and (3) create a backend withdraw flow for REINFORCE (reducing owner_stake, with a minimum of 1 PE remaining).

## Current State
- DEFEND, ATTACK, REINFORCE already share the same area selection and validate/confirm UX flow -- no changes needed there.
- The purple dashed selection rectangle disappears immediately on Space release because `setRectPreview(null)` is called at that point.
- Withdraw exists only as a batch "remove all contributions" button in the inspector. There is no per-pixel PE amount control for withdrawals, and REINFORCE has no withdraw support at all (owner_stake cannot be reduced).

## Changes

### 1. Persistent Selection Rectangle

**File: `src/components/map/BitplaceMap.tsx`**

When Space is released in draw mode for non-PAINT actions (lines 748-752), instead of immediately clearing rectPreview, store the bounds in a new state `selectionRectBounds` that persists until the selection is cleared. The CanvasOverlay already renders `rectPreview` -- we reuse that prop, just stop nullifying it on Space release.

- On Space release: keep `rectPreview` set (do NOT call `setRectPreview(null)`)
- On `handleClearSelection` / mode change / ESC: clear `rectPreview` along with everything else
- Same for Hand mode inspect selections

### 2. Deposit/Withdraw Toggle in ActionTray and InspectorPanel

**New state: `actionDirection`** -- either `'deposit'` or `'withdraw'`

**File: `src/components/map/BitplaceMap.tsx`**
- Add `const [actionDirection, setActionDirection] = useState<'deposit' | 'withdraw'>('deposit');`
- Reset to `'deposit'` when mode changes
- Pass `actionDirection` and `onActionDirectionChange` to ActionTray, InspectorPanel, ActionBox

**File: `src/components/map/ActionTray.tsx`**
- In the action mode section (non-paint expanded), add a segmented toggle above the PE input:
  - Two buttons: "Deposit" (with a small down-arrow or plus icon) and "Withdraw" (with an up-arrow or minus icon)
  - Tooltip on Deposit: "Add PE to selected pixels"
  - Tooltip on Withdraw: "Remove PE from selected pixels"
- The PE per pixel input and chips remain the same for both directions

**File: `src/components/map/inspector/ActionBox.tsx`**
- Update labels based on direction: "Defend" vs "Withdraw DEF", "Reinforce" vs "Withdraw Stake"
- Update cost display: Required shows negative (refund) for withdraw
- Update button text accordingly

**File: `src/components/map/inspector/InspectorPanel.tsx`**
- Remove the separate "Withdraw Contributions" section (it will be unified into the main flow)
- Show the Deposit/Withdraw toggle in the panel header area

### 3. Backend: Withdraw via game-validate and game-commit

Instead of using the separate `contribution-withdraw` edge function, extend the existing game-validate and game-commit with new modes. This keeps the validate-then-commit flow consistent.

**New modes:** `WITHDRAW_DEF`, `WITHDRAW_ATK`, `WITHDRAW_REINFORCE`

**File: `supabase/functions/game-validate/index.ts`**
- Add three new modes to the GameMode type
- For WITHDRAW_DEF/WITHDRAW_ATK: validate that user has contributions on those pixels, compute refund amounts (min: if withdrawing all, that is ok). If `pePerPixel` would reduce contribution below 0, cap at the available amount.
- For WITHDRAW_REINFORCE: validate that user owns the pixels, compute how much owner_stake can be reduced. **Enforce minimum 1 PE remaining** -- if owner_stake - pePerPixel < 1, mark as invalid with reason "MIN_STAKE" (user should use Eraser to fully remove the pixel).
- Return `requiredPeTotal` as a NEGATIVE number (refund), or a new field `refundPeTotal`

**File: `supabase/functions/game-commit/index.ts`**
- Handle WITHDRAW_DEF/WITHDRAW_ATK: reduce or delete pixel_contributions rows
- Handle WITHDRAW_REINFORCE: reduce owner_stake_pe on pixels table (min 1 PE)
- Use same parallel batching pattern as REINFORCE deposit
- Send SSE progress events

**File: `src/hooks/useGameActions.ts`**
- Add `WITHDRAW_DEF`, `WITHDRAW_ATK`, `WITHDRAW_REINFORCE` to the GameMode type
- The validate/commit functions already support any mode -- just need the type added

**Frontend integration in `BitplaceMap.tsx`:**
- When `actionDirection === 'withdraw'`, `getGameMode()` returns `WITHDRAW_DEF`, `WITHDRAW_ATK`, or `WITHDRAW_REINFORCE` instead of `DEFEND`, `ATTACK`, `REINFORCE`
- Everything else (validate button, confirm button, progress bar) works identically

### 4. Minimum Stake Rule
- When withdrawing REINFORCE, if `owner_stake_pe - pePerPixel < 1`, the pixel is flagged as invalid with reason "Minimum 1 PE stake required (use Eraser to remove pixel)"
- For DEF/ATK withdraw, withdrawing the full amount is allowed (contribution row is deleted)

## Files to Modify
1. `src/components/map/BitplaceMap.tsx` -- persistent rect, actionDirection state, getGameMode logic
2. `src/components/map/ActionTray.tsx` -- Deposit/Withdraw toggle with tooltips
3. `src/components/map/inspector/ActionBox.tsx` -- direction-aware labels and cost display
4. `src/components/map/inspector/InspectorPanel.tsx` -- remove separate withdraw section, pass direction
5. `src/hooks/useGameActions.ts` -- add WITHDRAW_* modes to types
6. `supabase/functions/game-validate/index.ts` -- handle WITHDRAW_* validation
7. `supabase/functions/game-commit/index.ts` -- handle WITHDRAW_* commits

## Files NOT Modified
- `src/hooks/useWithdrawContribution.ts` -- kept for backward compatibility but no longer primary
- `supabase/functions/contribution-withdraw/index.ts` -- kept but no longer primary path

