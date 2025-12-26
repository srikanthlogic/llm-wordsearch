# Developer Guide

This document provides instructions for setting up, running, and deploying the AI Word Search Generator application.

## 1. Project Overview

This is a single-page application (SPA) built with React and TypeScript. It uses a modern, build-less setup with ES modules and an `importmap` in `index.html` to manage dependencies. The application interacts with AI models via an OpenAI-compatible API to dynamically generate word search puzzles.

**Tech Stack:**
*   **Frontend:** React, TypeScript, Tailwind CSS
*   **Dependencies:** Loaded via CDN using `importmap` (e.g., `lucide-react`)
*   **AI:** Any OpenAI-compatible LLM. The default "Community Provider" uses OpenRouter.

---

## 2. Prerequisites

*   A modern web browser (Chrome, Firefox, Safari, Edge).
*   A code editor (e.g., VS Code).
*   A local web server to serve static files. You can use:
    *   **Node.js:** Install `http-server` globally: `npm install -g http-server`
    *   **Python 3:** Use the built-in server: `python3 -m http.server`
    *   VS Code extensions like "Live Server".

---

## 3. Local Development Setup

### Step 1: Get the Code

Ensure you have all the project files in a local directory.

### Step 2: Configure Environment Variables via `env.js`

The application requires an API key for the "Community Provider" (OpenRouter) feature. For local development, you can provide this and other optional configurations through a special `env.js` file.

1.  Create a new file in the root directory named `env.js`. You can rename the `env.sample` file.
2.  Add the content below to `env.js`. This file defines a `window.process` object, which mimics the Node.js `process.env` pattern in the browser.

    *Note: The `index.html` file is already configured to load this script. **Do not commit `env.js` to version control.** If you are using Git, add it to your `.gitignore` file.*

### Step 3: Run the Development Server

1.  Open your terminal or command prompt.
2.  Navigate to the root directory of the project.
3.  Start a local server. For example:
    *   If you have `http-server`: `http-server -c-1`
    *   If you have Python 3: `python3 -m http.server 8000`
4.  Open your browser and navigate to the local address provided by the server (e.g., `http://localhost:8080` or `http://localhost:8000`).

---

## 4. Environment Variables & Advanced Configuration

You can customize the application's behavior by setting environment variables. For local development, set them in `env.js`. For production, set them in your deployment provider's dashboard.

### `env.js` Example

```javascript
// env.js
window.process = {
  env: {
    // REQUIRED: Your API key from https://openrouter.ai/keys
    // This is used for the default "Community Provider".
    API_KEY: 'YOUR_OPENROUTER_API_KEY_HERE',

    // OPTIONAL: Override the default community model.
    // Must be a model available on OpenRouter.
    // Defaults to 'google/gemini-2.5-flash' if not set.
    // COMMUNITY_MODEL_NAME: 'anthropic/claude-3-haiku',

    // OPTIONAL: Provide language-specific model overrides for the BYO LLM provider.
    // This must be a valid JSON string.
    /*
    LANGUAGE_MODEL_MAP: JSON.stringify({
      "hi": { "model": "sarvam/open-hathi-hi-v0.1", "baseURL": "https://openrouter.ai/api/v1" },
      "ta": { "model": "sarvam/open-hathi-hi-v0.1" },
      "bn": { "model": "sarvam/open-hathi-hi-v0.1" }
    })
    */
  }
};
```

### Variable Details

*   `API_KEY` (Required): Your API key for **OpenRouter.ai**. This is necessary for the "Community Provider" feature to work. You can get a free key from their website.

*   `COMMUNITY_MODEL_NAME` (Optional): By default, the "Community Provider" uses OpenRouter to access `google/gemini-2.5-flash`. You can specify any other model available on OpenRouter by setting this variable.

*   `LANGUAGE_MODEL_MAP` (Optional): For advanced use cases, you can specify different models for different languages. This feature **only applies when the "Bring Your Own LLM" provider is active**. It works by overriding the `modelName` and `baseURL` you've set in the UI for a specific language. The value must be a JSON string that maps language codes to model configurations. This is useful for leveraging models that are fine-tuned for specific languages.

---

## 5. Project Structure

*   `index.html`: The main entry point. Sets up the application shell, styles, and the `importmap`.
*   `index.tsx`: The main React entry point that renders the `App` component.
*   `App.tsx`: The root component, managing views, state, and routing.
*   `/components`: Reusable React components used across different views.
*   `/views`: Top-level components that represent the main pages (Maker, Player, Settings, Help).
*   `/services`: Modules for handling external interactions like AI API calls (`geminiService.ts`) and browser storage (`storageService.ts`).
*   `/hooks`: Custom React hooks, like `useI18n.tsx` for internationalization.
*   `/utils`: Helper functions for tasks like puzzle generation and data formatting.
*   `/locales`: JSON files for UI translations, one for each supported language.
*   `/docs`: Markdown files for the "Help & Docs" section, organized by language.
*   `types.ts`: TypeScript interfaces and enums for the application's data structures.
*   `DEVELOP.md`: This developer guide.

---

## 6. Extending the Application

### Adding a New Language

1.  **Create a Translation File:** Add a new JSON file to the `/locales` directory (e.g., `pt.json` for Portuguese). Copy the content from `locales/en.json` and translate the values.
2.  **Update Language Selector:** Open `components/LanguageSelector.tsx` and add the new language to the `LANGUAGES` object.
3.  **Translate Documentation:** Create a new folder under `/docs` with the language code (e.g., `/docs/pt`). Copy the markdown files from `/docs/en` and translate their content.

### Adding a New Help Article

1.  **Create Markdown Files:** Create a new markdown file for your topic in English inside `/docs/en` (e.g., `docs/en/sharing.md`).
2.  **Translate the Article:** Add the translated versions to the corresponding language folders (e.g., `docs/es/sharing.md`).
3.  **Update Config:** In `views/HelpView.tsx`, add a new entry to the `DOC_PAGES_CONFIG` array for your new page.
4.  **Add Translations:** In each JSON file in `/locales`, add a translation key for the new topic title (e.g., `"help.topics.sharing": "Sharing & PDFs"`).

---

## 7. Deployment

Since this is a static web application, it can be deployed to any static hosting provider (Vercel, Netlify, GitHub Pages, etc.).

### Deployment Steps (General)

1.  **Push your code** to a Git repository.
2.  **Connect your repository** to your chosen hosting provider.
3.  **Configure the build settings.** Since there is no build step, these settings are usually minimal.
4.  **Set Environment Variables:** In your provider's dashboard, you **must** set the `API_KEY` environment variable with your OpenRouter key. You can also set the optional variables (`COMMUNITY_MODEL_NAME`, `LANGUAGE_MODEL_MAP`) here. Hosting platforms will make these available to your application securely.
