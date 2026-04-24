# Utils Knowledge Base

**Scope:** `./utils/`

## OVERVIEW
Core puzzle generation logic. No React dependencies.

## FILES

```
utils/
├── wordSearchGenerator.ts  # Puzzle grid generation
└── formatters.ts         # Data formatting
```

## wordSearchGenerator.ts

Grid generation with 8 directional placements:
- Horizontal (→, ←)
- Vertical (↓, ↑)
- Diagonal (4 directions)

**Unicode Support:** Uses `Intl.Segmenter` for grapheme-aware placement (multilingual).

**Key Functions:**
- `generatePuzzle(words, size, language)` - main generator
- `canPlaceWord()` - collision detection
- `placeWord()` - grid mutation

## CONVENTIONS

- Pure functions (except grid mutation)
- No external dependencies
- Intl.Segmenter with fallback to Array.from()
