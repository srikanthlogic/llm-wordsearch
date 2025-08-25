

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
