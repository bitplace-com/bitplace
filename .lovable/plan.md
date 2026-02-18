

# Fix: Incorrect button texts and loading labels

## Problems Found

### 1. ActionBox.tsx -- confirm button loading text (line 340)
The pattern `${actionLabel}ing ${effectiveCount} px...` has two issues:
- **Wrong unit**: For Deposit/Withdraw, the operation is about PE, not pixels. Saying "Depositing 50 px..." is misleading.
- **Grammar**: While "Deposit" -> "Depositing" and "Withdraw" -> "Withdrawing" work, the fallback to `config.label` for PAINT/ERASE means "Erase" -> "Eraseing" (wrong, should be "Erasing"). This path isn't currently hit for Erase since actionLabel handles it, but it's fragile.

**Fix**: Use a proper gerund map instead of naive `${label}ing` concatenation, and remove `px` from Deposit/Withdraw loading text (or replace with "PE").

### 2. OperationProgress.tsx -- missing withdraw modes (lines 8-17)
The `STATUS_MESSAGES.commit` map only includes PAINT, DEFEND, ATTACK, REINFORCE, ERASE. The three withdraw modes (WITHDRAW_DEF, WITHDRAW_ATK, WITHDRAW_REINFORCE) are missing, causing them to fall back to the generic "Processing" label.

**Fix**: Add entries for all three withdraw modes with label "Withdrawing".

## Changes

### File: `src/components/map/inspector/ActionBox.tsx`

Replace the naive `${actionLabel}ing` pattern (line 340) with a proper gerund mapping:

```typescript
const actionLabel = isWithdraw ? 'Withdraw' : (['DEFEND','ATTACK','REINFORCE'].includes(mode) ? 'Deposit' : config.label);
const actionGerund = isWithdraw ? 'Withdrawing' : (['DEFEND','ATTACK','REINFORCE'].includes(mode) ? 'Depositing' : { PAINT: 'Painting', ERASE: 'Erasing' }[mode] || 'Processing');

if (isCommitting) return effectiveCount > 50 ? `${actionGerund}...` : `${actionGerund}...`;
```

Remove the `${effectiveCount} px` from the committing label entirely -- it adds clutter and uses the wrong unit for Deposit/Withdraw. The progress bar already shows real-time progress below.

### File: `src/components/map/OperationProgress.tsx`

Add the missing withdraw modes to `STATUS_MESSAGES.commit`:

```typescript
const STATUS_MESSAGES = {
  validate: 'Validating',
  commit: {
    PAINT: 'Painting',
    DEFEND: 'Defending',
    ATTACK: 'Attacking',
    REINFORCE: 'Reinforcing',
    ERASE: 'Erasing',
    WITHDRAW_DEF: 'Withdrawing',
    WITHDRAW_ATK: 'Withdrawing',
    WITHDRAW_REINFORCE: 'Withdrawing',
  },
};
```

