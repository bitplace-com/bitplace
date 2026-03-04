

# Fix creator name + description display in PlaceCard

## Changes in `src/components/places/PlaceCard.tsx`

### 1. Creator name — remove truncation
Line 113: Remove `truncate` and `max-w-[40%]` so the full name is always shown. Use `shrink-0` to prevent it from being compressed.

### 2. Description — show 3 lines
Line 129: Change `line-clamp-1` to `line-clamp-3` so up to 3 lines of description are visible before the ellipsis appears.

| Line | Before | After |
|------|--------|-------|
| 113 | `truncate max-w-[40%]` | `shrink-0` |
| 129 | `line-clamp-1` | `line-clamp-3` |

