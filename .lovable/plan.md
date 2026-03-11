

# Fix build errors + Migrate domain .com → .live

## 1. Fix build errors: `NodeJS.Timeout` namespace

The previous tsconfig edit removed Node types. Fix by replacing `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` in 5 files:

| File | Lines to fix |
|------|-------------|
| `src/components/map/hooks/usePaintQueue.ts` | line 38 |
| `src/components/modals/SearchModal.tsx` | line 35 |
| `src/hooks/useBalance.ts` | line 47 |
| `src/hooks/useEdgeFunctionWarmup.ts` | line 112 |
| `src/hooks/useSupabasePixels.ts` | lines 45, 48, 49 |

## 2. Migrate all `bitplace.com` → `bitplace.live`

### Edge Functions — ALLOWED_ORIGINS (11 files)
Replace `"https://bitplace.com"` and `"https://www.bitplace.com"` with `"https://bitplace.live"` and `"https://www.bitplace.live"`:

- `auth-nonce`, `auth-verify`, `auth-google`
- `user-update`, `notifications-manage`
- `game-validate`, `game-commit`
- `energy-refresh`, `avatar-upload`
- `pe-status`, `alliance-manage`

### Edge Functions — ADMIN_EMAILS (2 files)
`game-commit` and `game-validate`: `team@bitplace.com` → `team@bitplace.live`

### Edge Functions — User-Agent (2 files)
`geocode` and `reverse-geocode`: `Bitplace/1.0 (https://bitplace.com)` → `Bitplace/1.0 (https://bitplace.live)`

### Frontend — admin check (1 file)
`BitplaceMap.tsx` line 249: `team@bitplace.com` → `team@bitplace.live`

### Frontend — contact email (2 files)
- `PrivacyPage.tsx`: 4 occurrences of `contact@bitplace.com` → `team@bitplace.live`
- `TermsPage.tsx`: `contact@bitplace.com` → `team@bitplace.live`

### `index.html` — og:url
Line 14: `https://bitplace.lovable.app` → `https://bitplace.live`

### `README.md`
Update links from `bitplace.com` → `bitplace.live`

## 3. Static Privacy Policy for Google verification

Create `public/privacy.html` — a plain HTML version of the Privacy Policy content (same text as `PrivacyPage.tsx`). Google's crawler can't render React SPAs, so it needs a static file at `https://bitplace.live/privacy.html`.

**Manual step after deploy**: Update the Privacy Policy URL in Google Cloud Console to `https://bitplace.live/privacy.html`.

