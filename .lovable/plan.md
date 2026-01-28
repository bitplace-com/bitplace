
# Fix: Validate Silent Failure + Speed Optimization

## Problems Identified

1. **Silent failure**: First validate for 500 pixels failed/timed out, returning to validate button without showing error
2. **Slow validation**: 3-5 second delay due to database cold start, not actual processing

## Root Cause Analysis

From edge function logs:
```
fetchUserMs: 3904ms  ← Database cold start (first query after idle)
fetchPixelsMs: 3904ms ← Ran in parallel, same cold start
computeMs: 1ms       ← Actual logic is instant
totalMs: 3913ms
```

The database needs 3-5 seconds to "wake up" from idle state. Once warm, validation completes in ~1 second.

---

## Solution Overview

### 1. Fix Silent Failure - Ensure Error Always Displays

**File: `src/hooks/useGameActions.ts`**

Add explicit error handling when validate returns unexpected null/undefined:

```typescript
// After line 393, add catch-all for unexpected response shapes:
if (!data || (data as any).ok === undefined) {
  setLastError({
    code: 'INVALID_RESPONSE',
    message: 'Server returned unexpected response. Please retry.',
    canRetry: true,
  });
  return null;
}
```

### 2. Pre-Warm Database When Entering Paint Mode

**File: `src/hooks/useEdgeFunctionWarmup.ts`**

Add a new trigger to warm up when user enters paint mode (before they click validate):

```typescript
// Export a manual warmup function
export function triggerWarmup() {
  // Send PING to game-validate to warm database connection
}
```

**File: `src/contexts/MapInteractionContext.tsx`**

Trigger warmup when entering PAINT mode:

```typescript
// When mode changes to PAINT, trigger database warmup
useEffect(() => {
  if (activeMode === 'PAINT') {
    triggerWarmup();
  }
}, [activeMode]);
```

### 3. Optimize Database Warm-up Query

**File: `supabase/functions/game-validate/index.ts`**

Current PING does a full user query. Optimize with simpler warm-up:

```typescript
// PING mode - simplify warm-up query
if (mode === "PING") {
  const t0Ping = Date.now();
  // Simple query to warm connection pool
  const { error } = await supabase.from("users").select("id").limit(1);
  const dbWarmMs = Date.now() - t0Ping;
  
  return new Response(JSON.stringify({ 
    ok: true, 
    warmed: true,
    dbWarmMs 
  }), { ... });
}
```

### 4. Add Retry with Warm-up for Cold Start Detection

**File: `src/hooks/useGameActions.ts`**

When validate times out, auto-send a PING and retry once:

```typescript
// If first attempt times out, the database was likely cold
// Send PING to warm it up, then retry
if (isTimeoutError(error) && attempt === 0) {
  console.log('[validate] Cold start detected, warming up...');
  await supabase.functions.invoke('game-validate', {
    body: { mode: 'PING' },
    headers,
  });
  // Retry will happen on next iteration
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useGameActions.ts` | Add catch-all error handling for unexpected responses |
| `src/hooks/useGameActions.ts` | Add auto-retry with warm-up on cold start timeout |
| `src/hooks/useEdgeFunctionWarmup.ts` | Export manual warmup trigger function |
| `src/contexts/MapInteractionContext.tsx` | Trigger warmup when entering PAINT mode |
| `supabase/functions/game-validate/index.ts` | Optimize PING warm-up query |

---

## Expected Results

After implementation:
1. **No more silent failures** - Every failed validate shows clear error message
2. **Faster validation** - Database pre-warmed when entering paint mode
3. **Better retry logic** - Cold start auto-detected and warmed before retry
4. **Target time**: First validate ~4s (warm-up), subsequent validates ~1-2s

---

## Test Plan

1. Clear browser cache, disconnect/reconnect wallet
2. Enter paint mode → verify PING sent in background
3. Draw 500 pixels → validate should complete in ~4s first time
4. Validate again → should complete in ~1-2s (already warm)
5. Wait 10+ minutes, validate again → should auto-retry after cold start
