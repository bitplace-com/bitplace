
## Fix: Wallet Linking "Already in Use" + Account Merging

### Root Cause

The wallet `4J2kvqRR...` belongs to user **Bitplace_Team** (wallet-only, id `76f4ab9b`), while the Google login created a separate user **Fabio Capodagli** (google-only, id `cffbb852`). When trying to link the wallet to the Google account, `auth-verify` returns HTTP 409 "Wallet already in use by another account".

Two bugs:
1. **Error message lost**: `supabase.functions.invoke` puts non-2xx response bodies in the `error` field, not `data`. Line 721 checks `authData?.error` but `authData` is null for 409 responses -- so the fallback "Server could not verify your signature" shows instead of the real error.
2. **No account merging**: When the wallet-only user is the same person as the Google user, the backend should **merge** the accounts instead of blocking.

### Fix 1: Surface correct error message in `linkWallet`
**File:** `src/contexts/WalletContext.tsx` (lines 720-724)

Parse the error from `supabase.functions.invoke` properly. When `authError` is set, extract the message from it (it may be a `FunctionsHttpError` with a JSON body).

### Fix 2: Account merging in `auth-verify`
**File:** `supabase/functions/auth-verify/index.ts` (lines 178-191)

When the wallet is already used by another user AND that user is wallet-only (`auth_provider = 'wallet'`), merge the two accounts:
1. Transfer all pixels from the wallet-only user to the Google user
2. Transfer all pixel_contributions
3. Transfer notifications, user_follows, user_pins, places
4. Copy stats (pixels_painted_total, pe_used_pe, takeover totals) to the Google user
5. Set wallet_address and auth_provider='both' on the Google user
6. Delete the old wallet-only user record
7. Return the merged user with a new token

If the wallet user is NOT wallet-only (already 'both' or 'google'), reject with a clear error.

### Fix 3: Correct error parsing in `linkWallet` 
**File:** `src/contexts/WalletContext.tsx` (lines 720-724)

```
if (authError) {
  let errMsg = 'Server could not verify your signature';
  try {
    if (authError instanceof Response) {
      const body = await authError.json();
      errMsg = body?.error || errMsg;
    } else if (typeof authError === 'object' && authError.message) {
      errMsg = authError.message;
    }
  } catch {}
  toast.error('Wallet linking failed', { description: errMsg });
  setWalletState('AUTHENTICATED');
  return;
}
```

### Files to modify

| File | Changes |
|------|---------|
| `supabase/functions/auth-verify/index.ts` | Replace "reject if wallet in use" with account merge logic |
| `src/contexts/WalletContext.tsx` | Fix error message extraction from `supabase.functions.invoke` response |

### Account merge logic (auth-verify)

When `existingWalletUser.id !== linkPayload.userId`:

```text
1. Fetch existing wallet user to check auth_provider
2. If auth_provider != 'wallet' -> reject (409, "Wallet linked to another multi-auth account")
3. Transfer ownership:
   - UPDATE pixels SET owner_user_id = googleUserId WHERE owner_user_id = walletUserId
   - UPDATE pixel_contributions SET user_id = googleUserId WHERE user_id = walletUserId
   - UPDATE notifications SET user_id = googleUserId WHERE user_id = walletUserId
   - UPDATE user_follows SET follower_id/following_id accordingly
   - UPDATE user_pins SET user_id = googleUserId WHERE user_id = walletUserId
   - UPDATE places SET owner_user_id = googleUserId WHERE owner_user_id = walletUserId
4. Merge stats on Google user:
   - pixels_painted_total += walletUser.pixels_painted_total
   - pe_used_pe += walletUser.pe_used_pe
   - takeover_def_pe_total += walletUser.takeover_def_pe_total
   - takeover_atk_pe_total += walletUser.takeover_atk_pe_total
5. Set wallet_address, auth_provider='both', virtual_pe_total=300000 on Google user
6. DELETE wallet-only user
7. Return merged user + new JWT
```

This ensures the user's pixel history and PE stakes are preserved when merging their wallet account into their Google account.
