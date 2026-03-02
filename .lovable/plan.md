

# Fix copy login, tour info box e badge

## 1. Fix copy nel WalletSelectModal

**`src/components/modals/WalletSelectModal.tsx`**

### Google (Starter) - riga 123:
- Da: `"300,000 free Pixels to draw anywhere — renew them all with one click"`
- A: `"300,000 free Pixels to draw anywhere. They expire after 72h but you can renew them all with one click"`

### Phantom (Pro) - riga 145:
- Da: `"Your $BIT gives you Paint Energy — use it for permanent pixels no one can overwrite"`
- A: `"Your $BIT gives you Paint Energy (PE) — use it on pixels for permanent ownership unless someone uses more PE"`

### Phantom non installato (desktop) - riga 148:
- Da: `"Install to get permanent pixels"`
- A: `"Install to unlock Paint Energy"`

### Badge: tornare ai badge testo inline
- Rimuovere import di `StarterBadge` e `ProBadge`
- Rimettere badge come `<span>` inline con stile coerente tra i due:
  - STARTER: `text-[10px] font-bold tracking-wider text-slate-400 bg-slate-400/10 px-1.5 py-0.5 rounded`
  - PRO: `text-[10px] font-bold tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded`

## 2. Mostrare AccountTypesContent nel tooltip ancorato (desktop)

**`src/components/map/GuidedTour.tsx`**

Il tooltip ancorato (righe 270-305) mostra solo `currentStep.description` come testo. Per lo step `account-types` su desktop, il target e' `wallet-modal` (non centrato), quindi cade nel ramo anchored tooltip e mostra una stringa vuota.

### Fix:
Nel ramo anchored tooltip, aggiungere un check: se `currentStep.id === 'account-types'`, renderizzare `<AccountTypesContent />` al posto del paragrafo di testo. Questo mostra le stesse info dettagliate sia su desktop (tooltip di lato) che su mobile (dialog centrato).

Struttura aggiornata del tooltip ancorato (righe 282-285):
```
{isAccountTypes ? (
  <AccountTypesContent />
) : (
  <p ...>{currentStep.description}</p>
)}
```

Aggiungere la variabile `isAccountTypes` anche nel ramo anchored (e' gia' dichiarata a riga 185, prima del branch, quindi e' gia' disponibile).

## File coinvolti

1. `src/components/modals/WalletSelectModal.tsx` -- copy + badge inline
2. `src/components/map/GuidedTour.tsx` -- AccountTypesContent nel tooltip ancorato
