

# Fix Settings Save: Token Verification Mismatch

## Root Cause

The `user-update` edge function's `verifyToken()` is broken. It uses a 2-part token format (`payload.signature`), but `auth-verify` creates standard 3-part JWTs (`header.payload.signature`).

Specifically in `user-update/index.ts` line 28:
```ts
const [payloadB64, signatureB64] = token.split('.');
```

This destructures as `[header, payload]`, completely ignoring the actual signature. Then it tries to verify the header content as if it were the payload, and use the payload as the signature bytes. This always fails, returning "Invalid or expired token".

## Fix

**File: `supabase/functions/user-update/index.ts`** (lines 26-56)

Update `verifyToken` to handle the 3-part JWT format:

1. Split by `.` and extract `[headerB64, payloadB64, signatureB64]`
2. Verify HMAC signature against `headerB64.payloadB64` (the standard JWT signing input)
3. Decode `signatureB64` using URL-safe base64 (replace `-` with `+`, `_` with `/`)
4. Parse the payload from `payloadB64` (also URL-safe base64)

```ts
async function verifyToken(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const sigStr = signatureB64.replace(/-/g,'+').replace(/_/g,'/');
  const sigBytes = Uint8Array.from(atob(sigStr), c => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify(
    'HMAC', key, sigBytes,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );
  if (!isValid) return null;

  const decoded = payloadB64.replace(/-/g,'+').replace(/_/g,'/');
  const payload = JSON.parse(atob(decoded));
  if (payload.exp < Date.now()) return null;
  return payload;
}
```

No other files need changes. The SettingsModal UI and `useSettings` hook are working correctly after the previous `useMemo` fix. The only issue was the edge function rejecting every token.

