# Bitplace Rules

## Token & Energy

- **Token**: BTP
- **Energy unit**: PE (Pixel Energy)
- **1 PE = $0.01** (derived from wallet value in BTP)

## Pixel Properties

Each pixel has:
- `owner` - Current owner wallet
- `owner_stake` - PE staked by owner
- `DEF` - PE contributed by defenders
- `ATK` - PE contributed by attackers

## Pixel Value

```
V = owner_stake + DEF - ATK
```

## Takeover Threshold

- **If owner is in rebalance and a floor exists**: 
  - `threshold = max(0, V_floor_next6h) + 1`
- **If no floor exists (owner healthy)**: 
  - `threshold = max(0, V_now) + 1`
- **Minimum threshold is always 1 PE**

## Floor Updates

- Floor updates every **6 hours** (12 ticks across 3 days)

## DEF/ATK Rules

- **Only one side per wallet per pixel**: either DEF or ATK (never both)
- **Owner cannot DEF/ATK their own pixels**; owner can only increase `owner_stake` (reinforce)
- DEF/ATK are allowed only on **owned (non-empty) pixels**
- DEF/ATK withdrawals are **immediate**
- **DEF/ATK have NO decay**: if a wallet loses collateral coverage, their DEF/ATK contributions disappear immediately

## Owner Stake & Rebalance

- Only `owner_stake` can rebalance/decay
- If owner becomes under-collateralized, `owner_stake` decays uniformly across all their pixels over **3 days** (ticks every 6h)
- If owner re-collateralizes, rebalance **stops immediately**

## Flip (Pixel Conquered)

When a pixel is conquered by paint:
1. New painter becomes **owner**
2. Previous owner and previous defenders get their PE back (refunded/unlocked)
3. All attackers become defenders (ATK → DEF) and can withdraw immediately

## Batch / Area Selection

- Selection is **manual/drag** on the map
- Actions can be applied to **multiple pixels**
- DEF/ATK/owner reinforcement use **uniform x PE per pixel**
- Paint uses only color; the app computes required PE per pixel for takeover and sums totals
- **All-or-nothing**: if any selected pixel violates rules OR PE is insufficient, the whole action fails and UI highlights invalid pixels

## Live System

- **No pre-block/locking**
- Use **validate → commit**
- If state changes between validate and commit, the action **fails**
