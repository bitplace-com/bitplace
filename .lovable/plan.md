

## Fix: Ottimizzazione Search panel per mobile

### Problema
Dallo screenshot, il pannello Search su mobile ha:
- Spaziatura eccessiva tra gli elementi (`space-y-4`)
- L'empty state con icona e testo occupa troppo spazio verticale (`py-6`, icona `h-8 w-8`)
- Il campo input ha un padding destro eccessivo (`pr-20`)
- Il contenuto generale potrebbe essere piu compatto

### Soluzione

**File: `src/components/modals/SearchModal.tsx`**

1. **Ridurre spaziatura generale**: `space-y-4` diventa `space-y-3` per compattare gli elementi su mobile

2. **Input field**: ridurre `pr-20` a `pr-10` - il bottone clear e piccolo (`h-7 px-2`) e non servono 80px di padding destro

3. **Empty state piu compatto**: ridurre `py-6` a `py-4`, icona da `h-8 w-8` a `h-6 w-6`, ridurre `mb-2` a `mb-1.5`

4. **Rows delle liste (pinned, results, recent)**: ridurre `p-2` a `p-1.5` e `gap-2` a `gap-1.5` per rendere le righe piu compatte su mobile

### Dettaglio tecnico

- **Riga 247**: `space-y-4` -> `space-y-3`
- **Riga 256**: `pr-20` -> `pr-10`
- **Riga 458**: `py-6` -> `py-4`
- **Riga 459**: `h-8 w-8` -> `h-6 w-6`, `mb-2` -> `mb-1.5`
- **Righe 309, 377, 429**: `gap-2 p-2` -> `gap-1.5 p-1.5` per le righe delle liste

### Rischio: Zero
Solo modifiche CSS di spaziatura.
