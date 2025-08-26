# LLM-Wordsearch

A modern, interactive word search puzzle generator powered by AI. Create custom word search puzzles with intelligent word placement, multiple difficulty levels, and export to PDF.

## Features

- 🤖 **AI-Powered Generation**: Use AI to intelligently place words in puzzles
- 🎯 **Multiple Difficulty Levels**: Choose from easy, medium, and hard difficulty settings
- 🌍 **Multi-Language Support**: Built-in support for English, Spanish, French, German, Hindi, Bengali, and Tamil
- 🎨 **Dark Mode**: Support for light, dark, and system themes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💾 **Local Storage**: Save your games and progress locally
- 🔗 **Share Games**: Generate shareable links for your puzzles
- 📄 **PDF Export**: Export puzzles as PDF worksheets for offline use
- ⏱️ **Timer**: Track your solving time with built-in timer
- 📚 **Help Documentation**: Comprehensive help documentation available

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Integration**: OpenAI-compatible API (supports OpenRouter, Gemini, and other providers)
- **Internationalization**: Custom i18n system with JSON translation files
- **PDF Generation**: jsPDF, html2canvas

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd llm-wordsearch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `env.sample` to `.env.local`
   - Add your API key (see Environment Variables section below)

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Environment Variables

The application requires an API key for AI functionality. Create a `.env.local` file in the root directory:

```env
# Required: Your API key for AI services
# For OpenRouter (recommended): Get your key from https://openrouter.ai/keys
API_KEY=your_openrouter_api_key_here

# Optional: Override default AI model
# COMMUNITY_MODEL_NAME=google/gemini-2.5-flash

# Optional: Language-specific model configurations (JSON string)
# LANGUAGE_MODEL_MAP={"en": {"model": "google/gemini-2.5-flash"}, "es": {"model": "anthropic/claude-3-haiku"}}
```

## Project Structure

```
├── src/
│   ├── components/          # Reusable React components
│   │   ├── AILog.tsx       # AI generation log display
│   │   ├── GameInfoPanel.tsx # Game information panel
│   │   ├── HistoryPanel.tsx # Game history viewer
│   │   ├── LanguageSelector.tsx # Language selection
│   │   ├── PrintWorksheet.tsx # PDF export functionality
│   │   ├── Sidebar.tsx     # Main navigation sidebar
│   │   ├── StatusBar.tsx   # Status bar with timer
│   │   ├── Timer.tsx       # Timer component
│   │   ├── WordList.tsx    # Word list display
│   │   └── WordSearchGrid.tsx # Interactive puzzle grid
│   ├── hooks/              # Custom React hooks
│   │   └── useI18n.tsx     # Internationalization hook
│   ├── services/           # External service integrations
│   │   ├── geminiService.ts # AI API service
│   │   └── storageService.ts # Local storage management
│   ├── utils/              # Utility functions
│   │   ├── formatters.ts   # Data formatting utilities
│   │   └── wordSearchGenerator.ts # Puzzle generation logic
│   ├── views/              # Main application views
│   │   ├── MakerView.tsx   # Puzzle creation interface
│   │   ├── PlayerView.tsx  # Puzzle playing interface
│   │   ├── HelpView.tsx    # Help documentation
│   │   └── SettingsView.tsx # Application settings
│   ├── App.tsx             # Main application component
│   ├── index.tsx           # React entry point
│   ├── types.ts            # TypeScript type definitions
│   └── constants.ts        # Application constants
├── public/
│   ├── docs/               # Help documentation by language
│   │   ├── en/             # English documentation
│   │   ├── es/             # Spanish documentation
│   │   ├── fr/             # French documentation
│   │   ├── de/             # German documentation
│   │   ├── hi/             # Hindi documentation
│   │   ├── bn/             # Bengali documentation
│   │   └── ta/             # Tamil documentation
│   └── locales/            # Translation files
│       ├── en.json         # English translations
│       ├── es.json         # Spanish translations
│       ├── fr.json         # French translations
│       ├── de.json         # German translations
│       ├── hi.json         # Hindi translations
│       ├── bn.json         # Bengali translations
│       └── ta.json         # Tamil translations
├── env.sample              # Environment variable template
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── README.md              # This file
```

## Usage

### Creating a Puzzle

1. Open the application in your browser
2. Navigate to the "Maker" view
3. Enter your words (comma-separated or one per line)
4. Select difficulty level and language
5. Click "Generate Puzzle" to create your word search
6. Save your puzzle or share it with others

### Playing a Puzzle

1. Navigate to the "Player" view
2. Select a puzzle from your saved games or load from a shared link
3. Click and drag to select words in the grid
4. Found words will be highlighted and crossed off the list
5. Use the timer to track your solving time

### Exporting to PDF

1. Create or load a puzzle
2. Click the "Print Worksheet" button
3. Choose between puzzle-only or puzzle-with-solution format
4. Download the PDF file

## Development

For detailed development instructions, see [DEVELOP.md](DEVELOP.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- AI integration powered by [OpenRouter](https://openrouter.ai/)
- PDF generation using [jsPDF](https://github.com/parallax/jsPDF) and [html2canvas](https://github.com/niklasvh/html2canvas)
