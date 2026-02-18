

# Fix: Alliance name validation rejects underscores

## Problema

I log mostrano chiaramente l'errore:
```
Name validation failed: Name can only contain letters, numbers, and spaces (input: "Bitplace_Team")
```

La regex `/^[\p{L}\p{N} ]+$/u` permette solo lettere, numeri e spazi. Il carattere underscore `_` non e' incluso e viene rifiutato.

## Soluzione

Aggiornare la regex nella funzione `validateName` (riga 80) per accettare anche underscore, trattini e punti -- caratteri comuni nei nomi:

```
/^[\p{L}\p{N} _\-\.]+$/u
```

Aggiornare anche il messaggio di errore per riflettere i caratteri permessi.

## File modificato

| File | Modifica |
|------|----------|
| `supabase/functions/alliance-manage/index.ts` | Riga 80-81: aggiungere `_`, `-`, `.` alla regex e aggiornare messaggio errore |

## Dettaglio

Riga 80-81 attuale:
```ts
if (!/^[\p{L}\p{N} ]+$/u.test(trimmed)) {
  return { valid: false, error: "Name can only contain letters, numbers, and spaces" };
}
```

Diventa:
```ts
if (!/^[\p{L}\p{N} _\-.]+$/u.test(trimmed)) {
  return { valid: false, error: "Name can only contain letters, numbers, spaces, underscores, hyphens, and dots" };
}
```

