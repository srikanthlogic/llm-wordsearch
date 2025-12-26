
# Settings & Advanced Topics

This page contains app-wide settings and information.

## AI Provider
You can choose between two modes for generating puzzles:
- **Community Provider:** Uses the app's built-in access to Google's Gemini model. No setup is required. This option is a great way to get started quickly.
- **Bring Your Own LLM (BYO LLM):** Allows you to connect to any OpenAI-compatible Large Language Model service (like OpenRouter, Together.ai, or Fireworks.ai). You'll need to provide your own API Key, the service's Base URL, and the specific Model Name you want to use.
    - **API Key:** Your personal key for the LLM service.
    - **Base URL:** The entry point for the service's API. For example, for OpenRouter, this is `https://openrouter.ai/api/v1`.
    - **Model Name:** The specific model you want to use, e.g., `google/gemini-pro`.

    Use the "Test Connection" button to verify your settings are correct before generating a game. Your API key is stored securely in your browser's session and is cleared when you close the tab.

### Language-Specific Models
For advanced users, it's possible to specify different models for different languages. This can be useful if you find that a particular model is better at generating puzzles in a specific language. This setting is configured using the `LANGUAGE_MODEL_MAP` environment variable in your `.env.local` file.

Example:
```
LANGUAGE_MODEL_MAP={"es": {"model": "anthropic/claude-3-haiku"}}
```
This would use the Claude 3 Haiku model for Spanish, while other languages would use the default community model.

## Appearance
Choose between light mode, dark mode, or have the app sync with your system's theme.

## AI Log
See the exact prompts sent to the AI and the raw data it returned during game creation. This is useful for debugging or curiosity.

## Data Management
Use the "Clear Application Data" button to permanently delete all your saved games and play history.