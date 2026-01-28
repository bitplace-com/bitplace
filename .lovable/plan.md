
# Fix: Paint "Failed to Fetch" Error + Performance Optimization

## Problems Identified

### 1. PING Warmup Has No Timeout (Critical)
**Location**: `src/hooks/useGameActions.ts` lines 198-206

The PING warmup fetch before retry has **no timeout**:
```typescript
await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
  method: 'POST',
  body: JSON.stringify({ mode: 'PING' }),
});
// No timeout! Can hang indefinitely
```

If database is in severe cold start state, this PING can hang forever, blocking the retry attempt.

### 2. "Failed to Fetch" Not Properly Detected
**Location**: `src/hooks/useGameActions.ts` lines 529-541

The error check `error instanceof FunctionsFetchError` only works for Supabase SDK errors, but we use raw `fetch()` which throws generic `TypeError: Failed to fetch`. This causes the error message to pass through as-is instead of showing a friendly "Network error" message.

### 3. Commit Takes 88 Seconds for 500 Pixels
From edge function logs:
```
17:11:51 - PAINT: upserting 500 pixels (batch=50, parallel=3)
17:11:54 - batch 1/10 completed
...
17:13:20 - batch 10/10 completed (88225ms total)
```

Each batch of 50 pixels takes 4-8 seconds because:
- Database triggers fire for each row
- `.select()` after upsert adds overhead
- Connection pool not efficiently reused between batches

---

## Solution

### Fix 1: Add Timeout to PING Warmup Fetch

**File**: `src/hooks/useGameActions.ts`

Add an AbortController with 10-second timeout for the PING warmup:

```typescript
// Lines 194-210: Add timeout to PING warmup
if (attempt > 0) {
  const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
  console.log(`[invokeWithRetry] Retry attempt ${attempt} after ${delay}ms - warming up first...`);
  
  // PING warmup with timeout to avoid hanging
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const pingController = new AbortController();
    const pingTimeout = setTimeout(() => pingController.abort(), 10000); // 10s max
    
    await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      signal: pingController.signal,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ mode: 'PING' }),
    });
    clearTimeout(pingTimeout);
    console.log(`[invokeWithRetry] PING warmup sent before retry`);
  } catch {
    // Ignore PING errors - it's just a warmup attempt
  }
  
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

### Fix 2: Improve Network Error Detection

**File**: `src/hooks/useGameActions.ts`

Add check for generic fetch errors (lines 529-541):

```typescript
if (error) {
  const errorMessage = error.message?.toLowerCase() || '';
  const isNetworkError = 
    error instanceof FunctionsFetchError ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection');
  const isTimeout = isTimeoutError(error);
  
  setLastError({
    code: isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK_ERROR' : 'COMMIT_FAILED',
    message: isTimeout 
      ? 'Request timed out. The server may be busy.'
      : isNetworkError 
        ? 'Network error. Please check your connection and retry.'
        : error.message || 'Commit failed',
    canRetry: true,
  });
  return null;
}
```

Apply same fix to validate error handling (lines 389-404).

### Fix 3: Optimize Commit Performance

**File**: `supabase/functions/game-commit/index.ts`

**Option A - Increase Batch Size** (simpler, good improvement):
```typescript
// Line 458-459: Increase batch size to reduce DB overhead
const UPSERT_BATCH_SIZE = 100;  // Was 50
const MAX_PARALLEL_BATCHES = 5;  // Was 3
```

This reduces from 10 batches to 5 batches, and processes 5 at a time instead of 3.

**Option B - Skip Select After Upsert** (more aggressive):
Skip the `.select()` after upsert when not needed for immediate UI update:

```typescript
// For PAINT, we can reconstruct changedPixels from input data
const { error: batchError } = await supabase
  .from("pixels")
  .upsert(batch, { onConflict: 'x,y', ignoreDuplicates: false });
  // Don't call .select() - saves ~50% time per batch
```

Then reconstruct `changedPixels` from the input data since we know exactly what was upserted.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useGameActions.ts` | Add 10s timeout to PING warmup fetch |
| `src/hooks/useGameActions.ts` | Improve network error detection for "Failed to fetch" |
| `supabase/functions/game-commit/index.ts` | Increase batch size from 50 to 100, parallel from 3 to 5 |
| `supabase/functions/game-commit/index.ts` | Remove `.select()` after upsert to speed up batches |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| PING hang risk | Infinite | 10s max |
| "Failed to fetch" handling | Shows raw error | Shows "Network error" message |
| Commit time (500 pixels) | ~88 seconds | ~30-40 seconds |
| Batch count | 10 batches | 5 batches |

---

## Test Plan

1. Disconnect wifi briefly during paint → should show "Network error. Please check your connection and retry."
2. Paint 500 pixels after cold start → commit should complete in ~30-40 seconds
3. If PING hangs → auto-timeout after 10 seconds, retry proceeds
4. Check console for improved timing logs

