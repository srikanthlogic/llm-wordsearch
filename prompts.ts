

interface GameGenerationPromptParams {
  theme: string;
  wordCount: number;
  levelCount: number;
  language: string;
}

export const getOpenAIGameGenerationMessages = ({ theme, wordCount, levelCount, language }: GameGenerationPromptParams) => {
  return [
    {
      role: 'system',
      content: `You are an expert puzzle creator. You must generate lists of unique, single words for a word search puzzle. The words must not contain spaces or special characters and must be in all uppercase letters. For each word, you must provide a short, one-sentence hint. You must return the result as a single JSON object with a key "levels", which is an array of objects. Each object in the "levels" array represents a level and must have a "level" number and a "words" array. Each item in the "words" array must be an object with a "word" and a "hint". All words and hints must be in the language specified by the user.`
    },
    {
      role: 'user',
      content: `Create a word search puzzle definition with the theme "${theme}" in the language "${language}". The puzzle should have ${levelCount} level(s), with ${wordCount} words per level. Level 1 should contain common words related to the theme, and subsequent levels should contain progressively more obscure or difficult words.`
    }
  ];
};

interface CorpusProposalPromptParams {
  theme: string;
  locale: string;
  count: number;
}

// v2 reposition spec §4: vocabulary authoring asks the LLM for structured
// corpus entries (term + gloss + context shift + usage + related), not bare
// word lists. The grid-placeability rule mirrors services/corpusService.ts.
export const getCorpusProposalMessages = ({ theme, locale, count }: CorpusProposalPromptParams) => {
  return [
    {
      role: 'system',
      content: `You are an expert vocabulary curator. Propose contextual-vocabulary entries for a specific domain. For each entry provide:
- "term": a single grid-placeable word, 2 to 24 characters, letters only, no spaces, no hyphens, no apostrophes. For multi-word concepts, join them (e.g. "chainofthought") and put the spaced form in the gloss.
- "gloss": what the term means, one crisp sentence (max 200 chars).
- "context": how the term's meaning or emphasis shifts between settings (e.g. everyday vs technical use; different ecosystems) (max 300 chars).
- "usage": a realistic prompt fragment a person could paste to an AI assistant, using the term (max 200 chars).
- "related": 1 to 4 closely associated terms from this domain.
All text must be in the language specified by the user. Return ONLY a single JSON object of the exact shape {"entries":[{"term":"...","gloss":"...","context":"...","usage":"...","related":["..."]}]}.`
    },
    {
      role: 'user',
      content: `Domain: "${theme}". Language: "${locale}". Propose exactly ${count} entries, ordered from most essential to most specialized.`
    }
  ];
};
