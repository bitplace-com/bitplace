

## Cleanup SOL -> BIT e Reset Mappa

Questo piano copre due macro-operazioni: (A) aggiornare tutti i testi UI residui che menzionano SOL o "test phase", e (B) resettare completamente la mappa e i dati di gioco.

---

### A. Aggiornamenti UI (6 file)

**1. StatusStrip.tsx** (barra in basso nella mappa)
- Riga 72: commento "SOL Balance" -> "BIT Balance"
- Riga 130: commento "SOL Balance" -> "BIT Balance"  
- Riga 134: testo hardcoded `SOL` -> usa `energy.nativeSymbol` (mostra "BIT" dinamicamente)
- Riga 250: tooltip `SOL price:` -> `$BIT price:`

**2. WalletSelectModal.tsx** (modale connessione wallet)
- Riga 106: rimuove "SOL temporarily powers PE"  -> "Connect your Phantom wallet to play Bitplace."
- Righe 173-180: rimuove intero blocco "Test phase" che menziona $SOL e "$BIT coming soon" (non e' piu' "coming soon", e' live)

**3. RulesModal.tsx** (regole di gioco)
- Righe 80-82: rimuove la riga italic "Test phase: PE is calculated from the $ value of $SOL in your wallet."

**4. ProfilePage.tsx** (scheda wallet personale)
- Riga 212: cambia `$${formatUsd(energy.usdPrice)}/SOL` -> `$${formatUsd(energy.usdPrice)}/$BIT`

**5. config/energy.ts** (configurazione tecnica)
- Rimuove il blocco `SOL` dalla config (non serve piu' come fallback)
- Semplifica il tipo a solo `'BIT'`

**6. Tipi TypeScript** (WalletContext, useEnergy, usePeBalance)
- Cambia tipo `'SOL' | 'BIT'` -> `'BIT'` in tutti e 3 i file per riflettere che SOL non e' piu' un'opzione

---

### B. Reset Mappa e Dati di Gioco

Dati attuali da cancellare:
- 2.913 pixel nella tabella `pixels`
- 63 eventi in `paint_events`
- 49 notifiche in `notifications`
- 5 utenti con `pe_used_pe` e `pixels_painted_total` da azzerare

Operazioni SQL (tramite lo strumento di inserimento dati):

1. **Elimina tutti i pixel**: `DELETE FROM pixels` (i trigger aggiorneranno automaticamente `pe_used_pe` degli utenti)
2. **Elimina contribuzioni**: `DELETE FROM pixel_contributions` (gia' vuota, ma per sicurezza)
3. **Elimina eventi paint**: `DELETE FROM paint_events`
4. **Elimina notifiche**: `DELETE FROM notifications`
5. **Azzera contatori utenti**: `UPDATE users SET pixels_painted_total = 0, pe_used_pe = 0, takeover_def_pe_total = 0, takeover_atk_pe_total = 0, xp = 0`

Nota importante: la cancellazione dei pixel attiverà i trigger `update_pe_used_on_pixel_change` che decrementano `pe_used_pe` automaticamente. L'UPDATE successivo azzera eventuali residui.

---

### Sequenza di esecuzione
1. Aggiornamenti UI (tutti i 6 file in parallelo)
2. Reset dati (5 query SQL in sequenza)
3. Verifica che la mappa sia pulita

