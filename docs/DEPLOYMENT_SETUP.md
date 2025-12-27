# Deployment Setup Guide

## 🚀 Vercel Environment Variables Setup

The deployment failed because required environment variables are not configured in Vercel. Here's how to fix it:

### **Step 1: Set Up Vercel Environment Variables**

#### **Method A: Vercel Dashboard (Recommended)**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `llm-wordsearch`
3. **Navigate to**: Settings → Environment Variables
4. **Add these variables**:

| Variable Name | Value | Environment | Required |
|---------------|-------|-------------|----------|
| `API_KEY` | Your OpenRouter API key | Production, Preview, Development | ✅ Yes |
| `COMMUNITY_MODEL_NAME` | `google/gemini-2.5-flash` | Production, Preview, Development | ✅ Yes |
| `LANGUAGE_MODEL_MAP` | `{}` | Production, Preview, Development | ⚠️ Optional |
| `USE_LLM_PROXY` | `true` | Production, Preview, Development | ✅ Yes |

#### **Method B: Vercel CLI**

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add API_KEY production
vercel env add COMMUNITY_MODEL_NAME production
vercel env add LANGUAGE_MODEL_MAP production
vercel env add USE_LLM_PROXY production

# Repeat for preview and development environments
vercel env add API_KEY preview
vercel env add API_KEY development
# ... etc
```

### **Step 2: Get Your API Key**

#### **OpenRouter API Key** (Recommended)
1. Go to: https://openrouter.ai/
2. Sign up/Login
3. Go to: https://openrouter.ai/keys
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

#### **Alternative: OpenAI API Key**
1. Go to: https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)
4. Update `COMMUNITY_MODEL_NAME` to `gpt-3.5-turbo`

### **Step 3: Configure Model Settings**

#### **Basic Setup (Recommended)**
```
API_KEY=sk-or-v1-your-openrouter-key-here
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
LANGUAGE_MODEL_MAP={}
USE_LLM_PROXY=true
```

#### **Advanced Setup (Multi-language models)**
```
API_KEY=sk-or-v1-your-openrouter-key-here
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
LANGUAGE_MODEL_MAP={"spanish":{"model":"anthropic/claude-3-haiku","baseURL":"https://openrouter.ai/api/v1"},"french":{"model":"meta-llama/llama-3.1-8b-instruct","baseURL":"https://openrouter.ai/api/v1"}}
USE_LLM_PROXY=true
```

### **Step 4: Redeploy**

After setting up the environment variables:

#### **Option A: Automatic Redeploy**
- Push any commit to your main branch
- Vercel will automatically redeploy with the new environment variables

#### **Option B: Manual Redeploy**
```bash
# Using Vercel CLI
vercel --prod

# Or trigger redeploy in Vercel dashboard
# Go to Deployments → Click "Redeploy" on latest deployment
```

## 🔧 GitHub Actions Secrets Setup

For GitHub Actions workflows to work properly, you also need to set up repository secrets:

### **GitHub Repository Secrets**

1. **Go to your GitHub repository**
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Add these repository secrets**:

| Secret Name | Value | Used For |
|-------------|-------|----------|
| `API_KEY` | Your OpenRouter/OpenAI API key | CI/CD testing |
| `COMMUNITY_MODEL_NAME` | `google/gemini-2.5-flash` | CI/CD testing |
| `LANGUAGE_MODEL_MAP` | `{}` or your JSON config | CI/CD testing |
| `VERCEL_TOKEN` | Your Vercel token | Vercel deployment |
| `VERCEL_ORG_ID` | Your Vercel org ID | Vercel deployment |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Vercel deployment |

### **Getting Vercel Deployment Secrets**

#### **Vercel Token**
1. Go to: https://vercel.com/account/tokens
2. Create a new token
3. Copy the token

#### **Vercel Org ID and Project ID**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Get project info
vercel project ls
# Copy the Project ID from the output

# Get org info
vercel teams ls
# Copy your team/org ID
```

## 🧪 Testing the Setup

### **Test Locally**
```bash
# Create .env file for local testing
echo "API_KEY=your-api-key-here" > .env
echo "COMMUNITY_MODEL_NAME=google/gemini-2.5-flash" >> .env
echo "LANGUAGE_MODEL_MAP={}" >> .env
echo "USE_LLM_PROXY=true" >> .env

# Test the build
npm run build

# Test the API endpoint (if running locally)
npm run dev
# Visit: http://localhost:5173/api/llm-proxy (should show health check)
```

### **Test Vercel Deployment**
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs
```

## 🚨 Common Issues & Solutions

### **Issue**: "API_KEY not configured"
**Solution**: Ensure `API_KEY` is set in Vercel environment variables

### **Issue**: "Invalid API key"
**Solution**: 
- Check if API key is correct
- Ensure no extra spaces or characters
- Verify the API key is active and has credits

### **Issue**: "Model not found"
**Solution**: 
- Check if `COMMUNITY_MODEL_NAME` is a valid model
- For OpenRouter: Use format like `google/gemini-2.5-flash`
- For OpenAI: Use format like `gpt-3.5-turbo`

### **Issue**: "CORS errors"
**Solution**: The Edge Function handles CORS automatically, but ensure:
- `USE_LLM_PROXY=true` is set
- API calls go through `/api/llm-proxy` endpoint

## 📋 Checklist

- [ ] Set up Vercel environment variables
- [ ] Get API key from OpenRouter or OpenAI
- [ ] Configure GitHub repository secrets (for CI/CD)
- [ ] Test deployment locally
- [ ] Redeploy to Vercel
- [ ] Verify API endpoint works
- [ ] Test word search generation

## 🔗 Useful Links

- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **OpenRouter API**: https://openrouter.ai/docs
- **OpenAI API**: https://platform.openai.com/docs
- **GitHub Actions Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets