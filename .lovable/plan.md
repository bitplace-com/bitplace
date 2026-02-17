

# Fix: InvalidPixelList mostra messaggi errati per REINFORCE

## Problema
Il componente `InvalidPixelList` ha un messaggio fisso "can't be erased -- you don't own them" che viene mostrato per TUTTI i modi di gioco (REINFORCE, DEFEND, ATTACK, ERASE). Questo crea confusione perche':
1. Dice "erased" anche quando sei in modalita' Reinforce
2. Dice "you don't own them" anche quando i pixel sono semplicemente vuoti (non esistono nel DB)

## Causa
In `src/components/map/inspector/InvalidPixelList.tsx`, riga 43, il messaggio e' hardcoded senza tenere conto del `mode` corrente ne' del motivo (`reason`) reale dei pixel invalidi.

I 681 pixel segnalati come invalidi nel tuo caso sono pixel **vuoti** (non ancora dipinti da nessuno) che rientrano nella selezione rettangolare ma non contengono nessun disegno. Per REINFORCE, non puoi rinforzare pixel vuoti -- il che e' corretto come logica, ma il messaggio e' sbagliato.

## Soluzione

### 1. Aggiornare `InvalidPixelList` per accettare il `mode` corrente
- Passare la prop `mode: GameMode` al componente
- Generare un messaggio dinamico basato su mode + ragioni reali dei pixel invalidi

### 2. Messaggi specifici per modo
| Mode | Messaggio |
|------|-----------|
| ERASE | "X pixel(s) can't be erased" |
| REINFORCE | "X pixel(s) can't be reinforced" |
| DEFEND | "X pixel(s) can't be defended" |
| ATTACK | "X pixel(s) can't be attacked" |

### 3. Descrizione basata sulla ragione reale
Invece di dire sempre "you don't own them", il messaggio usera' la ragione dominante:
- `EMPTY_PIXEL` -> "they are empty"
- `NOT_OWNER` -> "you don't own them"
- `IS_OWNER` -> "they belong to you"
- `OPPOSITE_SIDE` -> "opposite contribution exists"
- Mix di ragioni -> solo il conteggio generico

## Dettagli tecnici

File da modificare:
- `src/components/map/inspector/InvalidPixelList.tsx` -- aggiungere prop `mode`, rendere il messaggio dinamico
- `src/components/map/inspector/InspectorPanel.tsx` -- passare `mode` a InvalidPixelList
- `src/components/map/MobileActionDock.tsx` -- se usa InvalidPixelList, passare `mode` anche li'

