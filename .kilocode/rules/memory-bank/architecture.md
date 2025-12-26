# Architecture

## System Architecture

The application follows a single-page application (SPA) architecture with a component-based React design. All state is managed client-side with LocalStorage persistence.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   App.tsx    │──▶│   Views     │──▶│ Components   │   │
│  │              │  │              │  │              │   │
│  │ - State      │  │ - Maker     │  │ - Grid       │   │
│  │ - Routing    │  │ - Player    │  │ - Panels     │   │
│  │ - Theme      │  │ - Settings  │  │ - Forms      │   │
│  │ - History    │  │ - Help      │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                 │                 │              │
│         │                 ▼                 ▼              │
│         │  ┌──────────────────────────────────────┐      │
│         │  │         Services Layer              │      │
│         │  │ - geminiService.ts (AI)          │      │
│         │  │ - storageService.ts (Persistence)  │      │
│         │  └──────────────────────────────────────┘      │
│         │                 │                               │
│         │                 ▼                               │
│         │  ┌──────────────────────────────────────┐      │
│         │  │         Utils Layer                │      │
│         │  │ - wordSearchGenerator.ts          │      │
│         │  │ - formatters.ts                  │      │
│         │  └──────────────────────────────────────┘      │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────┐                  │
│  │     External APIs                   │                  │
│  │ - OpenAI-compatible LLM API         │                  │
│  │ - Vercel Edge Function Proxy        │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Source Code Paths

### Core Application Files
- `App.tsx` - Main application component with routing and state management
- `index.tsx` - React entry point
- `types.ts` - TypeScript type definitions and enums
- `constants.ts` - Application constants (colors, grid sizes)
- `prompts.ts` - AI prompt templates

### Views (Top-Level Pages)
- `views/MakerView.tsx` - Puzzle creation interface
- `views/PlayerView.tsx` - Puzzle playing interface
- `views/SettingsView.tsx` - Application settings
- `views/HelpView.tsx` - Help documentation
- `views/AILogView.tsx` - AI request/response logs

### Components (Reusable UI Elements)
- `components/WordSearchGrid.tsx` - Interactive puzzle grid
- `components/WordList.tsx` - Word list display
- `components/GameInfoPanel.tsx` - Game information overlay
- `components/StatusBar.tsx` - Timer and progress bar
- `components/Timer.tsx` - Countdown timer
- `components/HistoryPanel.tsx` - Game history viewer
- `components/AvailableGamesPanel.tsx` - Saved games list
- `components/LanguageSelector.tsx` - Language dropdown
- `components/BottomTabBar.tsx` - Navigation bar
- `components/Sidebar.tsx` - Desktop navigation sidebar
- `components/PrintWorksheet.tsx` - PDF export component
- `components/Icons.tsx` - Icon components (lucide-react)
- `components/AILog.tsx` - AI log display components
  - `AILogCard.tsx` - Individual log entry
  - `AILogDrawer.tsx` - Log drawer container
  - `AILogHeader.tsx` - Log header

### Services (External Integrations)
- `services/geminiService.ts` - AI API integration (OpenAI-compatible)
- `services/storageService.ts` - LocalStorage persistence

### Hooks (Custom React Hooks)
- `hooks/useI18n.tsx` - Internationalization hook

### Utils (Helper Functions)
- `utils/wordSearchGenerator.ts` - Puzzle generation algorithm
- `utils/formatters.ts` - Data formatting utilities

### API (Server-Side)
- `api/llm-proxy/index.ts` - Vercel Edge Function for LLM proxy

### Static Assets
- `public/locales/` - JSON translation files (7 languages)
- `public/docs/` - Markdown documentation (7 languages)

## Key Technical Decisions

### 1. Component Architecture
- **Views as Top-Level Components**: Each main page is a separate view component
- **Reusable Components**: UI elements are extracted into reusable components
- **Props-Driven**: Components receive data via props, with state managed at appropriate levels

### 2. State Management
- **React Hooks**: useState, useEffect, useCallback for local state
- **LocalStorage Persistence**: All persistent data stored in browser LocalStorage
- **SessionStorage**: Used for BYO LLM API keys (not persisted for security)
- **URL-Based State**: Game sharing via hash-based URL parameters

