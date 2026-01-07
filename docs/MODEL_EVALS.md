# Model Evaluation System

This document describes the automated model evaluation system that ensures only capable models are available to users of the LLM WordSearch application.

## Overview

The model evaluation system:
1. Fetches all free models from OpenRouter
2. Tests each model's ability to generate valid word search puzzles
3. Filters to only models that pass evaluation criteria
4. Publishes the filtered list for use by the application

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub CI/CD                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│  │  Scheduled  │───▶│   Fetch      │───▶│   Evaluate Models   │ │
│  │  Trigger    │    │   Free Models│    │   (generate test)   │ │
│  └─────────────┘    └──────────────┘    └─────────────────────┘ │
│                                                           │      │
│                                                           ▼      │
│                                              ┌─────────────────────┤
│                                              │ Filter Passing      │
│                                              │ Models (score ≥50)  │
│                                              └─────────────────────┘ │
│                                                           │      │
│                                                           ▼      │
│                                              ┌─────────────────────┤
│                                              │ Output:             │
│                                              │ - summary.json      │
│                                              │ - passing-models.js │
│                                              │ - passing-model-ids │
│                                              └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel Deployment                            │
├─────────────────────────────────────────────────────────────────┤
│  CAPABLE_MODELS env var populated from eval results              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Runtime                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│  │   Frontend  │───▶│   LLM Proxy  │───▶│  OpenRouter API     │ │
│  │  requests   │    │   /models    │    │  (filtered list)    │ │
│  └─────────────┘    └──────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Running Evaluations Locally

To run the model evaluation script locally:

```bash
# Set your OpenRouter API key
export API_KEY="your-api-key-here"

# Run the evaluation
npm run eval:models

# Or with custom settings
export OUTPUT_DIR="./my-eval-results"
export MIN_SCORE="60"
npm run eval:models
```

### Output Files

The evaluation script generates several output files:

| File | Description |
|------|-------------|
| `summary.json` | Full evaluation results with all models |
| `passing-models.json` | List of passing models with IDs and names |
| `passing-model-ids.txt` | Newline-separated model IDs |
| `detailed-results.json` | Complete results including errors and scores |

## Evaluation Criteria

Models are evaluated on their ability to:

1. **Return valid JSON** (20 points) - Response must be parseable JSON
2. **Have correct structure** (20 points) - Must contain `levels` array
3. **Include level data** (10 points) - Each level must have `level` number and `words` array
4. **Format words correctly** (3 points per word) - Uppercase, no spaces, letters only
5. **Include hints** (2 points per hint) - Each word must have a hint

**Passing score: 50/100 points minimum**

### Test Prompt

The evaluation uses the same prompt structure as the actual application:

```json
{
  "theme": "animals",
  "language": "english",
  "levelCount": 2,
  "wordCount": 3
}
```

Expected response format:

```json
{
  "levels": [
    {
      "level": 1,
      "words": [
        { "word": "CAT", "hint": "A small domesticated carnivorous mammal." },
        { "word": "DOG", "hint": "Man's best friend, often kept as a pet." },
        { "word": "BIRD", "hint": "A warm-blooded egg-laying vertebrate." }
      ]
    },
    {
      "level": 2,
      "words": [
        { "word": "ELEPHANT", "hint": "The largest living land animal." },
        { "word": "GIRAFFE", "hint": "Tallest mammal with a long neck." },
        { "word": "DOLPHIN", "hint": "Highly intelligent marine mammal." }
      ]
    }
  ]
}
```

## CI/CD Integration

### Scheduled Workflow

The model evaluation workflow (`.github/workflows/model-evals.yml`) runs:

- **Weekly**: Every Monday at 00:00 UTC
- **On push**: After any push to the main branch
- **Manual**: Can be triggered via GitHub Actions UI

### Workflow Steps

1. **Evaluate Models**: Runs the evaluation script against all free OpenRouter models
2. **Upload Results**: Stores results as GitHub Actions artifacts (90-day retention)
3. **Create PR**: Automatically creates a PR with the updated model list (for scheduled/manual runs)
4. **Generate Config**: Creates a config artifact for deployment use

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | OpenRouter API key | Yes |
| `OUTPUT_DIR` | Directory for results | No (default: `./eval-results`) |
| `MIN_SCORE` | Minimum passing score | No (default: `50`) |

### Updating the Application

After evaluation completes:

1. Review the results in the Actions artifacts
2. If satisfied, merge the automated PR or manually update `CAPABLE_MODELS` in GitHub
3. The next deployment will use the updated model list

## Configuration

### Vercel Environment Variables

Set these in your Vercel project settings:

```
CAPABLE_MODELS=["model-1:free","model-2:free","model-3:free"]
```

### Local Development

For local development without the evaluation pipeline, the system will use a fallback list of known capable models defined in `api/llm-proxy/index.ts`.

## Adding New Models to Evaluation

To add a new model to be evaluated:

1. Ensure the model is available on OpenRouter with `:free` suffix
2. Wait for the next scheduled evaluation (or trigger manually)
3. If the model passes, it will automatically be included in the filtered list

## Troubleshooting

### No models passing evaluation

If all models fail evaluation:
1. Check the API key is valid
2. Review `detailed-results.json` for common failure patterns
3. Consider lowering `MIN_SCORE` threshold
4. Check if OpenRouter API is experiencing issues

### Models not appearing in the UI

If evaluated models don't appear in the settings:
1. Check `CAPABLE_MODELS` environment variable is set correctly
2. Verify the proxy endpoint is accessible: `/api/llm-proxy?models=capable`
3. Check browser console for errors

### Evaluation timeout

Some models may be slow to respond. You can:
- Increase the timeout in `scripts/model-evals/index.ts` (default: 30000ms)
- Reduce concurrent evaluations by lowering `maxConcurrent`
- Skip particularly slow models in the fetch filter

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/model-evals/openrouter.ts` | Fetch and filter OpenRouter models |
| `scripts/model-evals/evaluator.ts` | Model evaluation logic |
| `scripts/model-evals/index.ts` | Main evaluation script |
| `api/llm-proxy/index.ts` | Proxy with capable models endpoint |
| `views/SettingsView.tsx` | Frontend model selection |
| `.github/workflows/model-evals.yml` | CI/CD evaluation workflow |
| `config/capable-models.json` | Static capable models fallback |
