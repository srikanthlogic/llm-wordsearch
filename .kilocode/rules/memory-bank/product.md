# Product Description

## Why This Project Exists

LLM-Wordsearch exists to provide an educational and entertaining word search puzzle generator that leverages artificial intelligence. Traditional word search puzzles require manual curation of word lists, which is time-consuming and limited by the creator's knowledge. By using AI, this application can generate themed word search puzzles on any topic, with appropriate difficulty levels and multi-language support, making it a valuable tool for:

- Teachers creating educational materials
- Parents generating custom puzzles for children
- Language learners practicing vocabulary
- Anyone wanting themed puzzles for entertainment

## Problems It Solves

1. **Manual Word Curation**: Eliminates the need to manually find and categorize words for puzzles
2. **Limited Themes**: Users can generate puzzles on any topic by simply providing a theme
3. **Language Barriers**: Supports 7 languages (English, Spanish, French, German, Hindi, Bengali, Tamil) with proper character handling
4. **Distribution**: Easy sharing via compressed URLs and PDF export for offline use
5. **Difficulty Management**: Multiple levels with progressive difficulty and customizable time limits
6. **Complex Script Support**: Proper handling of languages with complex scripts (Hindi, Bengali, Tamil) using Intl.Segmenter

## How It Works

### User Flow - Puzzle Creation (Maker View)
1. User enters a theme (e.g., "Space Exploration")
2. Configures settings: number of levels, words per level, grid size, time per level, language
3. Clicks "Generate Puzzle"
4. AI generates word lists with hints for each level via OpenAI-compatible API
5. Puzzle is generated with intelligent word placement in the grid
6. User can share via URL or download as JSON

### User Flow - Playing (Player View)
1. User selects a puzzle from saved games or loads from shared URL
2. Game displays the grid and word list with hints
3. User drags across letters to select words (mouse or touch)
4. Found words are highlighted and crossed off the list
5. Timer tracks solving time
6. Upon completion, game is logged to history

### Technical Flow
- **AI Generation**: Uses OpenAI-compatible API (default: OpenRouter with Google Gemini 2.5 Flash)
- **Puzzle Generation**: Custom algorithm places words in 8 directions (horizontal, vertical, diagonal)
- **State Management**: LocalStorage for games, history, theme, language, and AI settings
- **Sharing**: LZ-String compression for URL-based sharing
- **PDF Export**: jsPDF + html2canvas for printable worksheets

## User Experience Goals

1. **Intuitive Interface**: Clean, modern UI with clear navigation and visual feedback
2. **Responsive Design**: Works seamlessly on desktop and mobile devices
3. **Accessibility**: Proper ARIA labels, keyboard navigation, and touch support
4. **Performance**: Fast puzzle generation and smooth grid interactions
5. **Customization**: Users can control grid size, difficulty, time limits, and language
6. **Privacy**: All data stored locally; BYO LLM option for users who want to use their own API keys
7. **Theme Support**: Light, dark, and system theme options
8. **Multi-Language**: Full UI and content translation for 7 languages

## Key Features

- **AI-Powered Generation**: Uses LLM to generate themed word lists with hints
- **Multi-Level Puzzles**: Support for progressive difficulty across levels
- **8-Direction Word Placement**: Words can be placed horizontally, vertically, and diagonally (forward and backward)
- **Complex Script Support**: Proper grapheme segmentation for Hindi, Bengali, and Tamil
- **PDF Export**: Generate printable worksheets with answer keys
- **URL Sharing**: Share puzzles via compressed URLs (up to ~2000 chars)
- **Local Storage**: Save games, history, and preferences locally
- **BYO LLM**: Users can bring their own OpenAI-compatible API provider
- **LLM Proxy**: Vercel Edge Function for secure, stateless API requests
- **AI Logging**: Detailed logs of AI requests and responses for debugging
