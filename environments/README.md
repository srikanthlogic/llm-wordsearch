# Environment Configuration

This directory contains environment configuration templates for different deployment stages of the LLM-Wordsearch application.

## Environment Files

- `.env.development` - Configuration for development environment
- `.env.staging` - Configuration for staging environment  
- `.env.production` - Configuration for production environment
- `.env.example` - Example configuration file (already exists in project root)

## Environment Variables

### Required Variables
- `API_KEY` - API key for the LLM provider (OpenRouter by default)
- `COMMUNITY_MODEL_NAME` - Default model name for community provider (default: `google/gemini-2.5-flash`)

### Optional Variables
- `LANGUAGE_MODEL_MAP` - JSON string mapping language codes to model configurations
- `USE_LLM_PROXY` - Enable/disable Vercel Edge Function proxy (default: `true`)
- `LLM_PROXY_URL` - Custom proxy URL (default: `/api/llm-proxy`)

### Example Configuration

#### Development (.env.development)
```
API_KEY=your_openrouter_api_key_here
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
USE_LLM_PROXY=false
LANGUAGE_MODEL_MAP={"en": {"model": "google/gemini-2.5-flash"}, "es": {"model": "google/gemini-2.5-flash"}}
```

#### Staging (.env.staging)
```
API_KEY=staging_openrouter_api_key
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
USE_LLM_PROXY=true
LLM_PROXY_URL=/api/llm-proxy
```

#### Production (.env.production)
```
API_KEY=production_openrouter_api_key
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
USE_LLM_PROXY=true
LLM_PROXY_URL=/api/llm-proxy
LANGUAGE_MODEL_MAP={"en": {"model": "google/gemini-2.5-flash"}, "es": {"model": "google/gemini-2.5-flash"}, "fr": {"model": "google/gemini-2.5-flash"}, "de": {"model": "google/gemini-2.5-flash"}, "hi": {"model": "google/gemini-2.5-flash"}, "bn": {"model": "google/gemini-2.5-flash"}, "ta": {"model": "google/gemini-2.5-flash"}}
```

## Vercel Environment Variables

When deploying to Vercel, set these variables in the Vercel dashboard:

### Production Environment
- `API_KEY` - Production API key
- `COMMUNITY_MODEL_NAME` - Production model name
- `LANGUAGE_MODEL_MAP` - Production language model mapping (optional)

### Preview Environment (Staging)
- `API_KEY` - Staging API key
- `COMMUNITY_MODEL_NAME` - Staging model name
- `LANGUAGE_MODEL_MAP` - Staging language model mapping (optional)

## CI/CD Environment Variables

The following secrets should be configured in GitHub Actions:

### Secrets
- `API_KEY` - API key for integration tests
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Variables
- `COMMUNITY_MODEL_NAME` - Default model name for deployments