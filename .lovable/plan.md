

# Riorganizzazione User Menu Panel e miglioramento Pixel Control Center

## 1. User Menu Panel — Statistiche divise per area

### Problema attuale
La griglia 2x2 delle statistiche (righe 276-356) mescola Pixel e PE senza separazione visiva. I dati sono "attaccati" tra loro.

### Soluzione
Sostituire la griglia unica con due sezioni separate, ciascuna con il proprio titolo:

```text
──────────────────────
 PIXELS OVERVIEW
  [Pixels Owned: 1,000]  [Pixel Balance: 297,024]
──────────────────────
 PE OVERVIEW
  [PE Balance: 663,700]  [PE Used: 11,761]  [PE Available: 651,939]
──────────────────────
```

- **Pixels Overview** (icona matita): "Pixels Owned" + "Pixel Balance" (solo se virtualPeTotal > 0)
- **PE Overview** (icona PE): "PE Balance" + "PE Used" + "PE Available" (solo se ha wallet, non isVirtualPe)
- Aggiungere spacing tra le due sezioni con un piccolo separatore o gap
- Ogni sezione ha un header `text-[10px] uppercase tracking-wider` coerente con il resto dell'UI

### File: `src/components/modals/UserMenuPanel.tsx`
- Righe 274-356: sostituire la griglia unica con due blocchi separati

## 2. Pixel Control Center — Sezione wallet migliorata

### Problema attuale
Quando l'utente non ha wallet collegato, la sezione PE mostra solo un breve testo generico (righe 248-254). Poco utile e poco chiaro.

### Soluzione
Sostituire il testo piatto con un pannello informativo strutturato:

```text
┌─────────────────────────────────────┐
│  What is Paint Energy?              │
│                                     │
│  PE lets you permanently claim      │
│  pixels and protect your artwork.   │
│                                     │
│  How it works:                      │
│  1 PE = $0.001 of $BIT value        │
│                                     │
│  With PE you can:                   │
│  - Paint permanent pixels           │
│  - Defend your artwork (DEF)        │
│  - Attack other pixels (ATK)        │
│                                     │
│  [Connect Wallet]                   │
└─────────────────────────────────────┘
```

- Titoletto "What is Paint Energy?" in bold
- Spiegazione chiara con bullet points delle azioni possibili
- Calcolo PE spiegato (1 PE = $0.001)
- Bottone "Connect Wallet" inline per azione immediata (chiama `linkWallet` dal context)

Stessa cosa per la sezione Pixel Balance quando l'utente non ha Google (righe 129-135): migliorare il testo con un pannello piu' strutturato che spiega cosa sono i Pixel e come ottenerli.

### File: `src/components/modals/PixelControlPanel.tsx`
- Righe 129-135: migliorare empty state Pixel Balance
- Righe 248-254: migliorare empty state PE con pannello informativo + bottone Connect Wallet

## File modificati

1. `src/components/modals/UserMenuPanel.tsx` — sezione statistiche riorganizzata in "Pixels Overview" e "PE Overview"
2. `src/components/modals/PixelControlPanel.tsx` — empty states PE e Pixel migliorati con spiegazioni e CTA

