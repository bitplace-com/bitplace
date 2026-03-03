

# Fix ERASE virtual_pe_used refund + toast Google + focus ring sulla X

## 1. ERASE non rimborsa virtual_pe_used

**File: `supabase/functions/game-commit/index.ts`** (righe 295-316)

Prima di cancellare i pixel, recuperare la somma di `virtual_pe_cost`, poi dopo la cancellazione decrementare `virtual_pe_used`:

```typescript
if (mode === "ERASE") {
  const ownedPixels = pixelStates
    .filter(p => p.id && p.owner_user_id === userId);
  const ownedPixelIds = ownedPixels.map(p => p.id!);

  if (ownedPixelIds.length > 0) {
    // Fetch virtual_pe_cost before deleting
    const { data: virtualCosts } = await supabase
      .from("pixels")
      .select("virtual_pe_cost")
      .in("id", ownedPixelIds);

    const totalVirtualRefund = (virtualCosts || [])
      .reduce((sum: number, p: any) => sum + (p.virtual_pe_cost || 0), 0);

    await supabase.from("pixel_contributions").delete().in("pixel_id", ownedPixelIds);
    await supabase.from("pixels").delete().in("id", ownedPixelIds).eq("owner_user_id", userId);
    affectedPixels = ownedPixelIds.length;

    if (totalVirtualRefund > 0) {
      const currentUser = await supabase.from("users").select("virtual_pe_used").eq("id", userId).single();
      const currentUsed = currentUser.data?.virtual_pe_used || 0;
      await supabase.from("users")
        .update({ virtual_pe_used: Math.max(0, currentUsed - totalVirtualRefund) })
        .eq("id", userId);
    }
  }
}
```

Dopo il deploy, correggeremo il dato orfano dell'utente corrente con una query DB.

## 2. Toast Google sign-in con accredito 300,000 Pixel

**File: `src/contexts/WalletContext.tsx`** (righe 502-503)

Sostituire il toast singolo con due toast sequenziali:

```typescript
toast.success('Signed in with Google!');
setTimeout(() => {
  if (googleUser.auth_provider === 'both') {
    toast.success('Google linked!', { description: 'Wallet + Pixels active' });
  } else {
    toast.success('300,000 Pixels credited!', {
      description: 'Free pixels to draw anywhere. They expire after 72h but you can renew them.'
    });
  }
}, 800);
```

## 3. Rimuovere focus ring blu dalla X dell'alert 72h

**File: `src/components/modals/UserMenuPanel.tsx`** (riga 167)

Il `<button>` che chiude l'alert ha il focus ring di default del browser (il quadrato azzurro). Aggiungere `focus:outline-none` alla classe:

Da:
```
className="shrink-0 p-0.5 rounded hover:bg-amber-500/20 transition-colors"
```
A:
```
className="shrink-0 p-0.5 rounded hover:bg-amber-500/20 transition-colors focus:outline-none"
```

## File coinvolti

1. `supabase/functions/game-commit/index.ts` -- rimborso virtual_pe_used nel blocco ERASE
2. `src/contexts/WalletContext.tsx` -- toast sequenziali Google sign-in
3. `src/components/modals/UserMenuPanel.tsx` -- rimuovere focus ring dalla X