### 3. Internationalization
- **Custom i18n Hook**: useI18n hook provides t() function for translations
- **JSON Translation Files**: One JSON file per language in public/locales/
- **Browser Language Detection**: Falls back to English if translation unavailable
- **Grapheme Segmentation**: Intl.Segmenter for complex script languages

### 4. AI Integration
- **OpenAI-Compatible API**: Works with any provider supporting OpenAI format
- **Dual Provider Mode**: Community (OpenRouter) and BYO LLM options
- **Proxy Support**: Vercel Edge Function for secure API calls
- **Language-Specific Models**: LANGUAGE_MODEL_MAP for per-language model selection
- **AI Logging**: Detailed logs of all AI requests and responses

### 5. Puzzle Generation
- **8-Direction Placement**: Words placed horizontally, vertically, diagonally (forward/backward)
- **Collision Detection**: Prevents word overlap with different letters
- **Randomized Algorithm**: Shuffles directions and start positions for variety
- **Character Pool**: Fills empty cells with letters from word list
- **Grapheme-Aware**: Uses Intl.Segmenter for proper character handling

### 6. Testing
- **Vitest**: Modern test runner with jsdom environment
- **Component Testing**: @testing-library/react for UI components
- **Service Testing**: Direct testing of service functions
- **Coverage**: 129 passing tests with good branch/function coverage
- **Integration Testing**: API integration tests for LLM proxy functionality
- **API Testing**: Bruno API collection for comprehensive API validation
## Design Patterns

### 1. Container/Presentational Pattern
- Views act as containers managing state and business logic
- Components are presentational, receiving data via props

### 2. Custom Hooks Pattern
- useI18n encapsulates internationalization logic
- Reusable across components

### 3. Service Layer Pattern
- geminiService.ts handles all AI API interactions
- storageService.ts manages all LocalStorage operations

### 4. Utility Functions Pattern
- wordSearchGenerator.ts contains pure functions for puzzle generation
- formatters.ts contains pure functions for data formatting

## Critical Implementation Paths

### Puzzle Generation Flow
```
User enters theme → MakerView
    ↓
generateGameLevels() → geminiService
    ↓
OpenAI-compatible API → AI returns JSON
    ↓
sanitizeWords() → Clean and validate word lists
    ↓
generatePuzzle() → wordSearchGenerator
    ↓
Place words in 8 directions → Create grid
    ↓
Save to LocalStorage → availableGames
```

### Game Playing Flow
```
User selects game → PlayerView
    ↓
setupLevel() → generatePuzzle()
    ↓
Render WordSearchGrid with PlacedWords
    ↓
User drags across cells → handleMouseDown/Move/Up
    ↓
getLine() → Calculate selection path
    ↓
Check if selection matches word → onWordFound()
    ↓
Update PlacedWords.found → Re-render grid
    ↓
All words found → Level complete / Game won
```

### AI Request Flow
```
User triggers generation → MakerView
    ↓
generateGameLevels() → Check AI provider
    ↓
If Community: Use OpenRouter
If BYO LLM: Use user-provided settings
    ↓
Check USE_LLM_PROXY flag
    ↓
If true: Call /api/llm-proxy
If false: Direct API call
    ↓
Edge Function (if proxy) → Add headers → Call provider
    ↓
Parse response → sanitizeWords()
    ↓
Return Word[][] → Create GameDefinition
```

## Component Relationships

### App Component
- Manages view state (View enum)
- Manages global state (theme, AI settings, history, games)
- Provides context to child views

### MakerView
- Receives: onGameCreated callback, setLogs callback, aiSettings
- Generates puzzles via geminiService
- Creates GameDefinition objects
- Triggers onGameCreated callback

### PlayerView
- Receives: availableGames, history, onDeleteGame, onShareGame, onGameEnd
- Manages playing game state
- Delegates to GameBoard component during gameplay

### WordSearchGrid
- Receives: grid, words, onWordFound, showAnswers, placedWords, language
- Handles mouse/touch interactions
- Calculates selection lines
- Triggers onWordFound callback

### Services
- geminiService: Used by MakerView for AI generation
- storageService: Used by App for all persistence operations
