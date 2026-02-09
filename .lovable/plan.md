

# Rename Rules to Glossary and Remove Redundancies

## What Changes

1. **Rename "Rules" to "Glossary"** everywhere (menu button, modal title)
2. **Remove duplicated content** that White Paper already covers (the 4 actions section, general PE intro)
3. **Reorganize into coherent topic-based sections** as a pure technical reference

## Content Analysis: What Gets Removed vs Kept

### Already in White Paper (REMOVE from Glossary):
- "The 4 Actions" section (Paint, Defend, Attack, Reinforce descriptions) -- White Paper has full action cards for these
- General PE intro ("Your in-game energy... every action requires PE") -- White Paper explains the energy flow

### Unique to Glossary (KEEP and refine):
- Pixel Value mechanics
- Takeover process and consequences
- Decay system
- Quick-reference terms (PE, Stake, DEF, ATK, Takeover)

## New Glossary Structure

Organized into 3 coherent sections by topic:

### Section 1: ENERGY
Terms and mechanics related to the energy system.

**Pixel Energy (PE)** -- icon: `bolt`
> The unit of energy in Bitplace. Your PE capacity depends on how much $BIT is in your wallet. Every action on the map costs PE. You can see your current PE balance in the top bar.
> *Test phase: PE is calculated from your wallet's $SOL value.*

**Stake** -- icon: `coins`
> The amount of PE you lock into a pixel when you paint or reinforce it. A higher stake makes the pixel harder for others to take. Your stake stays locked until someone takes over the pixel or you withdraw it.

### Section 2: PIXEL MECHANICS
How pixels behave and change hands.

**Pixel Value** -- icon: `trendingDown`
> The total strength of a pixel. It's the sum of the owner's stake plus any defense, minus any attacks received. When a pixel's value reaches zero, it becomes claimable by anyone.

**Takeover** -- icon: `flag`
> When you paint over a pixel owned by someone else. To do it, you must stake more PE than the pixel's current value. When a takeover happens:
> - You become the new owner
> - The previous owner gets their PE back
> - Defenders get their PE back
> - Attackers automatically become your defenders

**Decay** -- icon: `clock`
> If your wallet value drops below what you've staked across all your pixels, your stakes start shrinking. The decay happens gradually over 3 days. You can stop it instantly by restoring your wallet balance.

### Section 3: QUICK REFERENCE
Compact term definitions (the glossary grid).

| Term | Definition |
|------|-----------|
| PE | Pixel Energy -- your capacity to act on the map |
| Stake | PE locked into a pixel to claim or strengthen it |
| DEF | Defense -- PE added by other players to protect a pixel |
| ATK | Attack -- PE spent by others to weaken a pixel |
| Takeover | Claiming a pixel by staking more PE than its current value |
| Decay | Gradual stake reduction when wallet balance drops |

### Tip footer
> Zoom in to paint level (z16+) to start placing pixels.

## Menu Changes

- Rename button label from "Rules" to "Glossary"
- Keep position (last in BASICS section)
- Change icon from `book` to `info` for differentiation from White Paper

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/RulesModal.tsx` | Rename title to "Glossary", restructure content into 3 sections, remove duplicated actions |
| `src/components/map/MapMenuDrawer.tsx` | Rename menu button from "Rules" to "Glossary", change icon to `info` |

