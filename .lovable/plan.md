

# Fix Phantom Wallet Icon

## Problem

The current Phantom SVG icon (lines 117-128 in `WalletSelectModal.tsx`) is rendering incorrectly - it shows a broken/malformed shape instead of the recognizable Phantom ghost logo. As visible in the screenshot, only a partial white blob appears instead of the proper ghost shape.

The issue is with the SVG path data - it's using coordinates that don't properly form the ghost shape within the viewBox.

---

## Solution

Replace the broken SVG with the correct official Phantom ghost icon. Based on the official Phantom documentation (docs.phantom.com/resources/assets), the icon should be:
- A rounded purple (`#AB9FF2`) container
- A white ghost silhouette with curved top and two "eyes" (rounded vertical pill shapes)

### Updated SVG Code

```tsx
<div className="h-10 w-10 rounded-xl bg-[#AB9FF2] flex items-center justify-center flex-shrink-0">
  <svg
    width="24"
    height="24"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Ghost body with curved top */}
    <path
      d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0599C13.9361 87.576 35.5765 107 59.4867 107H63.4989C85.0042 107 110.584 88.7583 110.584 64.9142Z"
      fill="white"
    />
    {/* Left eye */}
    <path
      d="M40.2729 67.9011C40.2729 71.5233 37.3407 74.4614 33.7261 74.4614C30.1114 74.4614 27.1792 71.5233 27.1792 67.9011V59.6289C27.1792 56.0067 30.1114 53.0686 33.7261 53.0686C37.3407 53.0686 40.2729 56.0067 40.2729 59.6289V67.9011Z"
      fill="#AB9FF2"
    />
    {/* Right eye */}
    <path
      d="M58.9369 67.9011C58.9369 71.5233 56.0047 74.4614 52.3901 74.4614C48.7754 74.4614 45.8432 71.5233 45.8432 67.9011V59.6289C45.8432 56.0067 48.7754 53.0686 52.3901 53.0686C56.0047 53.0686 58.9369 56.0067 58.9369 59.6289V67.9011Z"
      fill="#AB9FF2"
    />
  </svg>
</div>
```

This is the original, correct Phantom ghost icon with:
1. **Ghost body path**: The main curved ghost silhouette in white
2. **Left eye path**: A rounded vertical oval in purple (creating the "hole" effect)
3. **Right eye path**: A second rounded vertical oval in purple

The eyes are filled with the background purple color (`#AB9FF2`) to create the characteristic "eye holes" of the Phantom ghost.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/modals/WalletSelectModal.tsx` | Replace SVG at lines 117-128 with correct 3-path Phantom ghost icon |

---

## Expected Result

The Phantom button in the wallet connection modal will display the proper, recognizable ghost icon:
- White ghost shape with curved top/body
- Two purple "eye" ovals that create the iconic Phantom look
- Matches the official branding from Phantom's documentation

