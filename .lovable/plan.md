

# Fix: Phantom wallet connect button stuck in loading state

## Problem

When clicking "Phantom Wallet" in the Sign In modal (without any prior account), the button shows a loading spinner indefinitely. Phantom never opens its popup and nothing happens.

## Root Cause

Two issues work together to cause this:

### 1. Session restore always tries Phantom reconnect (even with no stored session)

In `WalletContext.tsx` (line 984-996), the session restore `useEffect` runs on mount and unconditionally:
- Sets state to `CONNECTING` (shows loading spinner)
- Calls `attemptTrustedReconnect()` which calls `phantom.connect({ onlyIfTrusted: true })`

This happens even when there is NO stored token and NO stored wallet address -- meaning the user has never connected before. This causes a brief CONNECTING state on every fresh load.

### 2. No timeout on `phantom.connect()` calls

Neither `attemptTrustedReconnect()` nor the main `connect()` function have timeouts on the `phantom.connect()` call. If the Phantom extension is unresponsive, slow, or the popup is blocked, the promise hangs indefinitely and the state stays stuck at CONNECTING forever.

Additionally, if the trusted reconnect from session restore is still pending when the user clicks "Phantom Wallet," a second `phantom.connect()` call may conflict with the first, causing both to hang.

## Solution

### 1. Skip Phantom reconnect when no stored session

In the session restore effect, only attempt trusted reconnect if there IS a stored wallet address. If there's no stored wallet, go directly to DISCONNECTED without touching Phantom.

```text
Before (line 984):
  setWalletState('CONNECTING');
  const phantomWallet = await attemptTrustedReconnect();

After:
  // Only try Phantom reconnect if there was a previous wallet session
  if (!storedWallet) {
    setWalletState('DISCONNECTED');
    restoreInFlightRef.current = false;
    return;
  }
  setWalletState('CONNECTING');
  const phantomWallet = await attemptTrustedReconnect();
```

### 2. Add timeouts to Phantom connect calls

Add a 10-second timeout wrapper to both places where `phantom.connect()` is called:

**In `attemptTrustedReconnect` (line 780):**
```typescript
const response = await Promise.race([
  phantom.connect({ onlyIfTrusted: true }),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Phantom connect timeout')), 5000)
  ),
]);
```

**In `connect` function (line 1145):**
```typescript
const response = await Promise.race([
  phantom.connect({ onlyIfTrusted: false }),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Phantom connect timeout')), 10000)
  ),
]);
```

### 3. Ensure `connect()` always resets state on failure

In the `connect` function's catch block and the case where `performAuthentication` fails, make sure state is properly reset:

```typescript
if (!authSuccess) {
  // performAuthentication already sets AUTH_REQUIRED, 
  // but if state is somehow still CONNECTING, reset it
  if (walletStateRef.current === 'CONNECTING') {
    setWalletState('AUTH_REQUIRED');
  }
}
```

## Files to Modify

- `src/contexts/WalletContext.tsx` -- All 3 fixes in one file

## Impact

- Fresh users will see "Sign In" button immediately (no brief loading flash)
- Phantom connect calls will timeout after 5-10 seconds instead of hanging forever
- If Phantom is unresponsive, users get a clear error message and can retry
- Existing wallet/Google session restore is unaffected (only skips Phantom reconnect when no stored wallet)

