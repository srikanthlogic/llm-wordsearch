# LLM-Wordsearch

A modern, interactive word search puzzle generator powered by AI. Create custom word search puzzles with intelligent word placement, multiple difficulty levels, and export to PDF.

[![CI](https://github.com/srikanthlogic/llm-wordsearch/actions/workflows/ci.yml/badge.svg)](https://github.com/srikanthlogic/llm-wordsearch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)

## Features

- 🤖 **AI-Powered Generation**: Use AI to intelligently place words in puzzles

## 🚀 Live Demo

Try it now: **[llm-wordsearch.vercel.app](https://llm-wordsearch.vercel.app)**
- 🎯 **Multiple Difficulty Levels**: Choose from easy, medium, and hard difficulty settings
- 🌍 **Multi-Language Support**: Built-in support for English, Spanish, French, German, Hindi, Bengali, and Tamil
- 🎨 **Dark Mode**: Support for light, dark, and system themes (now fully functional).
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💾 **Local Storage**: Save your games and progress locally
- 🔗 **Share Games**: Generate shareable links for your puzzles
- 📄 **PDF Export**: Export puzzles as PDF worksheets for offline use
- ⏱️ **Timer**: Track your solving time with built-in timer
- 📚 **Help Documentation**: Comprehensive help documentation available

## 📸 Screenshots

### Puzzle Maker
Create custom word search puzzles with AI-powered generation

### Puzzle Player
Interactive puzzle solving with timer and word list

### PDF Export
Export puzzles as printable worksheets

## Sharing Games

The application allows you to share games with others by generating a unique URL. This URL contains the entire game definition, compressed to save space.

**URL Character Length:**
The length of the shared URL is not fixed. It depends on the complexity of the game you've created, including:
- The number of words
- The length of the words and their hints
- The number of levels in the game

While there is no hardcoded limit in the application, most web browsers impose a practical limit on the length of URLs, typically around 2000 characters. For very large and complex games, it's possible to exceed this limit, which would prevent the game from being shared.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Integration**: OpenAI-compatible API (supports OpenRouter, Gemini, and other providers)
- **Proxy**: Vercel Edge Functions for stateless LLM requests
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

## ⚡ Quick Start

1. Visit [llm-wordsearch.vercel.app](https://llm-wordsearch.vercel.app)
2. Click "Maker" to create a puzzle
3. Enter your words and select difficulty
4. Generate and share your puzzle!

## Testing

The project includes comprehensive unit tests using Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**
- **Tests**: 60 passed
- **Statements**: 11.3%
- **Branches**: 78.68%
- **Functions**: 80.55%
- **Lines**: 11.3%

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

# LLM Proxy Configuration
# Set to "true" to use the Vercel Edge Function proxy, "false" for direct API calls
# USE_LLM_PROXY=true

# Custom proxy URL (optional, defaults to /api/llm-proxy)
# LLM_PROXY_URL=/api/llm-proxy
```

## Vercel Deployment

The application includes a Vercel Edge Function proxy for LLM requests, providing a stateless and scalable solution for AI integration.

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. API key for your preferred LLM provider
3. GitHub repository connected to Vercel

### Deployment Steps

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Configure the project settings

2. **Environment Variables**
   - Set the following environment variables in Vercel dashboard:
     ```
     API_KEY=your_openrouter_api_key_here
     COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
     LANGUAGE_MODEL_MAP={}
     USE_LLM_PROXY=true
     ```

3. **Deploy**
   - Vercel will automatically detect the `vercel.json` configuration
   - The Edge Function will be deployed automatically
   - Both the frontend and API will be deployed together

### Features of the Vercel Deployment

- **Edge Functions**: Low-latency LLM requests with global distribution
- **Stateless Architecture**: No server-side state management required
- **Automatic Scaling**: Handles traffic spikes automatically
- **CORS Support**: Properly configured for cross-origin requests
- **Error Handling**: Comprehensive error handling and logging
- **Environment Configuration**: Supports environment-specific model configurations
- **OpenRouter Integration**: Optimized for OpenRouter with provider-specific headers
- **Multi-Provider Support**: Supports OpenRouter, OpenAI, and custom providers
- **Enhanced Logging**: Detailed request/response logging with provider information
- **Response Headers**: Passes through OpenRouter-specific headers for monitoring

### Local Development with Proxy

To test the proxy locally:

1. Set `USE_LLM_PROXY=true` in your `.env.local` file
2. The proxy will be available at `/api/llm-proxy`
3. All LLM requests will be routed through the proxy

### OpenRouter Integration

The proxy is specifically optimized for OpenRouter with the following features:

#### **Provider-Specific Headers**
- `HTTP-Referer`: Identifies the application to OpenRouter
- `X-Title`: Provides application context
- `X-Api-Key`: Additional authentication layer
- `Accept`: Ensures proper response format

#### **Auto-Detection**
The proxy automatically detects the provider based on the model name:
- **OpenRouter**: Models containing `google/`, `anthropic/`, `meta/`, `mistral/`, `cohere/`, `deepseek/`, `qwen/`
- **OpenAI**: Models containing `openai/` or `gpt-`
- **Custom**: All other models use the configured base URL

#### **Supported OpenRouter Models**
- `google/gemini-2.5-flash` (default)
- `anthropic/claude-3-haiku`
- `meta-llama/llama-3.1-8b-instruct`
- `openai/gpt-3.5-turbo`
- `openai/gpt-4`
- And many more OpenRouter-compatible models

#### **Response Headers**
The proxy forwards OpenRouter-specific response headers for monitoring:
- `X-Request-ID`: Request identifier for tracking
- `OpenAI-Processing-MS`: Processing time information

### CI/CD Integration

The project includes GitHub Actions workflows for:
- **CI Testing**: Automated testing and validation
- **Vercel Deployment**: Automatic deployment to Vercel on main branch pushes
- **GitHub Pages Deployment**: Fallback deployment option
- **Release Management**: Automated versioning and releases

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
├── api/                    # Vercel Edge Functions
│   └── llm-proxy/          # LLM request proxy
│       └── index.ts        # Edge Function implementation
├── env.sample              # Environment variable template
├── .env.example            # Environment variable example
├── vercel.json             # Vercel deployment configuration
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
- Edge Functions powered by [Vercel](https://vercel.com/)
- PDF generation using [jsPDF](https://github.com/parallax/jsPDF) and [html2canvas](https://github.com/niklasvh/html2canvas)
