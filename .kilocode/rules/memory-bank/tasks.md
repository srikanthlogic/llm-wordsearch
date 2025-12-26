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
