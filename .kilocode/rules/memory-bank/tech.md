# Tech Stack

## Technologies Used

### Frontend Framework
- **React 19.1.1** - UI library with modern hooks and concurrent rendering
- **TypeScript 5.8.2** - Type-safe development with strict mode
- **Vite 6.2.0** - Fast build tool and dev server

### Styling
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Custom CSS** - Additional styles for specific components and animations

### State Management
- **React Hooks** - useState, useEffect, useCallback for local state management
- **LocalStorage API** - Browser storage for persistent data
- **SessionStorage API** - Browser storage for sensitive data (API keys)

### Internationalization
- **Intl.Segmenter** - Browser API for proper grapheme segmentation (complex scripts)
- **Custom i18n Hook** - useI18n hook for translation management
- **JSON Translation Files** - One JSON file per language in public/locales/

### AI Integration
- **OpenAI-Compatible API** - Flexible integration with multiple LLM providers
- **OpenRouter** - Default community provider (Google Gemini 2.5 Flash)
- **BYO LLM** - User-provided OpenAI-compatible endpoints

### PDF Generation
- **jsPDF 3.0.1** - PDF document generation
- **html2canvas 1.4.1** - HTML to canvas conversion for PDF export

### URL Compression
- **lz-string 1.5.0** - LZ-based compression for URL sharing

### Icons
- **lucide-react 0.417.0** - Icon library for UI elements

### Security
- **DOMPurify 3.1.6** - HTML sanitization for markdown rendering
- **marked 13.0.2** - Markdown parsing for help documentation

### Testing
- **Vitest 3.2.4** - Modern test runner with native ESM support
- **@testing-library/react 16.1.0** - Component testing utilities
- **@testing-library/user-event 14.5.2** - User interaction simulation
- **@testing-library/jest-dom 6.6.3** - Custom DOM matchers
- **jsdom 25.0.1** - DOM implementation for Node.js testing
- **@vitest/coverage-v8 3.2.4** - Code coverage reporting
- **Bruno API Collection** - API testing and validation suite
- **Integration Tests** - API integration tests with comprehensive coverage
### Deployment
- **Vercel** - Edge Functions and static hosting
- **@vercel/edge 1.1.2** - Edge Function runtime types

### CI/CD and Development Tools
- **GitHub Actions** - Automated CI/CD pipelines for testing and deployment
- **ESLint** - Code linting and quality checks
- **Bruno** - API testing and validation tool
- **standard-version 9.5.0** - Automated version management and changelog generation
### Development Tools
- **standard-version 9.5.0** - Automated version management and changelog generation

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation
```bash
npm install
```

### Running Development Server
```bash
npm run dev
```
Server runs on http://localhost:5173

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode with UI
npm run test:ui

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Type Checking
```bash
npm run type-check
```

## Technical Constraints

### Browser Compatibility
- Modern browsers with ES2022 support
- Intl.Segmenter support required for complex script languages (fallback provided)
- Touch events required for mobile interaction

### Storage Limitations
- LocalStorage has ~5-10MB limit per domain
- URL sharing limited to ~2000 characters (browser limit)
- LZ-String compression reduces URL size by ~50-70%

### API Constraints
- OpenAI-compatible API format required
- JSON response format required for AI responses
- CORS must be configured for cross-origin requests

### Performance Considerations
- Grid size limited to 20x20 for performance
- Word count limited to 30 per level
- Level count limited to 10 per game

## Dependencies

### Production Dependencies
```json
{
  "dompurify": "^3.1.6",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.1",
  "lucide-react": "^0.417.0",
  "lz-string": "^1.5.0",
  "marked": "^13.0.2",
  "react": "^19.1.1",
  "react-dom": "^19.1.1"
}
```

### Development Dependencies
```json
{
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.1.0",
  "@testing-library/user-event": "^14.5.2",
  "@types/dompurify": "^3.0.5",
  "@types/node": "^22.14.0",
  "@vercel/edge": "^1.1.2",
  "@vitest/coverage-v8": "^3.2.4",
  "@vitest/ui": "^3.2.4",
  "jsdom": "^25.0.1",
  "standard-version": "^9.5.0",
  "typescript": "~5.8.2",
  "vite": "^6.2.0",
  "vitest": "^3.2.4"
}
```

## Environment Variables

### Required
- `API_KEY` - OpenRouter API key for community provider

### Optional
- `COMMUNITY_MODEL_NAME` - Default model for community provider (default: google/gemini-2.5-flash:free)
- `LANGUAGE_MODEL_MAP` - JSON string mapping language codes to model configurations
- `USE_LLM_PROXY` - Enable/disable Vercel Edge Function proxy (default: false)
- `LLM_PROXY_URL` - Custom proxy URL (default: /api/llm-proxy)

## Build Configuration

### Vite Configuration (vite.config.ts)
- Path alias: `@/*` maps to project root
- Dev server: 0.0.0.0:5173
- Public directory: `public/`
- Test environment: jsdom with setup file

### TypeScript Configuration (tsconfig.json)
- Target: ES2022
- Module: ESNext
- JSX: react-jsx
- Module resolution: bundler
- Strict mode enabled

### Vercel Configuration (vercel.json)
- Framework: vite
- Edge Functions: /api/llm-proxy

## Tool Usage Patterns

### Vite
- Used for dev server with hot module replacement
- Production builds optimized with code splitting
- Environment variables injected via define()

### Vitest
- Tests run in jsdom environment
- Global test functions available (describe, it, expect)
- Coverage reports generated with @vitest/coverage-v8

### React Testing Library
- Component testing with user-centric approach
- fireEvent and userEvent for interaction simulation
- screen queries for element selection

### TypeScript
- Strict type checking enabled
- Interface-based type definitions
- Enum types for fixed value sets

## File Organization Patterns

### Component Files
- PascalCase naming (e.g., WordSearchGrid.tsx)
- Co-located with related subcomponents
- Props interfaces defined at top of file

### Service Files
- camelCase naming (e.g., geminiService.ts)
- Pure functions preferred
- Error handling with try/catch

### Utility Files
- camelCase naming (e.g., wordSearchGenerator.ts)
- Exported functions, no side effects
- JSDoc comments for documentation

### Type Definitions
- Centralized in types.ts
- Interfaces for data structures
- Enums for fixed value sets
