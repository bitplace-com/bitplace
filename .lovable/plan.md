

# Fix Settings Persistence + Avatar Upload

## Problem 1: Data lost after page reload

When settings are saved, `updateUser` (line 929) calls `setUser(data.user)` but never calls `setCachedUser(data.user)`. On page reload, `getCachedUser()` returns the stale cached version from initial login, so all changes disappear.

### Fix: `src/contexts/WalletContext.tsx`

In `updateUser` (line 929), after `setUser(data.user as User)`, add `setCachedUser(data.user as User)` to persist the updated profile to localStorage.

```ts
// Line 929 - change from:
setUser(data.user as User);

// To:
setUser(data.user as User);
setCachedUser(data.user as User);
```

---

## Problem 2: Avatar upload fails (token verification)

`supabase/functions/avatar-upload/index.ts` (line 26) still uses the broken 2-part JWT verification:

```ts
const [payloadB64, signatureB64] = token.split('.');
```

This is the exact same bug that was just fixed in `user-update`. The token is a standard 3-part JWT but this function only expects 2 parts.

### Fix: `supabase/functions/avatar-upload/index.ts`

Replace the `verifyToken` function (lines 24-54) with the corrected 3-part JWT verification that handles URL-safe base64:

```ts
async function verifyToken(token: string, secret: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const sigStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBytes = Uint8Array.from(atob(sigStr), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC', key, sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    if (!isValid) return null;

    const decoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(decoded));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
```

---

## Summary

| File | Change |
|------|--------|
| `src/contexts/WalletContext.tsx` | Add `setCachedUser()` call in `updateUser` (1 line) |
| `supabase/functions/avatar-upload/index.ts` | Fix 3-part JWT verification (same fix as user-update) |

No new files, no new dependencies. Two targeted fixes.

