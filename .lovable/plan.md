

# Update Phantom Icon & Add $SOL/$BIT Test Phase Notice

## Summary

1. **Update Phantom logo** to the latest official icon (simpler ghost design)
2. **Add notice** explaining that $SOL is temporarily used for testing and $BIT token is coming soon

---

## Changes

### 1. New Phantom Icon

The current SVG in `WalletSelectModal.tsx` (lines 117-133) uses an older Phantom logo with a circular background and the detailed ghost shape. The new official Phantom branding uses a simpler ghost icon.

**Current (old):**
- Circular background with full ghost body design
- More complex SVG path

**New (official 2024):**
- Rounded square/squircle container with `#AB9FF2` background
- Simplified ghost shape - just the top curve with two eye holes
- Cleaner, more modern look

**New SVG icon:**
```tsx
<div className="h-10 w-10 rounded-xl bg-[#AB9FF2] flex items-center justify-center flex-shrink-0">
  <svg
    width="24"
    height="24"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M108.7 54.3H100.1C100.1 36.9 85.9 22.7 68.5 22.7C51.3 22.7 37.3 36.5 36.9 53.7C36.5 71.3 52.6 85.7 70.3 85.7H73.3C89.3 85.7 108.7 72.1 108.7 54.3ZM49.1 57.5C49.1 60.2 46.9 62.4 44.2 62.4C41.5 62.4 39.3 60.2 39.3 57.5V51.3C39.3 48.6 41.5 46.4 44.2 46.4C46.9 46.4 49.1 48.6 49.1 51.3V57.5ZM63.1 57.5C63.1 60.2 60.9 62.4 58.2 62.4C55.5 62.4 53.3 60.2 53.3 57.5V51.3C53.3 48.6 55.5 46.4 58.2 46.4C60.9 46.4 63.1 48.6 63.1 51.3V57.5Z"
      fill="white"
    />
  </svg>
</div>
```

### 2. Add $SOL/$BIT Notice

Add a notice below the Phantom button explaining the test phase.

**Placement:** After the Phantom button (line 162), before the install guidance text.

**Content:**
```tsx
{/* Test phase notice */}
<div className="px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
  <p className="text-xs text-muted-foreground text-center">
    <span className="font-medium text-foreground">Test phase:</span> We're currently using{" "}
    <span className="font-medium text-foreground">$SOL</span> to power Pixel Energy.
    The official <span className="font-medium text-foreground">$BIT</span> token is coming soon.
  </p>
</div>
```

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/modals/WalletSelectModal.tsx` | Update SVG icon (lines 117-133), add $SOL/$BIT notice (after line 162) |

---

## Visual Result

```text
┌─────────────────────────────────────────┐
│  🔓 Connect Wallet                      │
│  Connect your Phantom wallet to use...  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [👻]  Phantom                    │  │
│  │        Solana wallet           →  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Test phase: We're using $SOL    │  │
│  │  to power PE. $BIT coming soon.  │  │
│  └───────────────────────────────────┘  │
│                                         │
│                            [Cancel]     │
└─────────────────────────────────────────┘
```

