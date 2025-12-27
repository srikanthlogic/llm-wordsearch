# Tasks

This file documents repetitive tasks and their workflows for future reference.

## Add New Language Support

**Last performed:** N/A

**Files to modify:**
- `public/locales/[lang-code].json` - Create new translation file
- `components/LanguageSelector.tsx` - Add language to LANGUAGES object
- `public/docs/[lang-code]/` - Create translated documentation folder

**Steps:**
1. Create new JSON translation file in `public/locales/` (e.g., `pt.json` for Portuguese)
2. Copy content from `en.json` and translate all values
3. Add language entry to `LANGUAGES` object in LanguageSelector.tsx
4. Create new documentation folder in `public/docs/[lang-code]/`
5. Copy and translate all markdown files from `public/docs/en/`

**Important notes:**
- Ensure all translation keys from en.json are present in new language file
- Test UI displays correctly with new language
- Verify complex script handling if needed (for languages like Hindi, Bengali, Tamil)

## Add New AI Model Support

**Last performed:** N/A

**Files to modify:**
- `README.md` - Update documentation with new model
- `.env.example` - Update example configuration
- `DEVELOP.md` - Update developer guide

**Steps:**
1. Verify model is available on OpenRouter or compatible provider
2. Update default model in documentation if changing community default
3. Add model to README.md supported models list
4. Update DEVELOP.md with model-specific notes if needed

**Important notes:**
- Model must be OpenAI-compatible API format
- Test with actual API calls before committing
- Consider token limits and pricing

## Add New Help Article

**Last performed:** N/A

**Files to modify:**
- `public/docs/en/[article].md` - Create English article
- `public/docs/[lang-code]/[article].md` - Create translated versions
- `views/HelpView.tsx` - Add to DOC_PAGES_CONFIG
- `public/locales/[lang].json` - Add translation keys

**Steps:**
1. Create markdown file in `public/docs/en/` with article content
2. Add article configuration to `DOC_PAGES_CONFIG` in HelpView.tsx
3. Add translation keys for article title to all locale JSON files
4. Create translated versions in other language doc folders

**Important notes:**
- Use consistent markdown formatting
- Include code examples where appropriate
- Test article renders correctly in HelpView

## Update AI Prompt Templates

**Last performed:** N/A

**Files to modify:**
- `prompts.ts` - Update prompt templates

**Steps:**
1. Review existing prompt structure in `prompts.ts`
2. Modify system message or user message as needed
3. Test with actual AI generation to verify output format
4. Update documentation if prompt behavior changes significantly

**Important notes:**
- Maintain JSON response format requirement
- Keep language parameter for multi-language support
- Test with multiple languages after changes

## Manage Bruno API Collection

**Last performed:** N/A

**Files to modify:**
- `bruno/` - Bruno collection directory
- `bruno/send_prompt.bru` - Main API request file
- `bruno/README.md` - Documentation
- `scripts/run-bruno-tests.js` - Test runner script
- `environments/.env.example` - Environment configuration

**Steps:**
1. Update API request configurations in `.bru` files with proper authentication headers
2. Add environment variables for different deployment stages (dev, staging, prod)
3. Implement timeout and retry logic in test configurations
4. Update documentation in `bruno/README.md` with new endpoints and usage
5. Test with `scripts/run-bruno-tests.js` to ensure all requests pass
6. Update environment templates in `environments/.env.example`

**Important notes:**
- Ensure all API endpoints are properly documented
- Use consistent naming conventions for environment variables
- Test both success and error scenarios
- Keep sensitive information out of the repository

## Manage CI/CD Pipeline

**Last performed:** N/A

**Files to modify:**
- `.github/workflows/ci.yml` - Main CI workflow
- `.github/workflows/release.yml` - Release workflow
- `.eslintrc.json` - ESLint configuration
- `docs/ci-cd-setup.md` - CI/CD documentation
- `scripts/verify-setup.js` - Setup verification script

**Steps:**
1. Update GitHub Actions workflows with latest security practices
2. Configure automated testing with integration test validation
3. Set up linting checks with ESLint
4. Implement versioning and deployment automation
5. Add security audits and quality gates
6. Update documentation in `docs/ci-cd-setup.md`
7. Test setup verification script to ensure all dependencies are properly configured

**Important notes:**
- Always test workflows in a development branch first
- Keep security tokens secure using GitHub Secrets
- Ensure all tests pass before merging to main branch
- Maintain comprehensive logging for debugging CI failures
