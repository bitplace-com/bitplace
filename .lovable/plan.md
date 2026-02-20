

## Riorganizzazione Badge e Bandiera nel Player Profile

### Stato Attuale
Nella riga del nome utente sono presenti: nome, tag alleanza, AdminBadge, ProBadge e bandiera del paese, tutti inline sulla stessa riga.

### Cambiamento Richiesto
- **Riga 1 (inline col nome)**: Solo il tag alleanza `[TAG]` resta accanto al nome
- **Riga 2 (sotto il nome)**: AdminBadge, ProBadge, bandiera del paese — in una riga separata con `flex items-center gap-2`

### File da Modificare

**`src/components/modals/PlayerProfileModal.tsx`** (righe 228-244)

Spostare i badge e la bandiera dalla riga `flex-wrap` del nome a una nuova riga sotto:

```tsx
{/* Nome + Alliance tag */}
<div className="flex items-center gap-2 flex-wrap">
  <h3 className="font-semibold text-lg truncate">
    {profile.displayName || profile.walletShort || 'Unknown'}
  </h3>
  {profile.allianceTag && (
    <span className="text-sm text-primary font-medium">
      [{profile.allianceTag}]
    </span>
  )}
</div>

{/* Badges + Country flag (nuova riga sotto il nome) */}
{(isAdmin(profile.walletAddress || profile.walletShort) || getProTier(profile.peUsed) || country) && (
  <div className="flex items-center gap-2 mt-1">
    {isAdmin(profile.walletAddress || profile.walletShort) && <AdminBadge size="md" />}
    {(() => { const tier = getProTier(profile.peUsed); return tier ? <ProBadge tier={tier} size="md" /> : null; })()}
    {country && (
      <span className="text-lg" title={country.name}>
        {country.flag}
      </span>
    )}
  </div>
)}
```

Nessun altro file da modificare. La struttura dati e i componenti badge restano invariati.
